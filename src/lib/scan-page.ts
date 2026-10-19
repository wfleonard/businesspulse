/** Add the GA4 tag to the /scan page's <head>. No ID (local, or an invalid one) leaves the page untouched. */
export function withAnalytics(html: string, id: string | null): string {
  if (!id) return html
  const tag = `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');</script>
`
  return html.includes('</head>') ? html.replace('</head>', `${tag}</head>`) : tag + html
}
