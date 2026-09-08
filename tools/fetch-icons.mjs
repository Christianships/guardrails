// Downloads a real icon for every tile, once, into extension/icons/.
//
// Run: node tools/fetch-icons.mjs
//
// Done at build time rather than at render time on purpose: a favicon service
// called from the new tab page would ping a third party with the list of sites
// you care about, every single tab. These files are fetched once and then live
// locally, so the page makes no network requests at all.

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { categories } from '../policy/links.js'
import { sites } from '../policy/sites.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const iconDir = join(root, 'extension', 'icons')
mkdirSync(iconDir, { recursive: true })

const slug = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const EXT = { 'image/svg+xml': 'svg', 'image/png': 'png', 'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

const get = (url, as = 'text') =>
  fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
    headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Guardrails/1.0' },
  }).then(async (r) => {
    if (!r.ok) throw new Error(`${r.status}`)
    return as === 'text'
      ? { body: await r.text(), type: r.headers.get('content-type') ?? '' }
      : { body: Buffer.from(await r.arrayBuffer()), type: r.headers.get('content-type') ?? '' }
  })

// Prefer the biggest declared icon: apple-touch-icons are usually 180px and
// purpose-made, where /favicon.ico is often a 16px relic.
function pickIcon(html, base) {
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0])
  const scored = []
  for (const tag of links) {
    const rel = /rel=["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase() ?? ''
    if (!/icon/.test(rel)) continue
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1]
    if (!href) continue
    const size = parseInt(/sizes=["'](\d+)/i.exec(tag)?.[1] ?? '0', 10)
    let score = size
    if (rel.includes('apple-touch')) score += 200
    if (/\.svg($|\?)/i.test(href)) score += 500 // scales, small, always crisp
    scored.push({ href: new URL(href, base).toString(), score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.href
}

const tiles = [
  ...categories.flatMap((c) => c.tiles),
  ...sites.filter((s) => s.landing).map((s) => ({
    label: s.label,
    url: `https://${s.hosts.find((h) => h.startsWith('www.')) ?? s.hosts[0]}/`,
  })),
]

const map = {}
for (const tile of tiles) {
  const name = slug(tile.label)
  const origin = new URL(tile.url).origin
  const existing = ['svg', 'png', 'ico', 'jpg', 'webp']
    .map((e) => `${name}.${e}`)
    .find((f) => existsSync(join(iconDir, f)))
  if (existing) { map[name] = existing; console.log(`  cached  ${tile.label}`); continue }

  let saved = null
  for (const attempt of ['page', 'favicon']) {
    try {
      let href
      if (attempt === 'page') {
        const { body } = await get(origin)
        href = pickIcon(body, origin)
        if (!href) continue
      } else {
        href = `${origin}/favicon.ico`
      }
      const { body, type } = await get(href, 'buffer')
      const ext = EXT[type.split(';')[0].trim()] ?? href.split('.').pop().split('?')[0]
      if (!/^(svg|png|ico|jpg|webp)$/i.test(ext) || body.length < 64) continue
      writeFileSync(join(iconDir, `${name}.${ext}`), body)
      saved = `${name}.${ext}`
      break
    } catch { /* try the next strategy */ }
  }

  if (saved) { map[name] = saved; console.log(`  ok      ${tile.label} -> ${saved}`) }
  else console.log(`  MISSED  ${tile.label} (keeps its letter tile)`)
}

writeFileSync(
  join(root, 'extension', 'generated', 'icon-map.json'),
  JSON.stringify(map, null, 2) + '\n',
)
console.log(`\n${Object.keys(map).length}/${tiles.length} icons`)
