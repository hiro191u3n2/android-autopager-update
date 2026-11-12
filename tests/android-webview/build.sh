#!/usr/bin/env bash
set -euo pipefail
harness_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd -- "${1:-.}" && pwd)"
build_dir="${2:-$harness_dir/build}"
sdk_dir="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
test -n "$sdk_dir"
android_jar="$sdk_dir/platforms/android-35/android.jar"
build_tools="$sdk_dir/build-tools/35.0.0"
test -f "$android_jar"
test -x "$build_tools/aapt"
mkdir -p "$build_dir/assets" "$build_dir/classes" "$build_dir/dex"
node "$harness_dir/make-assets.mjs" "$project_dir" "$build_dir/assets"
javac -encoding UTF-8 -source 8 -target 8 -bootclasspath "$android_jar" \
  -d "$build_dir/classes" "$harness_dir/MainActivity.java"
jar cf "$build_dir/classes.jar" -C "$build_dir/classes" .
"$build_tools/d8" --min-api 26 --lib "$android_jar" --output "$build_dir/dex" "$build_dir/classes.jar"
"$build_tools/aapt" package -f -M "$harness_dir/AndroidManifest.xml" -I "$android_jar" \
  -A "$build_dir/assets" -F "$build_dir/unsigned.apk"
python3 - "$build_dir" <<'PY'
import pathlib, sys, zipfile
build = pathlib.Path(sys.argv[1])
with zipfile.ZipFile(build / 'unsigned.apk', 'a') as archive:
    archive.write(build / 'dex/classes.dex', 'classes.dex')
PY
"$build_tools/zipalign" -f 4 "$build_dir/unsigned.apk" "$build_dir/aligned.apk"
if [ ! -f "$build_dir/test.keystore" ]; then
  keytool -genkeypair -keystore "$build_dir/test.keystore" -storepass android -keypass android \
    -alias androidtest -dname 'CN=Ephemeral fixture test' -keyalg RSA -validity 7 -noprompt
fi
"$build_tools/apksigner" sign --ks "$build_dir/test.keystore" --ks-key-alias androidtest \
  --ks-pass pass:android --key-pass pass:android --out "$build_dir/webview-fixture-test.apk" "$build_dir/aligned.apk"
"$build_tools/apksigner" verify "$build_dir/webview-fixture-test.apk"
