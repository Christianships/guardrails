const params = new URLSearchParams(location.search)
const id = params.get('site')
const from = params.get('from')
const site = globalThis.GUARDRAILS?.sites?.[id]

document.getElementById('detail').textContent = site
  ? `This route on ${site.label} isn't one you declared worth keeping. Edit policy/sites.js if that was wrong.`
  : `This route isn't on the allowlist.`

document.getElementById('route').textContent = from ?? ''

// Where a site's root is blocked, its sign-in page is unreachable by normal
// navigation -- you cannot log in to a site whose front door you closed. The
// login route is in that site's `always` list, so this link always works.
if (site?.loginUrl) {
  const link = document.createElement('a')
  link.className = 'button'
  link.href = site.loginUrl
  link.textContent = `Sign in to ${site.label}`
  document.getElementById('actions').append(link)
}
