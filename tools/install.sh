#!/bin/bash
# Installs Guardrails at the system level. Run with sudo.
#
#   sudo ~/Developer/Guardrails/tools/install.sh
#
# Two mechanisms, deliberately. The external-extensions manifest performs the
# actual install from a local file, so no update server has to exist. The
# configuration profile then marks the extension force_installed, which is what
# removes the toggle and the trash can from chrome://extensions. Either alone
# is insufficient: the manifest installs something you could still delete, and
# the policy locks something that might never arrive.
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "run with sudo" >&2; exit 1; }

# Chromium will not fetch an extension update manifest over file://, so the
# --http mode serves the same two files from a root LaunchDaemon bound to
# loopback. Nothing is exposed off the machine.
TRANSPORT=file
[[ "${1:-}" == "--http" ]] && TRANSPORT=http
PORT=47823

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ID="$(cat "$REPO/dist/extension-id.txt")"
DEST="/Library/Application Support/Guardrails"
# Helium derives its per-user data dir from its bundle id (net.imput.helium)
# but its GLOBAL Application Support dir is still "Chromium" -- confirmed by
# strings in the framework binary. Write all three candidates; extras are inert.
EXTERNAL_DIRS=(
  "/Library/Application Support/Chromium/External Extensions"
  "/Library/Application Support/Helium/External Extensions"
  "/Library/Application Support/net.imput.helium/External Extensions"
)
VERSION="$(python3 -c "import json;print(json.load(open('$REPO/extension/manifest.json'))['version'])")"

echo "==> building"
sudo -u "$SUDO_USER" node "$REPO/build/build.mjs"

echo "==> packing $ID v$VERSION"
rm -f "$REPO/extension.crx"
sudo -u "$SUDO_USER" "/Applications/Helium.app/Contents/MacOS/Helium" \
  --pack-extension="$REPO/extension" \
  --pack-extension-key="$REPO/dist/guardrails.pem" --no-message-box >/dev/null 2>&1 || true
[[ -f "$REPO/extension.crx" ]] || { echo "pack failed" >&2; exit 1; }
mv -f "$REPO/extension.crx" "$REPO/dist/guardrails.crx"

echo "==> staging into $DEST (root-owned)"
mkdir -p "$DEST" "${EXTERNAL_DIRS[@]}"
install -m 644 -o root -g wheel "$REPO/dist/guardrails.crx" "$DEST/guardrails.crx"

if [[ $TRANSPORT == http ]]; then
  CODEBASE="http://127.0.0.1:$PORT/guardrails.crx"
else
  # codebase is a URL, so the space in "Application Support" must be escaped
  CODEBASE="file:///Library/Application%20Support/Guardrails/guardrails.crx"
fi

cat > "$DEST/update.xml" <<XML
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='$ID'>
    <updatecheck codebase='$CODEBASE' version='$VERSION' />
  </app>
</gupdate>
XML
chown root:wheel "$DEST/update.xml"; chmod 644 "$DEST/update.xml"

for dir in "${EXTERNAL_DIRS[@]}"; do
  cat > "$dir/$ID.json" <<JSON
{
  "external_crx": "$DEST/guardrails.crx",
  "external_version": "$VERSION"
}
JSON
  chown root:wheel "$dir/$ID.json"; chmod 644 "$dir/$ID.json"
done

if [[ $TRANSPORT == http ]]; then
  echo "==> installing update-server LaunchDaemon on 127.0.0.1:$PORT"
  install -m 644 -o root -g wheel \
    "$REPO/tools/com.guardrails.updateserver.plist" \
    /Library/LaunchDaemons/com.guardrails.updateserver.plist
  launchctl bootout system/com.guardrails.updateserver 2>/dev/null || true
  launchctl bootstrap system /Library/LaunchDaemons/com.guardrails.updateserver.plist
  sleep 1
  if curl -fsS "http://127.0.0.1:$PORT/update.xml" >/dev/null; then
    echo "    serving ok"
  else
    echo "    WARNING: server not responding; check /var/log/guardrails-updateserver.log" >&2
  fi
fi

echo "==> regenerating profile ($TRANSPORT transport)"
sudo -u "$SUDO_USER" env GUARDRAILS_TRANSPORT="$TRANSPORT" node "$REPO/tools/make-profile.mjs"

echo
echo "Staged. Two steps left, both yours:"
echo "  1. open $REPO/dist/Guardrails.mobileconfig"
echo "     then System Settings > General > Device Management > install it."
echo "     (macOS will not let a non-MDM profile install from the CLI.)"
echo "  2. fully quit Helium (Cmd-Q) and reopen it. Policy is read at startup."
echo
echo "Then verify:  $REPO/tools/verify.sh"
