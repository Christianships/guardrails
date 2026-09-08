// The start page's hand-edited half.
//
// The Socials row is NOT here -- it is derived from policy/sites.js, so every
// tile points at that site's declared `landing`. One list, not two: add a site
// to the policy and it appears here automatically, change a handle and the
// tile follows.
//
// Tiles: { label, url, icon?, color? }
//   icon   Filename in extension/icons/. Omit it and you get a letter tile,
//          which is the placeholder state -- swap icons in one at a time.
//   color  Background for the letter tile. Ignored once `icon` is set.

export const search = {
  label: 'Search…',
  action: 'https://search.brave.com/search',
  param: 'q',
}

export const categories = [
  {
    id: 'dev',
    label: 'Dev',
    tiles: [
      { label: 'Cloudflare', url: 'https://dash.cloudflare.com', color: '#f6821f' },
      { label: 'Supabase', url: 'https://supabase.com/dashboard', color: '#3ecf8e' },
      { label: 'Proton Mail', url: 'https://mail.proton.me', color: '#6d4aff' },
      { label: 'Gmail', url: 'https://mail.google.com', color: '#ea4335' },
    ],
  },
]

// Socials are appended from policy/sites.js at build time under this heading.
export const socialsLabel = 'Socials'
