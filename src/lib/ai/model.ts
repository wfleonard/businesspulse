import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

/**
 * The Ask/advice model. Defaults to Claude Sonnet 5 (near-Opus quality at
 * SMB-friendly cost); override per deploy/plan via BP_ASK_MODEL.
 */
export const ASK_MODEL = process.env.BP_ASK_MODEL ?? 'claude-sonnet-5'

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
}

let client: Anthropic | undefined

export function getAnthropic(): Anthropic {
  if (!aiConfigured()) {
    throw new AiNotConfiguredError()
  }
  if (!client) client = new Anthropic()
  return client
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super('AI is not configured — set ANTHROPIC_API_KEY')
    this.name = 'AiNotConfiguredError'
  }
}
