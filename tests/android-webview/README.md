# Offline Android WebView regression harness

Candidate test infrastructure only. Copy these source files to
`tests/android-webview/` and merge `job.yml` under the existing validation
workflow's `jobs:`. No production publication is part of this job.

The SDK-only Java Activity serves every HTTP(S) request from APK assets or
returns an empty 404. It never contacts Google. The same complete built
userscript that will be released runs in Android WebView, with a frozen v6.53
control. Controlled HTML reproduces three complete organic entries inside a
group that has only a final divider. It is modeled on the screenshot, not a
captured Berry/Google DOM. Injection occurs at the end of the initial fixture
body; this does not reproduce the userscript manager's document-start timing.

The host runner captures the actual emulator compositor with `adb screencap`,
then counts painted divider bands between the four intact results. It requires
the old control to have exactly two omissions, and the candidate to paint one
8 CSS px band at every boundary. Pages 2/3, light/dark themes, and mixed versus
plain-div title shapes are checked (16 scenarios). The shared controlled DOM is
generated from `tests/fixtures/google-organic-groups.mjs`. Title, text,
destinations, thumbnail source/size, first-page DOM, horizontal overflow and
script errors are also checked. Screenshots, geometry, WebView package/version, script hashes
and logcat are uploaded even if a test fails.

This uses Android API 35 and its installed WebView. It is **not** Android 17,
Galaxy S26 Ultra, Berry Browser, AdGuard or live Google testing. It complements
the broader Chromium suite; it does not prove those untested environments.

Build prerequisites are SDK Platform 35, Build Tools 35.0.0, Java, Node, Python
and Pillow. Ubuntu 24.04 is pinned because `ubuntu-latest` is changing to 26.04
in November 2026. Public GitHub hosted Ubuntu runners provide the SDK; the
emulator action installs its system image. The debug signing key is generated
only in the runner's temporary build directory and is not uploaded.

Primary references checked when creating this candidate:

- https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md
- https://github.com/ReactiveCircus/android-emulator-runner
- https://developer.android.com/tools/d8
- https://developer.android.com/tools/apksigner
- https://developer.android.com/reference/android/webkit/WebViewClient
- https://developer.android.com/develop/ui/views/layout/webapps/load-local-content
