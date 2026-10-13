#!/bin/sh
set -eu

source_root="$1"
destination="${TARGET_BUILD_DIR}/${WRAPPER_NAME}/web"

/bin/rm -rf "$destination"
/bin/mkdir -p "$destination"

/bin/cp -R "$source_root/assets" "$destination/assets"
/bin/cp -R "$source_root/cocos-js" "$destination/cocos-js"
/bin/cp -R "$source_root/src" "$destination/src"

for file in index.html bootstrap.js index.js application.js style.css legal.css privacy.html terms.html support.html canopy-arrival.webp canopy-brand.webp canopy-destination.webp; do
    /bin/cp "$source_root/$file" "$destination/$file"
done
