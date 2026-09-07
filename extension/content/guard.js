// The client-side half of the allowlist.
//
// declarativeNetRequest only sees main_frame network loads. On Instagram almost
// no navigation is one: opening a post rewrites the URL with history.pushState
// and streams the view over fetch. To the network layer nothing happened, so
// the static rules never fire. This guard closes that hole, and adds the two
// things static rules cannot express: where you came from, and what the page
// is allowed to still be showing you.

;(() => {
  const { policy, interstitial } = globalThis.GUARDRAILS ?? {}
  const site = policy?.[location.hostname]
  if (!site) return

  // Patterns are pathname regex sources, anchored here so that '/p/[^/]+'
  // cannot be satisfied by '/p/abc/extra'.
  const anchored = (p) => new RegExp(`^${p}/?$`)
  const allow = site.allow.map(anchored)
  const deny = site.deny.map(anchored)
  const allowFrom = site.allowFrom.map((entry) => ({
    match: anchored(entry.pattern),
    from: entry.from,
  }))
  const contexts = Object.entries(site.contexts).map(([name, pattern]) => ({
    name,
    match: anchored(pattern),
  }))

  // Context lives in sessionStorage, not a variable: it has to survive a full
  // page load so that opening a post in a new tab from a profile still counts,
  // while a post URL pasted into a cold tab does not.
  const CTX_KEY = `guardrails:${site.id}:context`
  const readContext = () => {
    try { return sessionStorage.getItem(CTX_KEY) } catch { return null }
  }
  const writeContext = (value) => {
    try {
      if (value) sessionStorage.setItem(CTX_KEY, value)
    } catch { /* private mode; degrade to blocking allowFrom routes */ }
  }

  function verdict(path) {
    if (deny.some((re) => re.test(path))) return 'block'
    if (site.landing && (path === '/' || path === '')) return 'landing'
    if (allow.some((re) => re.test(path))) return 'allow'
    const gated = allowFrom.find((entry) => entry.match.test(path))
    if (gated) return readContext() === gated.from ? 'allow' : 'block'
    return 'block'
  }

  let lastPath = null

  function enforce() {
    const path = location.pathname
    if (path === lastPath) return
    lastPath = path

    switch (verdict(path)) {
      case 'allow': {
        // Only permitted routes can establish a context, otherwise a blocked
        // page could authorise the thing it was blocked for.
        const context = contexts.find((c) => c.match.test(path))
        if (context) writeContext(context.name)
        return
      }
      case 'landing':
        location.replace(site.landing)
        return
      default: {
        const url = new URL(chrome.runtime.getURL(interstitial))
        url.searchParams.set('site', site.id)
        url.searchParams.set('from', path)
        // replace(), not assign(): a blocked route should not become a history
        // entry you can bounce back into with the Back button.
        location.replace(url.toString())
      }
    }
  }

  // history.pushState/replaceState fire no event, so they need wrapping.
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method]
    history[method] = function (...args) {
      const result = original.apply(this, args)
      enforce()
      return result
    }
  }
  addEventListener('popstate', enforce)
  enforce()

  // --- the left rail ------------------------------------------------------
  // Instagram's class names are obfuscated and rotate between builds, so items
  // are matched on accessible name -- the one handle that stays stable because
  // screen readers depend on it.
  if (site.pruneNav) {
    const { container, keep } = site.pruneNav
    const label = (el) =>
      (el.getAttribute('aria-label') || el.textContent || '').trim()

    const prune = () => {
      for (const nav of document.querySelectorAll(container)) {
        for (const item of nav.querySelectorAll('a[href], [role="link"], [role="button"]')) {
          const name = label(item)
          if (!name || keep.some((k) => name.startsWith(k))) continue
          const row = item.closest('li') ?? item
          row.style.setProperty('display', 'none', 'important')
        }
      }
    }

    // The rail is rendered after hydration and re-rendered on navigation, so a
    // one-shot pass would miss it.
    new MutationObserver(prune).observe(document.documentElement, {
      childList: true,
      subtree: true,
    })
    prune()
  }
})()
