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
  const always = site.always.map(anchored)
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

  // Instagram sets ds_user_id without httpOnly, so it is readable here. It is
  // the cheapest reliable "is there a session" signal; sessionid is httpOnly
  // and invisible to us.
  const loggedIn = () =>
    !site.sessionCookie ||
    new RegExp(`(^|;\\s*)${site.sessionCookie}=`).test(document.cookie)

  function verdict(path) {
    // Auth first, ahead of every other rule. Redirecting a logged-out visitor
    // to a profile page bounces them into a login wall they cannot clear, and
    // blocking /challenge means two-factor can never complete.
    if (always.some((re) => re.test(path))) return 'allow'
    // landing is checked before deny: the root is usually the feed, so it
    // appears in both, and the redirect has to win.
    if (site.landing && (path === '/' || path === ''))
      return loggedIn() ? 'landing' : 'allow'
    if (deny.some((re) => re.test(path))) return 'block'
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
        // Bounce back to your own page. The guard against looping is that the
        // build refuses to compile a landing page its own policy blocks.
        if (site.landing) {
          if (path !== site.landing) location.replace(site.landing)
          return
        }
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

  // --- one at a time -------------------------------------------------------
  // On routes listed in `oneAtATime`, the scroll gesture is severed. A Short
  // you opened on purpose is one video; the swipe that fetches the next one is
  // what makes it a feed. Clicking through to another Short still works, which
  // is the distinction asked for -- and it is a distinction no route rule can
  // make, since both produce the same pushState to /shorts/<id>.
  if (site.oneAtATime) {
    const routes = site.oneAtATime.routes.map(anchored)
    const onGatedRoute = () => routes.some((re) => re.test(location.pathname))

    const smother = (event) => {
      if (!onGatedRoute()) return
      event.preventDefault()
      event.stopPropagation()
    }

    // passive:false is required or preventDefault on wheel/touchmove is
    // ignored; capture:true gets us ahead of the page's own handlers.
    const options = { capture: true, passive: false }
    addEventListener('wheel', smother, options)
    addEventListener('touchmove', smother, options)

    const SEQUENTIAL_KEYS = new Set([
      'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Spacebar',
    ])
    addEventListener(
      'keydown',
      (event) => {
        if (!SEQUENTIAL_KEYS.has(event.key)) return
        // Leave typing alone -- otherwise the comment box eats spaces.
        const el = event.target
        if (el?.isContentEditable || /^(INPUT|TEXTAREA)$/.test(el?.tagName)) return
        smother(event)
      },
      options,
    )
  }

  // --- the left rail ------------------------------------------------------
  // Instagram's rail is plain <div>s with obfuscated, rotating class names, so
  // there is no container to scope to. The one durable handle is the aria-label
  // on each item's <svg>, which survives redesigns because screen readers
  // depend on it.
  if (site.pruneNav) {
    const remove = new Set(site.pruneNav.remove)

    const prune = () => {
      // Instagram labels the <svg>; X labels the <a> and marks its icons
      // aria-hidden. Reading both covers either shape.
      const labelled = 'a[aria-label], button[aria-label], svg[aria-label]'
      // LinkedIn appends counts to its labels ("Home, 1 new notification"), so
      // an exact match never fires there. The comma is required rather than a
      // bare prefix so that "Home" cannot also swallow a "Homepage" item.
      const matches = (label) =>
        label != null &&
        [...remove].some((name) => label === name || label.startsWith(`${name},`))

      for (const el of document.querySelectorAll(labelled)) {
        if (!matches(el.getAttribute('aria-label'))) continue
        // Instagram wraps each rail item in a span[aria-describedby]; hiding
        // that takes the row's spacing with it instead of leaving a gap.
        const item =
          el.closest('span[aria-describedby]') ?? el.closest('a, button') ?? el
        item.style.setProperty('display', 'none', 'important')
      }
    }

    // The rail renders after hydration and re-renders on navigation, so a
    // one-shot pass misses it. Observing childList only -- not attributes --
    // keeps our own style writes from retriggering the observer.
    new MutationObserver(prune).observe(document.documentElement, {
      childList: true,
      subtree: true,
    })
    prune()
  }
})()
