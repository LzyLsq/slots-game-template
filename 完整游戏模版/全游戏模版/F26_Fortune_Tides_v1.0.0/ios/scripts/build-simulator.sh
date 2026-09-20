#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
"$ROOT/ios/scripts/sync-web.sh"
xcodebuild -project "$ROOT/ios/FortuneTides.xcodeproj" -scheme FortuneTides -configuration Debug -sdk iphonesimulator -derivedDataPath "$ROOT/ios/build" CODE_SIGNING_ALLOWED=NO build
