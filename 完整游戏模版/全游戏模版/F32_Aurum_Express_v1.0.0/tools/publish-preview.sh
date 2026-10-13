#!/usr/bin/env bash
# Publish the latest Cocos web build to a location readable by a launchd preview server.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/build/web-mobile"
DEST="$HOME/Library/Caches/F32-Aurum-Express-Preview"
PLIST="$HOME/Library/LaunchAgents/com.f32.aurum-express.preview.plist"
LABEL="com.f32.aurum-express.preview"
PORT="${F32_PREVIEW_PORT:-5034}"

[[ -f "$BUILD/index.html" ]] || { echo "Missing $BUILD/index.html; build web-mobile first." >&2; exit 1; }
mkdir -p "$DEST" "$(dirname "$PLIST")"
rsync -a --delete "$BUILD/" "$DEST/"
cp "$ROOT/tools/preview_server.py" "$DEST/preview_server.py"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array>
    <string>/usr/bin/python3</string><string>$DEST/preview_server.py</string>
    <string>--directory</string><string>$DEST</string>
    <string>--host</string><string>127.0.0.1</string>
    <string>--port</string><string>$PORT</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>/tmp/f32-preview.out.log</string>
  <key>StandardErrorPath</key><string>/tmp/f32-preview.err.log</string>
</dict></plist>
PLIST
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
for _ in 1 2 3 4 5; do
  if curl -fsS "http://127.0.0.1:$PORT/" -o /dev/null; then
    echo "F32 preview ready: http://127.0.0.1:$PORT/"
    exit 0
  fi
  sleep 1
done
echo "Preview did not become ready; see /tmp/f32-preview.err.log" >&2
exit 1
