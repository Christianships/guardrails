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

    // Visiting instagram.com does not show a feed -- it shows you. The home
    // route is rewritten to your own profile, so the reflex to "just check
    // Instagram" lands somewhere finite.
    landing: '/christianships/',

    allow: [
      '/explore(/.*)?', // deliberately reachable, but see `pruneNav` below:
                        // the sidebar link is removed, so the only way here is
                        // to type the URL yourself.
      '/[^/]+',         // anybody's profile page
      '/[^/]+/(tagged|reels|saved)', // tabs within a profile
    ],

    // Named navigation contexts. The guard records the most recent one you
    // were in, and `allowFrom` reads it back.
    contexts: {
      // The negative lookahead matters: without it /explore matches "a profile"
      // and silently becomes a gateway to unlimited posts, which is the exact
      // thing the typed-URL-only rule exists to prevent.
      profile:
        '/(?!explore|reels?|p|stories|direct|accounts)[^/]+(/(tagged|reels|saved))?',
    },

    // Routes allowed only when you arrived from somewhere specific. A post,
    // reel or story is worth seeing when you opened it off a profile you chose
    // to visit; the same URL reached from a feed is the thing being avoided.
    allowFrom: [
      { pattern: '/p/[^/]+', from: 'profile' },
      { pattern: '/reel/[^/]+', from: 'profile' },
      { pattern: '/stories/[^/]+(/.*)?', from: 'profile' },
    ],

    // deny outranks allow, so these survive the broad '/[^/]+' profile rule.
    deny: [
      '/reels(/.*)?',   // the Reels feed itself, as opposed to a single reel
      '/direct(/.*)?',
      '/accounts/activity(/.*)?',
    ],

    // The left rail keeps only these. Matched against each item's accessible
    // name, because Instagram's class names are obfuscated and rotate --
    // labels are the only stable handle.
    pruneNav: {
      container: 'nav, [role="navigation"]',
      keep: ['Notifications', 'Create', 'Profile'],
    },

    hide: [],

    note:
      'Home feed and the Reels feed are gone; Explore survives only by typed ' +
      'URL. Posts/reels/stories are gated on arriving from a profile, which ' +
      'is what makes "look at one person" possible without reopening an ' +
      'infinite surface. DMs are currently denied -- revisit if that bites.',
  },
]

// Where a blocked navigation lands.
export const INTERSTITIAL = 'pages/blocked.html'
