#!/bin/zsh
set -eu
project_dir="${0:A:h:h}"
build_log="${TMPDIR:-/tmp}/f11-web-release.log"
build_exit=0
"/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator" --project "$project_dir" --build "configPath=$project_dir/tools/web-mobile-release-build.json" > "$build_log" 2>&1 || build_exit=$?
if ! rg -q 'build Task \(web-mobile\) Finished' "$build_log"; then
  tail -50 "$build_log"
  exit 1
fi
# Creator only installs its recognised template entries, not arbitrary PNGs.
cp "$project_dir/build-templates/web-mobile/lucky-skylight-loader-bg.png" "$project_dir/build/web-mobile/lucky-skylight-loader-bg.png"
cp "$project_dir/build-templates/web-mobile/lucky-skylight-loader-emblem.png" "$project_dir/build/web-mobile/lucky-skylight-loader-emblem.png"
echo 'F11 web build and loader images ready'
