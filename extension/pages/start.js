// Renders the start page from generated/start-data.js. Plain DOM calls on
// purpose -- this runs on every new tab, so there is no framework to boot.

const { search, categories } = globalThis.START

const input = document.getElementById('q')
input.placeholder = search.label

document.getElementById('search').addEventListener('submit', (event) => {
  event.preventDefault()
  const query = input.value.trim()
  if (!query) return
  const url = new URL(search.action)
  url.searchParams.set(search.param, query)
  location.href = url.toString()
})

const ARROW = {
  left: 'M15 4 7 12l8 8',
  right: 'M9 4l8 8-8 8',
}

function control(className, { label, path, text } = {}) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `ctl ${className}`
  if (label) button.setAttribute('aria-label', label)
  if (text) button.textContent = text
  if (path) {
    button.innerHTML =
      `<svg viewBox="0 0 24 24"><path d="${path}"/></svg>`
  }
  return button
}

// A deterministic identity for tiles whose icon download failed.
const initials = (label) =>
  label.split(/[\s.]+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

const container = document.getElementById('categories')

for (const category of categories) {
  const section = document.createElement('section')

  const head = document.createElement('div')
  head.className = 'head'
  const heading = document.createElement('h2')
  heading.textContent = category.label
  head.append(heading)

  const grid = document.createElement('div')
  grid.className = 'tiles'

  for (const tile of category.tiles) {
    const link = document.createElement('a')
    link.className = 'tile'
    link.href = tile.url
    link.title = tile.url

    const glyph = document.createElement('span')
    glyph.className = 'glyph'
    if (tile.icon) {
      glyph.classList.add('has-icon')
      const img = document.createElement('img')
      img.src = `../icons/${tile.icon}`
      img.alt = ''
      img.loading = 'eager'
      // If the file is missing or corrupt, fall back rather than show a
      // broken-image box.
      img.addEventListener('error', () => {
        glyph.classList.remove('has-icon')
        glyph.textContent = initials(tile.label)
        if (tile.color) glyph.style.setProperty('--tile-color', tile.color)
      })
      glyph.append(img)
    } else {
      if (tile.color) glyph.style.setProperty('--tile-color', tile.color)
      glyph.textContent = initials(tile.label)
    }

    const label = document.createElement('span')
    label.className = 'label'
    label.textContent = tile.label

    link.append(glyph, label)
    grid.append(link)
  }

  const left = control('left', { label: `Scroll ${category.label} left`, path: ARROW.left })
  const right = control('right', { label: `Scroll ${category.label} right`, path: ARROW.right })
  const more = control('more', { text: 'More' })
  head.append(left, right, more)

  const page = (direction) => {
    // Scroll by whole tiles so a row never stops mid-icon.
    const step = Math.max(1, Math.floor(grid.clientWidth / 88)) * 88
    grid.scrollBy({ left: direction * step })
  }
  left.addEventListener('click', () => page(-1))
  right.addEventListener('click', () => page(1))

  const syncArrows = () => {
    const expanded = grid.classList.contains('expanded')
    const overflowing = grid.scrollWidth > grid.clientWidth + 1
    for (const button of [left, right]) button.hidden = expanded || !overflowing
    if (expanded || !overflowing) return
    left.disabled = grid.scrollLeft <= 0
    right.disabled = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 1
  }

  more.addEventListener('click', () => {
    const expanded = grid.classList.toggle('expanded')
    more.textContent = expanded ? 'Less' : 'More'
    if (expanded) grid.scrollLeft = 0
    syncArrows()
  })

  grid.addEventListener('scroll', syncArrows, { passive: true })
  addEventListener('resize', syncArrows)

  section.append(head, grid)
  container.append(section)

  // After layout, so scrollWidth is real.
  requestAnimationFrame(() => {
    syncArrows()
    // Nothing to expand if it already fits on one row.
    more.hidden = grid.scrollWidth <= grid.clientWidth + 1
  })
}
