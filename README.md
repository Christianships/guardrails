# Guardrails

A route allowlist for sites that are otherwise infinite, installed into Helium
as an administrator-managed extension so it cannot be switched off from the UI.

## How it works

`policy/sites.js` is the only file you hand-edit. `node build/build.mjs`
compiles it into everything else, because a blocked navigation has to be caught
at three different moments:

| Output | Catches | Why it alone is not enough |
|---|---|---|
| `generated/rules.json` | real `main_frame` loads, before the network request | Instagram navigates via `pushState`; no request is ever made |
| `content/guard.js` | in-page route changes, and context ("did you arrive from a profile?") | runs after the page exists, so it cannot pre-empt a cold load |
| `generated/hide.css` | furniture on pages you *are* allowed to see | cannot stop a navigation |

Rules are an **allowlist**: you declare the routes worth keeping and everything
else redirects. A denylist always lags — when a site ships a new infinite
surface it is unblocked by default until you happen to notice.

## Why it cannot be turned off

Helium is Chromium 152 and reads enterprise policy from the `net.imput.helium`
preference domain. macOS only treats that domain as **mandatory** policy when it
arrives via `/Library/Managed Preferences/`, which is what installing a
configuration profile does. A plain `defaults write` to the identical key is
read at *recommended* level and `force_installed` is silently ignored — this was
tested, it does not work.

So `dist/Guardrails.mobileconfig` carries an `ExtensionSettings` payload marking
the extension `force_installed`. Helium then shows it as "Installed by
enterprise policy" with no toggle and no remove button. The profile also sets
`PayloadRemovalDisallowed`, so System Settings shows no Remove button either.

The extension ID (`dist/extension-id.txt`) is a pure function of the signing key
in `dist/guardrails.pem` — SHA-256 of the DER public key, first 16 bytes,
hex-shifted into `a`–`p`. **Keep that key.** Lose it and the ID changes, the
policy no longer matches, and you must reinstall the profile.

## Install

    sudo tools/install.sh          # build, pack, stage root-owned files
    open dist/Guardrails.mobileconfig   # then System Settings > Device Management
    # fully quit and reopen Helium — policy is read at startup
    tools/verify.sh

## Getting out

There is no GUI path out; that is the point. There is still a terminal path,
because a policy bug should never be able to brick your browser:

    sudo rm -rf "/Library/Application Support/Guardrails"
    sudo rm -f "/Library/Application Support/Helium/External Extensions/"*.json
    sudo profiles remove -identifier dev.guardrails.helium   # may refuse; see below

`PayloadRemovalDisallowed` can make the last command fail. If it does, the
profile store lives in `/var/db/ConfigurationProfiles/` and is editable from
Recovery mode (boot holding the power button → Options → Terminal). Deleting the
staged files above already neuters the extension even while the profile remains,
since the policy will point at a CRX that no longer exists.

## Changing the rules

Edit `policy/sites.js`, bump `version` in `extension/manifest.json`, then rerun
`sudo tools/install.sh`. The version bump matters: Chromium will not re-read a
CRX whose version it already has.
