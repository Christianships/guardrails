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
      '/shorts/[^/]+',               // one Short, see `oneAtATime` below
      '/watch',                      // a video you opened from a search
      '/playlist',
      '/feed/you(/.*)?',             // your own channel, history, playlists
      '/@[^/]+(/(videos|playlists|streams|about))?',
      '/channel/[^/]+(/.*)?',
    ],
    deny: [
      '/feed/(subscriptions|trending|explore|storefront)',
      '/gaming(/.*)?',
    ],
    // A Short is a single video you opened, not a channel you entered. Scroll,
    // swipe and the arrow keys are what turn it into a feed, so those are cut
    // at the event level -- the URL change from a swipe is indistinguishable
    // from the one you get by clicking, so no route rule can tell them apart.
    oneAtATime: {
      routes: ['/shorts/[^/]+'],
      hide: ['#navigation-button-down', '#navigation-button-up'],
    },

    hide: [
      // Shorts inside search results. YouTube ships several generations of
      // these components at once, so all of them are listed: the old shelf
      // renderers, the newer lockup view-models, and -- via :has() -- any
      // result row or section that turns out to contain a Short.
      'ytd-reel-shelf-renderer',
      'ytd-rich-shelf-renderer[is-shorts]',
      'ytd-reel-item-renderer',
      'grid-shelf-view-model',
      'ytm-shorts-lockup-view-model',
      'ytm-shorts-lockup-view-model-v2',     // the outer wrapper; hiding only
                                             // the inner one leaves its box
      'ytd-item-section-renderer:has(grid-shelf-view-model)',
      'ytd-item-section-renderer:has(ytm-shorts-lockup-view-model)',
      'ytd-rich-section-renderer:has(ytm-shorts-lockup-view-model)',
      'ytd-video-renderer:has(a[href^="/shorts/"])',
      'ytd-rich-item-renderer:has(a[href^="/shorts/"])',
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
    landing: '/@christianships_',
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
    landing: '/christianships_',
    always: [
      '/login(/.*)?', '/logout(/.*)?', '/i/flow(/.*)?',
      '/account(/.*)?', '/oauth(/.*)?',
    ],
    allow: [
      '/search',
      '/explore(/.*)?',       // kept: this is the search surface here
      '/notifications(/.*)?',
      '/i/history(/.*)?',
      '/compose(/.*)?',       // posting stays open
      '/i/grok(/.*)?',        // kept: a tool, not a feed
      '/[^/]+',               // profiles
      '/[^/]+/status/[0-9]+',
    ],
    deny: [
      '/',
      '/home',                // the algorithmic timeline
      '/i/trending(/.*)?',
      '/i/chat(/.*)?',
      '/i/jf/creators/studio(/.*)?',
      '/i/premium_sign_up(/.*)?',
    ],
    // X puts the accessible name on the <a>, not on the <svg> (its icons are
    // aria-hidden), which is why the pruner reads both.
    pruneNav: {
      remove: [
        'X',                  // the wordmark, which links to /home
        'Home',
        'Direct Messages',
        'Creator Studio',
        'Premium',
      ],
    },
    hide: [
      '[data-testid="sidebarColumn"]',      // Trends and Who to follow
      '[aria-label="Timeline: Trending now"]',
    ],
    note:
      'Rail keeps Profile, Explore, Notifications, History, Post and More. ' +
      'Explore is allowed here because on X it is the search surface, unlike ' +
      'Instagram where /explore is a discover grid. The reply timeline under ' +
      'a status is infinite but stays, since removing it breaks reading a ' +
      'thread. Backing out of a post hits /home, which bounces to your profile.',
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
    id: 'linkedin',
    loginUrl: 'https://www.linkedin.com/login',
    label: 'LinkedIn',
    hosts: ['linkedin.com', 'www.linkedin.com'],
    landing: '/in/caguilar0/',
    always: [
      '/login(/.*)?', '/logout(/.*)?', '/uas/login(/.*)?',
      '/checkpoint(/.*)?', '/psettings(/.*)?',
    ],
    allow: [
      '/in/[^/]+(/.*)?',              // profiles, including your own
      '/search/.*',
      '/notifications(/.*)?',
      '/messaging(/.*)?',
      '/posts/[^/]+(/.*)?',           // a single post someone linked you
      '/feed(/.*)?',                  // reachable, but only by typing it: the
                                      // Home button is removed from the nav
      '/mynetwork(/.*)?',
      '/company/[^/]+(/.*)?',
      '/jobs(/.*)?',
    ],
    deny: ['/', '/games(/.*)?'],

    // Only Home goes. LinkedIn bakes notification counts into the label
    // ("Home, 1 new notification"), so these are matched as a prefix.
    pruneNav: {
      remove: ['Home'],
    },

    hide: [
      '#msg-overlay',                 // the persistent messaging dock
    ],
    note:
      'The feed is allowed but unreachable by clicking -- the Home button is ' +
      'pruned from the nav, so getting there means typing the URL. Same ' +
      'shape as Explore on Instagram: intent is the price of entry. The ' +
      'root still redirects to your profile, so the reflex visit lands there.',
  },

  {
    id: 'twitch',
    loginUrl: 'https://www.twitch.tv/login',
    label: 'Twitch',
    hosts: ['twitch.tv', 'www.twitch.tv', 'm.twitch.tv'],
    landing: '/christianships',
    always: ['/login(/.*)?', '/logout(/.*)?', '/signup(/.*)?'],

    // Deliberately unrestricted. The only rule here is where the front door
    // opens: nothing is blocked once you are inside, because Twitch is a place
    // you go to broadcast rather than one you fall into.
    allow: ['(/.*)?'],
    deny: [],
    hide: [],
    note:
      'Landing-only. No routes are denied and nothing is hidden -- the whole ' +
      'policy is the redirect from the root to your channel.',
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
