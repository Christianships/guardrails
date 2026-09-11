// The start page's hand-edited half.
//
// The Socials row is NOT here -- it is derived from policy/sites.js so every
// tile points at that site's declared `landing`. One list, not two.
//
// Tiles: { label, url, color? }
//   color  Backs the letter tile used until an icon is fetched.
//   Icons are downloaded from each site by `node tools/fetch-icons.mjs` and
//   attached at build time, so there is nothing to set by hand here.

export const search = {
  label: 'Search…',
  action: 'https://search.brave.com/search',
  param: 'q',
}

export const categories = [
  {
    id: 'work',
    label: 'Work',
    tiles: [
      { label: 'Gmail', url: 'https://mail.google.com', color: '#ea4335' },
      { label: 'Proton Mail', url: 'https://mail.proton.me', color: '#6d4aff' },
      { label: 'GitHub', url: 'https://github.com', color: '#181717' },
      { label: 'Claude', url: 'https://claude.ai', color: '#d97757' },
      { label: 'ChatGPT', url: 'https://chatgpt.com', color: '#10a37f' },
      { label: 'Obsidian', url: 'https://obsidian.md', color: '#7c3aed' },
    ],
  },
  {
    id: 'dev',
    label: 'Dev',
    // Drawn from what is actually configured on this machine -- neonctl,
    // the Cloudflare skills, ~/.config/solana, the Expo references, gh and
    // the Figma keybind -- plus the services you named.
    tiles: [
      { label: 'Cloudflare', url: 'https://dash.cloudflare.com', color: '#f6821f' },
      { label: 'Neon', url: 'https://console.neon.tech', color: '#00e599' },
      { label: 'Stripe', url: 'https://dashboard.stripe.com', color: '#635bff' },
      { label: 'Resend', url: 'https://resend.com/emails', color: '#000000' },
      { label: 'Mapbox', url: 'https://console.mapbox.com', color: '#4264fb' },
      { label: 'Expo', url: 'https://expo.dev', color: '#000020' },
      { label: 'Solana', url: 'https://explorer.solana.com', color: '#9945ff' },
      { label: 'Figma', url: 'https://figma.com/files', color: '#f24e1e' },
      { label: 'Vercel', url: 'https://vercel.com/dashboard', color: '#000000' },
      { label: 'npm', url: 'https://www.npmjs.com', color: '#cb3837' },
    ],
  },
]

export const socialsLabel = 'Socials'

// Row order, by site id from policy/sites.js or an extraSocials `id`.
// Anything omitted here is appended afterwards, so forgetting an id hides
// nothing.
export const socialsOrder = [
  'x', 'linkedin', 'instagram', 'tiktok', 'twitch',
  'youtube', 'reddit', 'facebook', 'threads',
]

// Tiles for sites that are NOT governed by policy/sites.js -- they get a link
// on the start page but no routing rules, no landing redirect and no pruning.
// Pinterest in particular is an infinite feed and is currently unguarded.
// An `id` slots the tile into socialsOrder like a governed site.
export const extraSocials = [
  { id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/caguilar0/', color: '#0a66c2' },
  { label: 'Pinterest', url: 'https://www.pinterest.com', color: '#e60023' },
  { label: 'Luma', url: 'https://lu.ma', color: '#111111' },
  { label: 'Partiful', url: 'https://partiful.com', color: '#ffdc4d' },
]
