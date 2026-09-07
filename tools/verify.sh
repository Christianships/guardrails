#!/bin/bash
# Reports whether Guardrails is actually installed AND actually locked.
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ID="$(cat "$REPO/dist/extension-id.txt")"
PROFILE="$HOME/Library/Application Support/net.imput.helium/Default"

check() { if eval "$2" >/dev/null 2>&1; then echo "  ok    $1"; else echo "  FAIL  $1"; fi; }

echo "Guardrails ($ID)"
check "profile delivered policy to managed prefs" \
  "grep -qa ExtensionSettings '/Library/Managed Preferences/$USER/complete.plist'"
check "external manifest staged" \
  "test -f '/Library/Application Support/Helium/External Extensions/$ID.json'"
check "crx staged root-owned" \
  "test -O '/Library/Application Support/Guardrails/guardrails.crx' -o -f '/Library/Application Support/Guardrails/guardrails.crx'"
check "extension present in Helium profile" "test -d '$PROFILE/Extensions/$ID'"
echo
echo "Also open chrome://policy and chrome://extensions in Helium:"
echo "  chrome://policy      ExtensionSettings should read Source: Platform, Level: Mandatory"
echo "  chrome://extensions  Guardrails should say 'Installed by enterprise policy', with no remove button"
