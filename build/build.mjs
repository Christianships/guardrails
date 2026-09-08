// Compiles policy/sites.js into everything the extension actually loads.
// Run: node build/build.mjs
//
// Three outputs, because a blocked navigation has to be caught at three
// different moments:
//
//   rules.json  declarativeNetRequest -- stops a real HTTP navigation before
//               the network request happens. Fastest, but only fires on
//               main_frame loads.
//   policy.js   the same allowlist as data, for the route guard. YouTube and
//               Instagram are single-page apps: clicking a Short swaps the URL
//               via history.pushState and never issues a main_frame request,
//               so declarativeNetRequest never sees it. The guard does.
//   hide.css    selectors stripped from pages that ARE allowed.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { sites, INTERSTITIAL } from '../policy/sites.js'
import { categories, search, socialsLabel } from '../policy/links.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'extension', 'generated')
mkdirSync(out, { recursive: true })

const escapeHost = (h) => h.replace(/\./g, '\\.')

// A pathname pattern becomes a full-URL regex anchored at both ends, so
// '/watch' cannot be satisfied by '/shorts/watch-this'.
function urlRegex(hosts, pathPattern) {
  const hostGroup = hosts.map(escapeHost).join('|')
  return `^https?://(${hostGroup})(:\\d+)?${pathPattern}/?(\\?.*)?(#.*)?$`
}

// Higher wins. `allowFrom` routes get no rule here at all -- whether they
// are permitted depends on where you came from, which only the guard knows.

// A landing page that is itself blocked turns every redirect into an infinite
// loop, so this is checked at build time rather than discovered in the browser.
for (const site of sites) {
  if (!site.landing) continue
  const anchored = (p) => new RegExp(`^${p}/?$`)
  const path = site.landing
  const denied = (site.deny ?? []).some((p) => anchored(p).test(path))
  const allowed =
    (site.always ?? []).some((p) => anchored(p).test(path)) ||
    site.allow.some((p) => anchored(p).test(path))
  if (denied || !allowed) {
    throw new Error(
      `${site.id}: landing "${path}" is ${denied ? 'denied' : 'not allowed'} ` +
        `by its own policy -- redirects would loop forever.`,
    )
  }
}

const PRIORITY = { catchAll: 1, allow: 2, landing: 3, deny: 4, always: 5 }

const rules = []
let ruleId = 1

for (const site of sites) {
  // A blocked route lands back on your own page where there is one. The
  // chrome-extension:// interstitial is kept only for sites with no landing
  // target, because it carries the sign-in link and those sites' roots are
  // blocked -- without it they cannot be logged into at all.
  const redirect = {
    type: 'redirect',
    redirect: site.landing
      ? { transform: { path: site.landing } }
      : { extensionPath: `/${INTERSTITIAL}?site=${site.id}` },
  }
  const condition = (regexFilter) => ({
    regexFilter,
    resourceTypes: ['main_frame'],
    isUrlFilterCaseSensitive: false,
  })

  // 1. Everything on these hosts is blocked...
  rules.push({
    id: ruleId++,
    priority: PRIORITY.catchAll,
    action: redirect,
    condition: condition(urlRegex(site.hosts, '(/.*)?')),
  })

  // 2. ...except the routes you declared worth keeping.
  for (const pattern of site.allow) {
    rules.push({
      id: ruleId++,
      priority: PRIORITY.allow,
      action: { type: 'allow' },
      condition: condition(urlRegex(site.hosts, pattern)),
    })
  }

  // 2b. Where the redirect needs no login check, do it at the network layer:
  //     the content script cannot run before the feed has already painted.
  if (site.landing && !site.sessionCookie) {
    rules.push({
      id: ruleId++,
      priority: PRIORITY.landing,
      action: { type: 'redirect', redirect: { transform: { path: site.landing } } },
      condition: condition(urlRegex(site.hosts, '/?')),
    })
  }

  // 3. ...and `deny` wins back over a broad allow (e.g. /:username also
  //    matching /explore).
  for (const pattern of site.deny ?? []) {
    rules.push({
      id: ruleId++,
      priority: PRIORITY.deny,
      action: redirect,
      condition: condition(urlRegex(site.hosts, pattern)),
    })
  }

  // 4. `always` outranks everything, including deny. Login and verification
  //    flows must never be reachable-by-accident-only.
  for (const pattern of site.always ?? []) {
    rules.push({
      id: ruleId++,
      priority: PRIORITY.always,
      action: { type: 'allow' },
      condition: condition(urlRegex(site.hosts, pattern)),
    })
  }

  ruleId = Math.ceil(ruleId / 1000) * 1000 + 1 // keep each site in its own band
}

