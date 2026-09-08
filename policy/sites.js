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
//   always Routes that outrank every other rule, deny included. Login, 2FA and
//          verification live here. Locking yourself out of your own account is
//          the one failure that makes the whole tool unusable.
//   loginUrl Offered as a button on the interstitial. Where a site's root is
//          blocked, the sign-in page is otherwise unreachable -- you cannot
//          log in to a site whose front door you closed.
//   landing Where the site root goes instead of the feed. `null` means the root
//          is hard-blocked instead -- used where the redirect target needs a
//          username I do not have yet.
//   note   Why this policy is shaped the way it is. Write these down; in six
//          months the reasoning is the part you will have forgotten.
//
// The shared rule across every site below: a *search* is intentional, a *feed*
// is not. Search surfaces stay open. Anything that refills itself as you reach
// the bottom is closed, including on pages that are otherwise allowed.

export const sites = [
  {
    id: 'youtube',
    loginUrl: 'https://accounts.google.com/ServiceLogin?service=youtube',
    label: 'YouTube',
    hosts: ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
    landing: '/channel/UC1tfa_mTMeKMXbvfXLFfz1g',
    always: ['/signin(/.*)?', '/logout(/.*)?', '/account(_.*)?(/.*)?'],
    allow: [
      '/results',                    // search -- the only intended entry point
      '/watch',                      // a video you opened from a search
      '/playlist',
      '/feed/you(/.*)?',             // your own channel, history, playlists
      '/@[^/]+(/(videos|playlists|streams|about))?',
      '/channel/[^/]+(/.*)?',
    ],
    deny: [
      '/shorts(/.*)?',
      '/feed/(subscriptions|trending|explore|storefront)',
      '/gaming(/.*)?',
    ],
    hide: [
      'ytd-reel-shelf-renderer',             // Shorts shelf inside search
      'ytd-rich-shelf-renderer[is-shorts]',
      'ytd-reel-item-renderer',
      '#related',                            // up-next rail beside a video
      'ytd-compact-video-renderer',
      '.ytp-endscreen-content',              // end-of-video suggestion grid
      '.ytp-ce-video',                       // in-player card suggestions
      '#guide, ytd-mini-guide-renderer',     // left nav, incl. Subscriptions
      'ytd-browse[page-subtype="home"] #contents',
    ],
    note:
      'Search-only, per your spec. Subscriptions is denied along with home ' +
      'and Shorts. The `hide` list is doing as much work as the routes here: ' +
      'the up-next rail and end screen regenerate a feed on /watch, which is ' +
      'a page you are allowed to be on.',
  },

  {
    id: 'instagram',
    loginUrl: 'https://www.instagram.com/accounts/login/',
    label: 'Instagram',
    hosts: ['instagram.com', 'www.instagram.com'],
    landing: '/christianships/',
    // Redirecting a logged-out visitor to a profile traps them at a login
    // wall, so this one landing is gated on a session existing.
    sessionCookie: 'ds_user_id',
    always: [
      '/accounts/(login|logout|signup|password/reset|onetap|emailsignup)(/.*)?',
      '/accounts/(two_factor|login/two_factor)(/.*)?',
      '/challenge(/.*)?',
      '/oauth(/.*)?',
      '/api(/.*)?',
    ],
    allow: [
      '/explore/search(/.*)?',   // the search surface
      '/[^/]+',                  // profiles
      '/[^/]+/(tagged|reels|saved)',
      '/p/[^/]+',
      '/stories/[^/]+(/.*)?',
      '/direct(/.*)?',
    ],
    deny: [
      '/reels(/.*)?',
      '/explore',                // the discover grid, as distinct from search
    ],
    pruneNav: {
      remove: [
        'Instagram', 'Home', 'Search', 'Explore', 'Reels',
        'Messages', 'Threads', 'Settings', 'Also from Meta',
      ],
    },
    hide: [],
    note:
      'Retightened now that `always` protects login -- the earlier ' +
      'allow-everything was a workaround for being locked out mid-auth. ' +
      '/explore/search is open but the bare /explore discover grid is not.',
  },

  {
    id: 'tiktok',
    loginUrl: 'https://www.tiktok.com/login',
    label: 'TikTok',
    hosts: ['tiktok.com', 'www.tiktok.com'],
    landing: '/upload',
    always: ['/login(/.*)?', '/logout(/.*)?', '/signup(/.*)?', '/passport(/.*)?'],
    allow: [
      '/search(/.*)?',
      '/upload(/.*)?',
      '/@[^/]+',
      '/@[^/]+/video/[^/]+',
    ],
    deny: ['/', '/foryou(/.*)?', '/following(/.*)?', '/explore(/.*)?', '/live(/.*)?'],
    hide: [
      '[data-e2e="recommend-list-item-container"]',
      '[data-e2e="feed-sidebar"]',
    ],
    note:
      'TikTok is almost entirely feed, so this is close to search-plus-' +
      'profiles only. The swipe-to-next container is hidden as well, since ' +
      'a single video page otherwise scrolls into an endless one.',
  },

  {
    id: 'threads',
    loginUrl: 'https://www.threads.com/login',
    label: 'Threads',
    hosts: ['threads.com', 'www.threads.com', 'threads.net', 'www.threads.net'],
    landing: '/@christianships',
    always: ['/login(/.*)?', '/logout(/.*)?', '/challenge(/.*)?', '/api(/.*)?'],
    allow: [
      '/search(/.*)?',
      '/activity(/.*)?',   // notifications
      '/@[^/]+',
      '/@[^/]+/post/[^/]+',
    ],
    deny: ['/for-you(/.*)?', '/following(/.*)?'],
    pruneNav: {
      remove: ['Home', 'Search', 'Feed', 'Explore', 'Threads'],
    },
    hide: [],
    note:
      'Same codebase and roughly the same rail as Instagram, so pruneNav ' +
      'works the same way. Assumes your handle matches Instagram -- confirm.',
  },

  {
    id: 'x',
    loginUrl: 'https://x.com/i/flow/login',
    label: 'X',
    hosts: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
    landing: '/notifications',
    always: [
      '/login(/.*)?', '/logout(/.*)?', '/i/flow(/.*)?',
      '/account(/.*)?', '/oauth(/.*)?',
    ],
    allow: [
      '/search',
      '/notifications(/.*)?',
      '/messages(/.*)?',
      '/compose(/.*)?',
      '/[^/]+',                    // profiles
      '/[^/]+/status/[0-9]+',
    ],
    deny: ['/', '/home', '/explore(/.*)?', '/i/trending(/.*)?', '/i/timeline(/.*)?'],
    hide: [
      '[data-testid="sidebarColumn"]',      // Trends and Who to follow
      '[aria-label="Timeline: Trending now"]',
    ],
    note:
      'The reply timeline under a status is itself infinite, but removing it ' +
      'breaks reading a thread, so it stays. Trends and Who-to-follow are the ' +
      'discovery surfaces and both go.',
  },

  {
    id: 'facebook',
    loginUrl: 'https://www.facebook.com/login',
    label: 'Facebook',
    hosts: ['facebook.com', 'www.facebook.com', 'm.facebook.com'],
    landing: '/me', // resolves to your own profile without needing a username
    always: [
      '/login(/.*)?', '/logout(/.*)?', '/checkpoint(/.*)?',
      '/recover(/.*)?', '/privacy(/.*)?',
    ],
    allow: [
      '/me(/.*)?',
      '/search(/.*)?',
      '/profile\\.php',
      '/groups/[^/]+(/.*)?',
      '/[^/]+/posts/[^/]+',
      '/messages(/.*)?',
    ],
    deny: [
      '/watch(/.*)?',
      '/reel(s)?(/.*)?',
      '/stories(/.*)?',
      '/marketplace(/.*)?',
      '/gaming(/.*)?',
    ],
    hide: ['[role="feed"]', '[data-pagelet^="FeedUnit"]'],
    note:
      '/me is the one landing target that needs no username. Groups stay ' +
      'open because they are usually the reason to be here at all, but the ' +
      'main feed, Watch, Reels, Stories and Marketplace all go.',
  },

  {
    id: 'reddit',
    loginUrl: 'https://www.reddit.com/login',
    label: 'Reddit',
    hosts: ['reddit.com', 'www.reddit.com', 'old.reddit.com', 'np.reddit.com'],
    landing: '/user/me',
    always: ['/login(/.*)?', '/logout(/.*)?', '/register(/.*)?'],
    allow: [
      '/search(/.*)?',
      '/r/[^/]+/search(/.*)?',
      '/r/[^/]+/comments/[^/]+(/.*)?',  // a specific thread
      '/user/[^/]+(/.*)?',
      '/submit(/.*)?',
    ],
    deny: [
      '/',
      '/r/(popular|all)(/.*)?',
      '/(best|hot|new|rising|top)(/.*)?',
      '/r/[^/]+',                       // a subreddit's own listing page
    ],
    hide: ['shreddit-feed', '.trending-searches-container'],
    note:
      'The strict one: a bare subreddit listing is denied, so you reach ' +
      'threads by search or direct link rather than by browsing. This is the ' +
      'rule most likely to annoy you -- say so and I will open /r/<sub> back up.',
  },
]

// Where a blocked navigation lands.
export const INTERSTITIAL = 'pages/blocked.html'
