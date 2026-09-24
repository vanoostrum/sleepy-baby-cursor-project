#!/bin/bash
set -eu

apk="android/app/build/outputs/apk/release/app-release.apk"
activity="android/app/src/main/java/com/sleepybaby/app/MainActivity.kt"

if [ ! -f "$apk" ]; then
  echo "Release APK is missing: $apk"
  exit 1
fi

if ! grep -q 'getMainComponentName(): String = "main"' "$activity"; then
  echo "MainActivity does not register the main component"
  exit 1
fi

if ! grep -q 'index.android.bundle' "$activity"; then
  echo "MainActivity does not open the embedded bundle"
  exit 1
fi

listing="$(unzip -lv "$apk")"
line="$(printf '%s\n' "$listing" | grep 'assets/index.android.bundle$' || true)"

if [ -z "$line" ]; then
  echo "Release APK does not contain assets/index.android.bundle"
  exit 1
fi

echo "$line"

method="$(printf '%s\n' "$line" | awk '{print $2}')"
size="$(printf '%s\n' "$line" | awk '{print $1}')"

if [ "$method" != "Stored" ]; then
  echo "index.android.bundle is $method. MainActivity can only map an uncompressed bundle."
  exit 1
fi

if [ "$size" -lt 100000 ]; then
  echo "index.android.bundle is only $size bytes"
  exit 1
fi
