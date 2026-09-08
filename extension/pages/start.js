// Renders the start page from generated/start-data.js. Kept to plain DOM calls
// on purpose -- this runs on every new tab, so there is no framework to boot.

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

// A deterministic fallback so every tile has an identity before it has an icon.
const initials = (label) =>
  label
    .split(/[\s.]+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

const container = document.getElementById('categories')

for (const category of categories) {
  const section = document.createElement('section')

  const heading = document.createElement('h2')
  heading.textContent = category.label
  section.append(heading)

  const grid = document.createElement('div')
  grid.className = 'tiles'

  for (const tile of category.tiles) {
    const link = document.createElement('a')
    link.className = 'tile'
    link.href = tile.url
    link.title = tile.url

    const glyph = document.createElement('span')
    glyph.className = 'glyph'
    if (tile.color) glyph.style.setProperty('--tile-color', tile.color)

    if (tile.icon) {
      const img = document.createElement('img')
      img.src = `../icons/${tile.icon}`
      img.alt = ''
      glyph.append(img)
    } else {
      glyph.textContent = initials(tile.label)
    }

    const label = document.createElement('span')
    label.className = 'label'
    label.textContent = tile.label

    link.append(glyph, label)
    grid.append(link)
  }

  section.append(grid)
  container.append(section)
}
