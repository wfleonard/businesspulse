import { ImageResponse } from 'next/og'
import type { Verdict } from './report'

/**
 * The "AI answer card": one real buyer question, what an AI assistant
 * pointed the buyer to, and whether the business made it. Built from a
 * snapshot's stored result, so every card shows a real answer.
 *
 * outreach: real site names, for sending a prospect their own result.
 * public: other businesses blurred into bars, for posts and ads, so a public
 * image never puts named competitors on display.
 *
 * Copy rules: says which sites an AI assistant cited, nothing about Google
 * rankings or listings.
 */

export const CARD_SIZES = {
  square: { width: 1080, height: 1080 },
  wide: { width: 1200, height: 630 },
} as const

export type CardSize = keyof typeof CARD_SIZES
export type CardMode = 'outreach' | 'public'

export type AnswerCardInput = {
  question: string
  /** Which assistant answered, e.g. "Perplexity". */
  assistant: string
  /** Sites the answer cited instead, best first. */
  cited: { host: string; title: string }[]
  verdict: Verdict
  businessName: string
  size: CardSize
  mode: CardMode
}

const PRIMARY = '#2563eb'
const DARK = '#0f172a'
const SECONDARY = '#64748b'
const BG = '#f8fafc'
const RED = '#dc2626'
const AMBER = '#b45309'
const GREEN = '#15803d'

/** The line about the business, and its color. */
export function verdictLine(verdict: Verdict, businessName: string, mode: CardMode): { text: string; color: string } {
  if (mode === 'public') return { text: 'Is your business on this list?', color: RED }
  const name = businessName || 'Your business'
  switch (verdict) {
    case 'cited':
      return { text: `${name}: cited`, color: GREEN }
    case 'directory':
      return { text: `${name}: only through a listing site`, color: AMBER }
    case 'named':
      return { text: `${name}: named, but no link to its site`, color: AMBER }
    case 'no_search':
      return { text: `${name}: not mentioned (answered from memory)`, color: RED }
    default:
      return { text: `${name}: not mentioned`, color: RED }
  }
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + '…' : clean
}

/** Bar widths for the blurred rows, so they read as different names. */
const BAR_WIDTHS = ['78%', '62%', '70%', '55%']

export function answerCard(input: AnswerCardInput): ImageResponse {
  const square = input.size === 'square'
  const rows = input.cited.slice(0, square ? 4 : 3)
  const verdict = verdictLine(input.verdict, input.businessName, input.mode)
  const question = clip(input.question, square ? 120 : 90)
  const questionSize = square ? (question.length > 70 ? 54 : 64) : question.length > 60 ? 40 : 46

  const list = (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={{ fontSize: square ? 26 : 22, color: SECONDARY, marginBottom: 14 }}>
        {rows.length ? 'The answer pointed buyers to:' : 'The answer cited no business websites.'}
      </div>
      {rows.map((row, i) => (
        <div
          key={row.host + i}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#ffffff',
            border: '2px solid #e2e8f0',
            borderRadius: 14,
            padding: square ? '18px 22px' : '12px 18px',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: square ? 40 : 32,
              height: square ? 40 : 32,
              borderRadius: 20,
              background: PRIMARY,
              color: '#ffffff',
              fontSize: square ? 24 : 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 18,
              flexShrink: 0,
            }}
          >
            {i + 1}
          </div>
          {input.mode === 'public' ? (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <div style={{ height: square ? 22 : 18, width: BAR_WIDTHS[i % BAR_WIDTHS.length], background: '#cbd5e1', borderRadius: 8 }} />
              <div style={{ height: square ? 14 : 12, width: '40%', background: '#e2e8f0', borderRadius: 6, marginTop: 10 }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: square ? 30 : 24, color: DARK, fontWeight: 700 }}>{clip(row.host, 40)}</div>
              {row.title && (
                <div style={{ fontSize: square ? 22 : 18, color: SECONDARY, marginTop: 4 }}>{clip(row.title, square ? 56 : 48)}</div>
              )}
            </div>
          )}
        </div>
      ))}
      <div
        style={{
          display: 'flex',
          marginTop: 10,
          padding: square ? '18px 22px' : '12px 18px',
          borderRadius: 14,
          border: `3px solid ${verdict.color}`,
          color: verdict.color,
          fontSize: square ? 32 : 26,
          fontWeight: 700,
        }}
      >
        {verdict.text}
      </div>
    </div>
  )

  const brand = (
    <div style={{ display: 'flex', alignItems: 'center', fontSize: square ? 34 : 28, color: DARK, fontWeight: 700 }}>
      <div style={{ width: 20, height: 20, borderRadius: 10, background: PRIMARY, marginRight: 14 }} />
      BusinessPulse
    </div>
  )
  const chip = (
    <div
      style={{
        display: 'flex',
        fontSize: square ? 24 : 20,
        color: PRIMARY,
        background: '#dbeafe',
        borderRadius: 999,
        padding: '8px 18px',
        alignSelf: 'flex-start',
      }}
    >
      {`Asked of ${input.assistant}`}
    </div>
  )
  const footer = (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', fontSize: square ? 30 : 22, color: DARK }}>
      <span style={{ fontWeight: 700, color: PRIMARY }}>Free check in 2 minutes</span>
      <span style={{ margin: '0 12px', color: SECONDARY }}>→</span>
      <span>businesspulse.app</span>
    </div>
  )
  const questionBlock = (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: square ? 26 : 22, color: SECONDARY, textTransform: 'uppercase', letterSpacing: 2 }}>
        A buyer asked AI
      </div>
      <div style={{ marginTop: 12, fontSize: questionSize, lineHeight: 1.15, color: DARK, fontWeight: 700 }}>{`“${question}”`}</div>
    </div>
  )

  const frame = {
    width: '100%',
    height: '100%',
    display: 'flex',
    background: BG,
    borderTop: `16px solid ${PRIMARY}`,
  } as const

  return new ImageResponse(
    square ? (
      <div style={{ ...frame, flexDirection: 'column', justifyContent: 'space-between', padding: '56px 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {brand}
          {chip}
        </div>
        {questionBlock}
        {list}
        {footer}
      </div>
    ) : (
      <div style={{ ...frame, flexDirection: 'row', padding: '44px 52px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '46%', paddingRight: 36 }}>
          {brand}
          {questionBlock}
          {chip}
          {footer}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', width: '54%' }}>{list}</div>
      </div>
    ),
    CARD_SIZES[input.size]
  )
}
