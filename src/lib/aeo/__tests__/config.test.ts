/** @jest-environment node */
import os from 'os'
import path from 'path'
import { workerConfig } from '../config'

describe('workerConfig', () => {
  it('uses defaults for an empty environment', () => {
    expect(workerConfig({}, '/app')).toEqual({
      pollMs: 3000,
      dailySpendCapUsd: 10,
      leaseSeconds: 300,
      heartbeatMs: 60_000,
      retryDelaySeconds: 60,
      jobTimeoutSeconds: 600,
      maxAttempts: 3,
      snapshotQuestions: 20,
      concurrency: 2,
      panelModel: 'claude-sonnet-5',
      phpBin: 'php',
      panelScript: path.join('/app', 'panel', 'panel.php'),
      workDir: path.join(os.tmpdir(), 'aeo-worker'),
      exitWhenIdle: false,
    })
  })

  it('reads overrides and derives the heartbeat from the lease', () => {
    const config = workerConfig(
      {
        AEO_LEASE_SECONDS: '10',
        AEO_DAILY_SPEND_CAP_USD: '2.5',
        AEO_SNAPSHOT_QUESTIONS: '5',
        AEO_PHP_BIN: '/usr/bin/php8.2',
        AEO_EXIT_WHEN_IDLE: 'true',
      },
      '/app'
    )
    expect(config.leaseSeconds).toBe(10)
    expect(config.heartbeatMs).toBe(2000)
    expect(config.dailySpendCapUsd).toBe(2.5)
    expect(config.snapshotQuestions).toBe(5)
    expect(config.phpBin).toBe('/usr/bin/php8.2')
    expect(config.exitWhenIdle).toBe(true)
  })

  it('falls back on invalid values instead of crashing', () => {
    const config = workerConfig(
      { AEO_WORKER_POLL_MS: 'soon', AEO_MAX_ATTEMPTS: '-1', AEO_DAILY_SPEND_CAP_USD: '0' },
      '/app'
    )
    expect(config.pollMs).toBe(3000)
    expect(config.maxAttempts).toBe(3)
    expect(config.dailySpendCapUsd).toBe(10)
  })

  it('caps panel concurrency at 10 and floors whole-number settings', () => {
    const config = workerConfig({ AEO_PANEL_CONCURRENCY: '50', AEO_LEASE_SECONDS: '7.9' }, '/app')
    expect(config.concurrency).toBe(10)
    expect(config.leaseSeconds).toBe(7)
  })
})
