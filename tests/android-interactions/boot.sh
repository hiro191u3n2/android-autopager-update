#!/usr/bin/env bash
set -eu -o pipefail
harness=tests/android-interactions
sdk="$ANDROID_HOME"
export PATH="$sdk/platform-tools:$PATH"
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
timeout 150 adb wait-for-device
for i in $(seq 1 100); do boot=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true); [ "$boot" != 1 ] || break; sleep 3; done
test "$boot" = 1
adb shell settings put global hide_error_dialogs 1
adb shell wm size 720x1440
adb shell wm density 320
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
if [ "$image" = '37.0' ]; then adb shell cmd overlay enable-exclusive --category com.android.internal.systemui.navbar.threebutton; fi
adb shell settings put system screen_off_timeout 2147483647
adb install --no-incremental -r "$out/pager.apk"
# Let the Android 17 navigation-mode change and boot-time updates finish before starting WebView.
sleep 30
adb logcat -c
adb shell am start -W -n jp.hiro.autopager.webviewtest/.MainActivity
pid=$(adb shell pidof jp.hiro.autopager.webviewtest | tr -d '\r')
test -n "$pid"
sock=webview_devtools_remote_"$pid"
for i in $(seq 1 45); do if adb shell cat /proc/net/unix | grep -F "@$sock" > /dev/null; then break; fi; sleep 1; done
adb shell dumpsys window >evidence/window.txt
adb shell dumpsys activity activities >evidence/activity.txt
adb logcat -d -t 900 >evidence/logcat.txt
adb forward tcp:9444 localabstract:"$sock"
adb shell dumpsys webviewupdate >evidence/provider.txt
