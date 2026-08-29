#!/bin/zsh
set -e

PROJECT_DIR="/Users/xzkj/Desktop/S03_5x3_HoldAndWin_Astral_v1.0.0"
BUILD_DIR="$PROJECT_DIR/build/web-mobile"
PORT=8103

if [[ ! -f "$BUILD_DIR/index.html" ]]; then
  osascript -e 'display dialog "Web build not found. Open S03 Astral Vault in Cocos Creator 3.8.8 and build Web Mobile first." buttons {"OK"} default button "OK"'
  exit 1
fi

cd "$BUILD_DIR"
python3 -m http.server "$PORT" >/tmp/s03-astral-vault-server.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM
sleep 1
open "http://127.0.0.1:$PORT/?s03-hold-win-v1"
echo "S03 Astral Vault is running at http://127.0.0.1:$PORT/"
echo "Keep this window open while playing. Press Control-C to stop."
wait "$SERVER_PID"
