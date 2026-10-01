#!/usr/bin/env node
/**
 * Tell Bing (and the other IndexNow engines) that pages changed, so they
 * recrawl now instead of whenever they next get around to it. ChatGPT's search
 * draws on Bing's index, so this shortens the gap between publishing a
 * resource page and it becoming citable.
 *
 * Run after a deploy that adds or changes pages:
 *
 *   node scripts/indexnow.mjs                    # every URL in the live sitemap
 *   node scripts/indexnow.mjs /resources/foo     # just these paths
 *
 * The key is not a secret. IndexNow proves ownership by fetching
 * public/<KEY>.txt from the site, so that file must be deployed first.
 */

const SITE = 'https://businesspulse.app'
const KEY = 'e0d4967a19b8907d9303e971b106b337'

async function sitemapUrls() {
  const res = await fetch(`${SITE}/sitemap.xml`)
  if (!res.ok) throw new Error(`sitemap.xml returned ${res.status}`)
  const xml = await res.text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
}

async function main() {
  const paths = process.argv.slice(2)
  const urlList = paths.length
    ? paths.map((p) => new URL(p, SITE).toString())
    : await sitemapUrls()

  const keyCheck = await fetch(`${SITE}/${KEY}.txt`)
  if (!keyCheck.ok || (await keyCheck.text()).trim() !== KEY) {
    throw new Error(`Key file ${SITE}/${KEY}.txt is not live yet. Deploy first.`)
  }

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: new URL(SITE).host,
      key: KEY,
      keyLocation: `${SITE}/${KEY}.txt`,
      urlList,
    }),
  })

  // 200 = accepted, 202 = accepted and key validation pending.
  console.log(`IndexNow ${res.status} for ${urlList.length} URL(s):`)
  urlList.forEach((u) => console.log(`  ${u}`))
  if (res.status >= 300) process.exit(1)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
