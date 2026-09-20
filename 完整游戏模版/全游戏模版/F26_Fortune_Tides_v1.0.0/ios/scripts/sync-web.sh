#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"
node tools/build.mjs
mkdir -p ios/FortuneTides/Web
rsync -a --delete dist/ ios/FortuneTides/Web/
