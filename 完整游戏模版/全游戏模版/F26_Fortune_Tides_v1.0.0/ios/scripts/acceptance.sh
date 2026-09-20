#!/bin/sh
# Runs against an already-built Debug app. Uses and modifies this simulator's save.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
DEVICE=${1:?Pass a booted simulator UUID}
LABEL=${2:-acceptance}
BUNDLE=local.f26.fortunetides
EVIDENCE="$ROOT/ios/evidence/$LABEL"
mkdir -p "$EVIDENCE"
launch_app() {
  OUTPUT=$(xcrun simctl launch "$DEVICE" "$BUNDLE" "$@")
  echo "$OUTPUT"
  APP_PID=${OUTPUT##*: }
}
xcrun simctl install "$DEVICE" "$ROOT/ios/build/Build/Products/Debug-iphonesimulator/FortuneTides.app"
xcrun simctl terminate "$DEVICE" "$BUNDLE" 2>/dev/null || true
launch_app --native-smoke
capture_logs() {
  xcrun simctl spawn "$DEVICE" log show --last 5m --predicate 'process == "FortuneTides" AND eventMessage CONTAINS "F26_"' --style compact 2>/dev/null | grep -F "FortuneTides[$APP_PID:" > "$EVIDENCE/native-$APP_PID.log" || true
  cat "$EVIDENCE"/native-*.log > "$EVIDENCE/native.log"
}
wait_log() {
  NEEDLE=$1
  COUNT=0
  while [ "$COUNT" -lt 45 ]; do
    capture_logs
    if grep -F "$NEEDLE" "$EVIDENCE/native.log" >/dev/null; then return; fi
    if grep -F 'SMOKE failure(' "$EVIDENCE/native.log" >/dev/null; then cat "$EVIDENCE/native.log"; exit 1; fi
    sleep 1
    COUNT=$((COUNT+1))
  done
  cat "$EVIDENCE/native.log"
  echo "Timed out waiting for $NEEDLE" >&2
  exit 1
}
wait_log 'F26_GAMEPLAY_SMOKE success('
xcrun simctl io "$DEVICE" screenshot "$EVIDENCE/lobby.png"
xcrun simctl terminate "$DEVICE" "$BUNDLE"
launch_app --native-verify
wait_log 'F26_PERSISTENCE_SMOKE success('
xcrun simctl terminate "$DEVICE" "$BUNDLE"
launch_app --native-background
wait_log 'F26_BACKGROUND_READY'
xcrun simctl launch "$DEVICE" com.apple.Preferences
wait_log 'state":"inactive'
xcrun simctl launch "$DEVICE" "$BUNDLE"
sleep 2
capture_logs
xcrun simctl io "$DEVICE" screenshot "$EVIDENCE/resumed-game.png"
python3 - "$EVIDENCE/native.log" <<'PY'
import re,json,sys
text=open(sys.argv[1]).read()
ready=re.findall(r'F26_BACKGROUND_READY Optional\((\{.*?\})\)',text)
events=[json.loads(x) for x in re.findall(r'F26_LIFECYCLE Optional\((\{.*?\})\)',text)]
assert ready, 'background test never started'
initial=json.loads(ready[-1])
assert initial['busy'] is True, 'background test missed active spin'
inactive=[e for e in events if e.get('state')=='inactive' and e.get('coins')==initial['coins'] and e.get('spins')==initial['spins']]
assert inactive and inactive[-1]['busy'] is False, 'background failed to settle spin'
last=events[-1]
assert last['state']=='active' and last['hidden'] is False and last['busy'] is False, 'foreground did not resume settled game'
assert last['coins']==initial['coins'] and last['spins']==initial['spins'], 'background duplicated or lost wallet commit'
print('PASS: four games, back navigation, process-restart persistence, mid-spin background/foreground with unchanged settled wallet')
PY
