#!/bin/sh
set -eu
source_root="$1"
test -n "${TARGET_BUILD_DIR:-}"
test "${WRAPPER_NAME:-}" = "FortuneConservatoryH5.app"
destination="${TARGET_BUILD_DIR}/${WRAPPER_NAME}/web"
/bin/mkdir -p "$destination"
test -f "$source_root/index.html"
# Synchronize only generated app/web assets, removing obsolete files from incremental builds.
/usr/bin/rsync -a --delete --exclude ios-wrapper --exclude reports "$source_root/" "$destination/"
