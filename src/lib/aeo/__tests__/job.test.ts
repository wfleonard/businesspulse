/** @jest-environment node */
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs'
import os from 'os'
import path from 'path'
import {
  buildJob,
  PanelAbortedError,
  PanelExitError,
  PanelTimeoutError,
  parsePanelResult,
  runPanelJob,
} from '../job'

const validResult = {
  version: 1,
  client: { name: 'East Coast Utility, LLC', domain: 'eastcoastutility.com' },
  started_at: '2026-09-15T12:00:00+00:00',
  finished_at: '2026-09-15T12:00:09+00:00',
  totals: { questions: 1, answers: 1, errors: 0, cited_questions: 0, named_questions: 0, cost_usd: 0.0054 },
  engines: [{ engine: 'perplexity', model: 'sonar', answers: 1, errors: 0, cited: 0, cost_usd: 0.0054 }],
  results: [
    {
      engine: 'perplexity',
      model: 'sonar',
      query: 'NJDOT road opening permit for utility work',
      category: 'permits',
      answer: 'An NJDOT permit is required...',
      sources: [{ url: 'https://www.nj.gov/transportation/', title: '', cited: true }],
      input_tokens: 12,
      output_tokens: 340,
      searches: 1,
      cost_usd: 0.0054,
      error: null,
      own_cited: false,
      own_rank: null,
      name_mentioned: false,
      directory_only: false,
      rivals: [{ host: 'boringcontractors.com', title: 'Boring Contractors', cited: true }],
    },
  ],
}

describe('buildJob', () => {
  it('maps a plan onto the PHP job contract', () => {
    const job = buildJob(
      {
        businessName: 'East Coast Utility, LLC',
        domain: 'eastcoastutility.com',
        directoryDomains: ['yelp.com'],
        referenceDomains: ['nj.gov'],
        questions: [{ c: 'cost', q: 'HDD cost per foot' }],
        panelVersion: 1,
      },
      ['perplexity'],
      3
    )
    expect(job).toEqual({
      client: {
        name: 'East Coast Utility, LLC',
        domain: 'eastcoastutility.com',
        aliases: [],
        directory_domains: ['yelp.com'],
        reference_domains: ['nj.gov'],
      },
      questions: [{ c: 'cost', q: 'HDD cost per foot' }],
      engines: ['perplexity'],
      concurrency: 3,
    })
  })
})

describe('parsePanelResult', () => {
  it('accepts a result shaped like the PHP output', () => {
    const parsed = parsePanelResult(JSON.stringify(validResult))
    expect(parsed.totals.answers).toBe(1)
    expect(parsed.results[0].rivals[0].host).toBe('boringcontractors.com')
  })

  it('rejects invalid JSON', () => {
    expect(() => parsePanelResult('{nope')).toThrow('not valid JSON')
  })

  it('rejects an unknown result version', () => {
    expect(() => parsePanelResult(JSON.stringify({ ...validResult, version: 2 }))).toThrow('version')
  })

  it('names the field that failed', () => {
    const broken = { ...validResult, results: [{ ...validResult.results[0], own_cited: 'yes' }] }
    expect(() => parsePanelResult(JSON.stringify(broken))).toThrow('results.0.own_cited')
  })
})

describe('runPanelJob', () => {
  let dir: string
  let stub: string

  const run = (mode: string, options: { timeoutMs?: number; signal?: AbortSignal } = {}) => {
    process.env.STUB_MODE = mode
    return runPanelJob({
      job: buildJob(
        {
          businessName: 'A Co',
          domain: 'a.com',
          directoryDomains: [],
          referenceDomains: [],
          questions: [{ c: 'cost', q: 'q' }],
          panelVersion: null,
        },
        ['perplexity'],
        1
      ),
      runId: 'run-1',
      phpBin: process.execPath,
      panelScript: stub,
      workDir: path.join(dir, 'work'),
      timeoutMs: options.timeoutMs ?? 10_000,
      signal: options.signal ?? new AbortController().signal,
    })
  }

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'aeo-job-test-'))
    stub = path.join(dir, 'stub.js')
    // Stands in for `php panel.php job --in --out`.
    writeFileSync(
      stub,
      `const fs = require('fs')
       const args = Object.fromEntries(process.argv.slice(3).map((a) => a.replace(/^--/, '').split('=')))
       const mode = process.env.STUB_MODE
       if (mode === 'exit2') { console.error('Invalid job file: questions must not be empty'); process.exit(2) }
       if (mode === 'hang') { setInterval(() => {}, 1000) }
       else if (mode === 'garbage') { fs.writeFileSync(args.out, '{"version":1}') }
       else { JSON.parse(fs.readFileSync(args.in, 'utf8')); fs.writeFileSync(args.out, ${JSON.stringify(JSON.stringify(validResult))}) }`
    )
  })

  afterEach(() => {
    delete process.env.STUB_MODE
    rmSync(dir, { recursive: true, force: true })
  })

  it('returns the parsed result and removes the job files', async () => {
    const result = await run('ok')
    expect(result.totals.cost_usd).toBe(0.0054)
    expect(readdirSync(path.join(dir, 'work'))).toEqual([])
  })

  it('surfaces a non-zero exit with its code and output', async () => {
    const error = await run('exit2').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(PanelExitError)
    expect((error as PanelExitError).code).toBe(2)
    expect((error as Error).message).toContain('questions must not be empty')
  })

  it('keeps the job file when the result fails validation', async () => {
    await expect(run('garbage')).rejects.toThrow('failed validation')
    expect(readdirSync(path.join(dir, 'work')).sort()).toEqual(['run-1.job.json', 'run-1.result.json'])
  })

  it('kills a panel that runs past the timeout', async () => {
    await expect(run('hang', { timeoutMs: 300 })).rejects.toBeInstanceOf(PanelTimeoutError)
  })

  it('kills the panel when aborted', async () => {
    const controller = new AbortController()
    const pending = run('hang', { signal: controller.signal })
    setTimeout(() => controller.abort(), 200)
    await expect(pending).rejects.toBeInstanceOf(PanelAbortedError)
  })

  it('never reads a stale result left by an earlier attempt', async () => {
    const work = path.join(dir, 'work')
    await run('ok')
    writeFileSync(path.join(work, 'run-1.result.json'), JSON.stringify(validResult))
    await expect(run('exit2')).rejects.toBeInstanceOf(PanelExitError)
  })
})
