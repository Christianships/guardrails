// Guardrails policy -- the single source of truth.
//
// Everything else in this repo is generated from this file: the extension's
// declarativeNetRequest rules, the CSS that hides page furniture, the
// client-side route guard, and (later) the iPhone .mobileconfig.
//
// The model is an ALLOWLIST. For each site you name the routes that are
// legitimately worth visiting; every other route on that host redirects to the
// interstitial. A denylist always lags -- when a site ships a new infinite
// surface it is unblocked by default until you notice. An allowlist fails
// closed instead.
//
// Field reference
//   id     Stable slug. Used for filenames and rule-ID ranges.
//   label  Human name, shown on the interstitial.
//   hosts  Exact hostnames this policy governs. Subdomains are NOT implied.
//   allow  Route allowlist. Each entry is a regex matched against the URL
//          pathname, implicitly anchored (^...$). Query strings are ignored
//          unless the entry includes an explicit `?` clause via `allowQuery`.
//   hide   CSS selectors removed on allowed pages -- the scalpel. Use this for
//          recommendation rails that live *inside* a page you still want.
//   note   Why this policy is shaped the way it is. Write these down; in six
//          months the reasoning is the part you will have forgotten.

export const sites = [
  {
    id: 'youtube',
    label: 'YouTube',
    hosts: ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
    allow: [
      '/watch',                 // a specific video you chose to open
      '/results',               // search results
      '/playlist',              // a playlist you opened
      '/feed/subscriptions',    // chronological, finite, no algorithm
      '/@[^/]+(/(videos|playlists|streams|about))?', // channel pages
      '/channel/[^/]+(/.*)?',
    ],
    hide: [
      'ytd-reel-shelf-renderer',            // Shorts shelf inside search
      'ytd-rich-shelf-renderer[is-shorts]', // Shorts shelf inside feeds
      '#related',                           // up-next rail beside a video
      'ytd-compact-video-renderer',
    ],
    note:
      'The home feed (/) and Shorts (/shorts/*) are the whole problem, so ' +
      'neither is in the allowlist. Subscriptions survives because it is ' +
      'chronological and has an end.',
  },

  {
    id: 'instagram',
    label: 'Instagram',
    hosts: ['instagram.com', 'www.instagram.com'],

    // Visiting instagram.com lands on your own profile instead of the feed --
    // but only once you are logged in. See `landing` handling in guard.js:
    // redirecting a logged-out visitor to a profile bounces them into a login
    // wall they can never clear.
    landing: '/christianships/',

    // Never blocked, never redirected, checked before anything else. Auth is
    // not a surface you can doomscroll, and locking yourself out of your own
    // login is the one failure mode that makes the whole thing unusable.
    always: [
      '/accounts/(login|logout|signup|password/reset|onetap|emailsignup)(/.*)?',
      '/accounts/(two_factor|login/two_factor)(/.*)?',
      '/challenge(/.*)?',
      '/oauth(/.*)?',
      '/api(/.*)?',
    ],

    // Deliberately wide, at your request. The feed is handled by `landing`
    // and the rail is pruned, so the pull surfaces are gone without every
    // route needing to be enumerated up front.
    allow: ['(/.*)?'],

    // deny outranks allow, so this survives the wide rule above.
    deny: ['/reels(/.*)?'],

    // Named by the `aria-label` on each item's <svg>, which is the only stable
    // handle: the rail is plain <div>s (no <nav>), and every class name is
    // obfuscated and rotates between builds.
    //
    // A remove-list, not a keep-list. Keep-lists have to hide "everything
    // unrecognised", and a selector that drifts then blanks the whole page.
    // A remove-list fails safe: at worst an item survives.
    pruneNav: {
      remove: [
        'Instagram',      // wordmark at the top of the rail
        'Home',
        'Search',         // this item's href is actually /explore/
        'Explore',
        'Reels',
        'Messages',       // also kills the floating chat bubble
        'Threads',
        'Settings',       // the "More" hamburger
        'Also from Meta',
      ],
    },

    hide: [],

    note:
      'Loosened from a route allowlist to allow-everything-but-Reels, because ' +
      'the strict version blocked login and verification flows. The friction ' +
      'now comes from the landing redirect and the pruned rail rather than ' +
      'from blocking routes. The `allowFrom` machinery still exists in the ' +
      'builder if you want to re-gate posts to "only from a profile" later.',
  },
]

// Where a blocked navigation lands.
export const INTERSTITIAL = 'pages/blocked.html'
