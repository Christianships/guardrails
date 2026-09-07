// Emits the .mobileconfig that makes Helium treat Guardrails as an
// administrator-installed extension.
//
// macOS only honours Chromium policy as MANDATORY when it arrives through
// /Library/Managed Preferences/, which is what installing a configuration
// profile does. A plain `defaults write` to the same key is read at
// RECOMMENDED level and force_installed is ignored -- verified on this machine.

import { readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const id = readFileSync(join(root, 'dist', 'extension-id.txt'), 'utf8').trim()

// Root-owned, outside $HOME: undoing this should require deliberate terminal
// work, not a Finder drag.
const INSTALL_DIR = '/Library/Application Support/Guardrails'
const updateUrl = `file://${INSTALL_DIR.replace(/ /g, '%20')}/update.xml`

const plist = (v, indent = '\t') => {
  if (Array.isArray(v))
    return `<array>\n${v.map((x) => indent + '\t' + plist(x, indent + '\t')).join('\n')}\n${indent}</array>`
  if (v && typeof v === 'object')
    return `<dict>\n${Object.entries(v)
      .map(([k, val]) => `${indent}\t<key>${k}</key>\n${indent}\t${plist(val, indent + '\t')}`)
      .join('\n')}\n${indent}</dict>`
  if (typeof v === 'boolean') return v ? '<true/>' : '<false/>'
  if (typeof v === 'number') return `<integer>${v}</integer>`
  return `<string>${String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</string>`
}

const payload = {
  PayloadType: 'net.imput.helium', // Helium's policy domain == its bundle id
  PayloadVersion: 1,
  PayloadIdentifier: 'dev.guardrails.helium.policy',
  PayloadUUID: randomUUID().toUpperCase(),
  PayloadDisplayName: 'Helium Extension Policy',
  ExtensionSettings: {
    [id]: {
      installation_mode: 'force_installed',
      update_url: updateUrl,
      toolbar_pin: 'force_pinned',
    },
  },
}

const profile = {
  PayloadType: 'Configuration',
  PayloadVersion: 1,
  PayloadIdentifier: 'dev.guardrails.helium',
  PayloadUUID: randomUUID().toUpperCase(),
  PayloadDisplayName: 'Guardrails',
  PayloadOrganization: 'Guardrails',
  PayloadDescription:
    'Installs the Guardrails extension in Helium and prevents it being removed.',
  PayloadScope: 'System',
  // Requested explicitly: no Remove button in System Settings.
  // See README "Getting out" before installing.
  PayloadRemovalDisallowed: true,
  PayloadContent: [payload],
}

writeFileSync(
  join(root, 'dist', 'Guardrails.mobileconfig'),
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
${plist(profile)}
</plist>
`,
)
console.log(`profile written for extension ${id}`)
