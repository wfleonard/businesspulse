import { spawn } from 'child_process'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import path from 'path'
import { z } from 'zod'
import type { PanelQuestion } from './questions'
import type { RunPlan } from './plan'

/**
 * The worker's side of the contract with `php panel/panel.php job`.
 * The PHP side is panel/src/Job.php; field names match it exactly.
 */

export type PanelJob = {
  client: {
    name: string
    domain: string
    aliases: string[]
    directory_domains: string[]
    reference_domains: string[]
  }
  questions: PanelQuestion[]
  engines: string[]
  concurrency: number
}

export function buildJob(plan: RunPlan, engines: string[], concurrency: number): PanelJob {
  return {
    client: {
      name: plan.businessName,
      domain: plan.domain,
      aliases: [],
      directory_domains: plan.directoryDomains,
      reference_domains: plan.referenceDomains,
    },
    questions: plan.questions,
    engines,
    concurrency,
  }
}

const sourceSchema = z.object({ url: z.string(), title: z.string(), cited: z.boolean() })
const rivalSchema = z.object({ host: z.string(), title: z.string(), cited: z.boolean() })

const resultRowSchema = z.object({
  query: z.string(),
  category: z.string(),
  engine: z.string(),
  model: z.string(),
  own_cited: z.boolean(),
  name_mentioned: z.boolean(),
  directory_only: z.boolean(),
  own_rank: z.number().int().nullable(),
  rivals: z.array(rivalSchema),
  sources: z.array(sourceSchema),
  answer: z.string(),
  input_tokens: z.number().int(),
  output_tokens: z.number().int(),
  searches: z.number().int(),
  cost_usd: z.number(),
  error: z.string().nullable(),
})

export const panelResultSchema = z.object({
  version: z.literal(1),
  totals: z.object({
    questions: z.number().int(),
    answers: z.number().int(),
    errors: z.number().int(),
    cited_questions: z.number().int(),
    named_questions: z.number().int(),
    cost_usd: z.number(),
  }),
  results: z.array(resultRowSchema),
})

export type PanelResult = z.infer<typeof panelResultSchema>

export function parsePanelResult(raw: string): PanelResult {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('panel result is not valid JSON')
  }
  const parsed = panelResultSchema.safeParse(data)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new Error(`panel result failed validation at ${issue.path.join('.') || '(root)'}: ${issue.message}`)
  }
  return parsed.data
}

export class PanelExitError extends Error {
  constructor(
    readonly code: number | null,
    readonly signal: NodeJS.Signals | null,
    output: string
  ) {
    super(`panel exited with ${code ?? signal}: ${output.trim().slice(-500) || '(no output)'}`)
    this.name = 'PanelExitError'
  }
}

export class PanelTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`panel did not finish within ${Math.round(timeoutMs / 1000)}s`)
    this.name = 'PanelTimeoutError'
  }
}

export class PanelAbortedError extends Error {
  constructor() {
    super('panel run was aborted')
    this.name = 'PanelAbortedError'
  }
}

export type RunPanelJobOptions = {
  job: PanelJob
  runId: string
  phpBin: string
  panelScript: string
  workDir: string
  timeoutMs: number
  signal: AbortSignal
}

/**
 * Write the job file, run the panel, and return the parsed result.
 *
 * Job and result files are deleted on success and kept on failure, so a failed
 * run can be inspected. Any result file left from an earlier attempt is removed
 * first — a stale file must never be mistaken for this attempt's output.
 */
export async function runPanelJob(options: RunPanelJobOptions): Promise<PanelResult> {
  const { job, runId, phpBin, panelScript, workDir, timeoutMs, signal } = options
  await mkdir(workDir, { recursive: true })

  const inPath = path.join(workDir, `${runId}.job.json`)
  const outPath = path.join(workDir, `${runId}.result.json`)
  await rm(outPath, { force: true })
  await writeFile(inPath, JSON.stringify(job))

  const exit = await spawnPanel(
    phpBin,
    [panelScript, 'job', `--in=${inPath}`, `--out=${outPath}`],
    timeoutMs,
    signal
  )
  if (exit.code !== 0) {
    throw new PanelExitError(exit.code, exit.signal, exit.output)
  }

  const result = parsePanelResult(await readFile(outPath, 'utf8'))
  await Promise.all([rm(inPath, { force: true }), rm(outPath, { force: true })])
  return result
}

type SpawnExit = { code: number | null; signal: NodeJS.Signals | null; output: string }

function spawnPanel(
  bin: string,
  args: string[],
  timeoutMs: number,
  signal: AbortSignal
): Promise<SpawnExit> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env })

    let output = ''
    const keep = (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-4000)
    }
    child.stdout.on('data', keep)
    child.stderr.on('data', keep)

    let stopReason: 'timeout' | 'aborted' | null = null
    const stop = (reason: 'timeout' | 'aborted') => {
      if (stopReason) return
      stopReason = reason
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 5000).unref()
    }

    const timer = setTimeout(() => stop('timeout'), timeoutMs)
    const onAbort = () => stop('aborted')
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) onAbort()

    const cleanup = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
    }

    child.on('error', (err) => {
      cleanup()
      reject(err)
    })
    child.on('close', (code, exitSignal) => {
      cleanup()
      if (stopReason === 'timeout') reject(new PanelTimeoutError(timeoutMs))
      else if (stopReason === 'aborted') reject(new PanelAbortedError())
      else resolve({ code, signal: exitSignal, output })
    })
  })
}
