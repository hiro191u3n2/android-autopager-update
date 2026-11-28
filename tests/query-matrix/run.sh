#!/usr/bin/env bash
set -eu -o pipefail
harness=tests/query-matrix
sdk="$ANDROID_HOME"
bt="$sdk/build-tools/35.0.0"
jarpath="$sdk/platforms/android-35/android.jar"
out="$RUNNER_TEMP/pager-compile"
mkdir -p "$out/classes" "$out/dex" evidence
"$sdk/cmdline-tools/latest/bin/sdkmanager" 'platforms;android-35' 'build-tools;35.0.0'
javac -source 8 -target 8 -bootclasspath "$jarpath" -d "$out/classes" "$harness/MainActivity.java"
jar cf "$out/classes.jar" -C "$out/classes" .
"$bt/d8" --min-api 26 --lib "$jarpath" --output "$out/dex" "$out/classes.jar"
"$bt/aapt" package -f -M tests/android-webview/AndroidManifest.xml -I "$jarpath" -F "$out/unsigned.apk"
(cd "$out/dex" && zip -q "$out/unsigned.apk" classes.dex)
"$bt/zipalign" -f 4 "$out/unsigned.apk" "$out/aligned.apk"
keytool -genkeypair -keystore "$out/test.p12" -storepass android -alias test -keypass android -dname "CN=Temporary test" -keyalg RSA -validity 3 -noprompt
"$bt/apksigner" sign --ks "$out/test.p12" --ks-pass pass:android --out "$out/pager.apk" "$out/aligned.apk"
export ANDROID_AVD_HOME="$RUNNER_TEMP/avd" ANDROID_SERIAL=emulator-5554
mkdir -p "$ANDROID_AVD_HOME"
image="$1"
package="system-images;android-$image;$2;x86_64"
"$sdk/cmdline-tools/latest/bin/sdkmanager" 'cmdline-tools;22.0' emulator platform-tools "$package"
echo no | "$sdk/cmdline-tools/22.0/bin/avdmanager" create avd --force --name pager --package "$package" --device pixel_2
"$sdk/emulator/emulator" -avd pager -port 5554 -no-window -no-audio -no-snapshot -no-boot-anim -gpu swiftshader_indirect -cores 2 -memory 3072 >evidence/emulator.log 2>&1 &
trap 'adb emu kill >/dev/null 2>&1 || true' EXIT
timeout 150 adb wait-for-device
for i in $(seq 1 100); do boot=$(adb shell getprop sys.boot_completed | tr -d '\r'); [ "$boot" != 1 ] || break; sleep 3; done
test "$boot" = 1
adb shell settings put global hide_error_dialogs 1
adb shell wm size 720x1440
adb shell wm density 320
adb shell wm dismiss-keyguard
adb shell settings put system screen_off_timeout 2147483647
adb install --no-incremental -r "$out/pager.apk"
adb shell am start -n jp.hiro.autopager.webviewtest/.MainActivity
for i in $(seq 1 45); do sock=$(adb shell cat /proc/net/unix | sed -n 's/.*@\(webview_devtools_remote_[0-9]*\).*/\1/p' | head -1 | tr -d '\r'); [ -z "$sock" ] || break; sleep 1; done
test -n "$sock"
adb forward tcp:9444 localabstract:"$sock"
adb shell dumpsys webviewupdate >evidence/provider.txt
echo '15ef8d4a0615d9d513a290a9c23a77983dad4dd25f576b0f4d96467f25fe78d0  android-generic-autopager.user.js' | sha256sum -c -
node "$harness/run-matrix.mjs" android-generic-autopager.user.js evidence/results.jsonl "$(seq -s, "$3" "$4")"
python - "$3" "$4" <<'PY'
import sys,json
rows=[json.loads(l) for l in open('evidence/results.jsonl')]
assert [r['index'] for r in rows] == list(range(int(sys.argv[1]),int(sys.argv[2])+1))
issues=[(r['index'],r['q'],r['failures']) for r in rows if r['failures']]
print('QA_RESULT',json.dumps({'count':len(rows),'issues':issues},ensure_ascii=False))
assert not issues, issues
PY
