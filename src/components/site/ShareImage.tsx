import { ImageResponse } from 'next/og'

/** Open Graph images: what LinkedIn, Slack, and others show when a page is shared. */
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 }

/** Brand colors from globals.css. */
const PRIMARY = '#2563eb'
const DARK = '#0f172a'
const SECONDARY = '#64748b'
const BG = '#f8fafc'

export function shareImage({ eyebrow, title }: { eyebrow: string; title: string }): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: BG,
          borderTop: `16px solid ${PRIMARY}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 36, color: DARK }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: PRIMARY, marginRight: 16 }} />
          BusinessPulse
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 28, color: PRIMARY, textTransform: 'uppercase', letterSpacing: 2 }}>{eyebrow}</div>
          <div
            style={{
              marginTop: 20,
              fontSize: title.length > 70 ? 54 : 64,
              lineHeight: 1.15,
              color: DARK,
            }}
          >
            {title}
          </div>
        </div>
        <div style={{ fontSize: 28, color: SECONDARY }}>Free AI visibility snapshot · businesspulse.app</div>
      </div>
    ),
    SHARE_IMAGE_SIZE
  )
}
