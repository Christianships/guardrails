const params = new URLSearchParams(location.search)
const site = params.get('site')
const from = params.get('from')

document.getElementById('detail').textContent = site
  ? `This route on ${site} isn't one you declared worth keeping. Edit policy/sites.js if that was wrong.`
  : `This route isn't on the allowlist.`

document.getElementById('route').textContent = from ?? ''
