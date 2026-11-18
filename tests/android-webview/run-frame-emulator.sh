#!/usr/bin/env bash
set -euo pipefail

image_api="$1"
image_target="$2"
expected_api="$3"
build="$4"
evidence="$5"
mkdir -p "$evidence"
export ANDROID_AVD_HOME="$RUNNER_TEMP/frames-avd"
export ANDROID_SERIAL=emulator-5554
mkdir -p "$ANDROID_AVD_HOME"
sdk_bin="$ANDROID_HOME/cmdline-tools/latest/bin"
adb_bin="$ANDROID_HOME/platform-tools/adb"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
image_package="system-images;android-$image_api;$image_target;x86_64"
"$sdk_bin/sdkmanager" --install emulator platform-tools "$image_package"
echo no | "$sdk_bin/avdmanager" create avd --force --name frames --package "$image_package" --device pixel_2
config="$ANDROID_AVD_HOME/frames.avd/config.ini"
sed -i '/^disk\.dataPartition\.size=/d' "$config"
echo 'disk.dataPartition.size=6G' >> "$config"
"$ANDROID_HOME/emulator/emulator" -avd frames -port 5554 -no-window -no-boot-anim \
  -no-audio -no-snapshot -gpu swiftshader_indirect -camera-back none -camera-front none \
  -partition-size 6144 -memory 3072 -cores 2 >"$evidence/emulator.log" 2>&1 &
emulator_pid=$!
finish() {
  timeout 12 "$adb_bin" logcat -d -t 1000 >"$evidence/emulator-boot-logcat.txt" 2>&1 || true
  timeout 8 "$adb_bin" emu kill >/dev/null 2>&1 || true
  kill "$emulator_pid" 2>/dev/null || true
}
trap finish EXIT
"$adb_bin" start-server
deadline=$((SECONDS + 480))
while ((SECONDS < deadline)); do
  if ! kill -0 "$emulator_pid" 2>/dev/null; then
    tail -80 "$evidence/emulator.log"
    exit 1
  fi
  booted="$(timeout 8 "$adb_bin" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
  framework="$(timeout 8 "$adb_bin" shell pm path android 2>/dev/null | tr -d '\r' || true)"
  if [[ "$booted" == 1 && "$framework" == package:* ]]; then break; fi
  sleep 3
done
[[ "$booted" == 1 && "$framework" == package:* ]]
echo "Android API $expected_api is ready. $framework"
timeout 8 "$adb_bin" shell wm dismiss-keyguard || true
python tests/android-webview/run-mobile-frames.py "$build" "$evidence" "$expected_api"