writeFileSync(join(out, 'rules.json'), JSON.stringify(rules, null, 2) + '\n')

// The guard needs the same patterns at runtime, keyed by host.
const runtime = {}
for (const site of sites) {
  for (const host of site.hosts) {
    runtime[host] = {
      id: site.id,
      label: site.label,
      allow: site.allow,
      deny: site.deny ?? [],
      allowFrom: site.allowFrom ?? [],
      landing: site.landing ?? null,
      pruneNav: site.pruneNav ?? null,
      contexts: site.contexts ?? {},
      always: site.always ?? [],
      sessionCookie: site.sessionCookie ?? null,
      oneAtATime: site.oneAtATime ?? null,
    }
  }
}
// Emitted as a plain global rather than an ES module: MV3 content scripts are
// classic scripts, so `import` is unavailable inside guard.js.
// The interstitial is a standalone page and knows only the site id it was
// redirected with, so it needs a lookup that is not keyed by hostname.
const bySite = Object.fromEntries(
  sites.map((s) => [s.id, { label: s.label, loginUrl: s.loginUrl ?? null }]),
)

writeFileSync(
  join(out, 'policy.js'),
  '// GENERATED by build/build.mjs -- edit policy/sites.js instead.\n' +
    `globalThis.GUARDRAILS = ${JSON.stringify(
      { policy: runtime, sites: bySite, interstitial: INTERSTITIAL },
      null,
      2,
    )}\n`,
)

const css = sites
  .map((s) => ({ ...s, hide: [...s.hide, ...(s.oneAtATime?.hide ?? [])] }))
  .filter((s) => s.hide.length)
  .map(
    (s) =>
      `/* ${s.label} */\n${s.hide.join(',\n')} { display: none !important; }`,
  )
  .join('\n\n')
writeFileSync(
  join(out, 'hide.css'),
  '/* GENERATED by build/build.mjs -- edit policy/sites.js instead. */\n' +
    css +
    '\n',
)

// host_permissions has to cover every governed host, so generate it too
// rather than letting manifest.json drift out of sync with the policy.
const manifestPath = join(root, 'extension', 'manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const origins = [...new Set(sites.flatMap((s) => s.hosts))].map(
  (h) => `*://${h}/*`,
)
manifest.host_permissions = origins
manifest.content_scripts[0].matches = origins
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

// --- start page ------------------------------------------------------------
// The Socials row is derived rather than declared, so the tiles and the policy
// can never disagree about where a site's front door is.
const iconMapPath = join(out, 'icon-map.json')
const iconMap = existsSync(iconMapPath)
  ? JSON.parse(readFileSync(iconMapPath, 'utf8'))
  : {}
const slug = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
// A tile keeps its letter fallback until fetch-icons.mjs has found a real one,
// so a missing download degrades to a placeholder rather than a broken image.
const withIcon = (tile) => ({ ...tile, icon: iconMap[slug(tile.label)] ?? null })

const socials = {
  id: 'socials',
  label: socialsLabel,
  tiles: sites
    .filter((s) => s.landing)
    .map((s) =>
      withIcon({
        label: s.label,
        url: `https://${s.hosts.find((h) => h.startsWith('www.')) ?? s.hosts[0]}${s.landing}`,
      }),
    ),
}

writeFileSync(
  join(out, 'start-data.js'),
  '// GENERATED by build/build.mjs -- edit policy/links.js or sites.js.\n' +
    `globalThis.START = ${JSON.stringify(
      {
        search,
        categories: [
          ...categories.map((c) => ({ ...c, tiles: c.tiles.map(withIcon) })),
          socials,
        ],
      },
      null,
      2,
    )}\n`,
)

console.log(
  `built ${rules.length} rules across ${sites.length} sites -> extension/generated/`,
)
console.log(
  `start page: ${categories.length + 1} categories, ` +
    `${categories.reduce((n, c) => n + c.tiles.length, 0) + socials.tiles.length} tiles`,
)
