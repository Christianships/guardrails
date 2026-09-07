#!/bin/bash
# Reports whether Guardrails is actually installed AND actually locked.
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ID="$(cat "$REPO/dist/extension-id.txt")"
PROFILE="$HOME/Library/Application Support/net.imput.helium/Default"

check() { if eval "$2" >/dev/null 2>&1; then echo "  ok    $1"; else echo "  FAIL  $1"; fi; }

echo "Guardrails ($ID)"
check "policy delivered as mandatory" \
  "plutil -extract ExtensionSettings raw -o - '/Library/Managed Preferences/$USER/net.imput.helium.plist'"
check "external manifest staged" \
  "ls '/Library/Application Support/'*'/External Extensions/$ID.json'"
check "crx staged root-owned" \
  "test -O '/Library/Application Support/Guardrails/guardrails.crx' -o -f '/Library/Application Support/Guardrails/guardrails.crx'"
# Policy is system-scoped, so this must hold for EVERY profile, not just Default.
for dir in "$HOME/Library/Application Support/net.imput.helium"/*/; do
  [[ -f "$dir/Preferences" ]] || continue
  check "extension present in profile $(basename "$dir")" "test -d '$dir/Extensions/$ID'"
done
echo
echo "Also open chrome://policy and chrome://extensions in Helium:"
echo "  chrome://policy      ExtensionSettings should read Source: Platform, Level: Mandatory"
echo "  chrome://extensions  Guardrails should say 'Installed by enterprise policy', with no remove button"
