# Offline Android WebView regression harness

## v6.60 root-level results from the supplied diagnosis

The Android job in `.github/workflows/google-root-results-6.60.yml` runs the
focused v6.60 command using the root-sibling structure identified in the
user's v6.59 diagnostic. It is a controlled reconstruction of those measured
wrappers and gaps, not captured Google HTML. It preserves the 499.78125 CSS px
source width, independent transparent `.MjjYud` siblings, opaque nested
`.Ww4FFb` surfaces with an 8px bottom margin, and a base-domain site label plus
subdomain URL in one source header.

```bash
bash tests/android-webview/build.sh "$PWD" /tmp/autopager-webview-build
python3 tests/android-webview/run-root-results.py /tmp/autopager-webview-build /tmp/autopager-root-results-evidence
```

The APK selects this fixture family with `--es fixture root`; the original
organic fixture remains available. The root runner uses the complete candidate
userscript and frozen v6.59 control. Missing versus already painted gutters,
light/dark themes, and pages 2/3 give 16 screenshots. The shared renderer is
`tests/fixtures/google-root-results.mjs`. An emulator density of 345 at a 1080px
screen width gives approximately 501 CSS px, allowing the reconstructed root
to retain its measured 499.78px width. Pixel coordinates always use the actual
reported WebView origin and viewport width.

The frozen control must paint zero separator pixels for each missing gap and
one 8px band for each existing gutter. The candidate must paint exactly one
8px band at every tested boundary. The actual gaps must remain 8px, every
candidate card rectangle must match the frozen control, and no band may cut
through a result. These checks reject doubled spacing, duplicate bands, or a
border added inside the title/source anchor. Titles, descriptions, destinations,
thumbnail source/size, initial-page markup and absence of horizontal overflow
are also required.

Every ready report waits for the WebView visual state and the subsequent
Android frame submission. The compositor can present that frame later, so the
runner retains each screenshot attempt and waits up to five seconds for the
same strict pixel assertions to pass. It does not lower any divider threshold.
Failures are collected while the remaining cases continue. Screenshots,
geometry, script versions/SHA-256 hashes, provider details and logcat are saved.
This remains an API 35 emulator WebView test, not Android 17, Berry or live
Google validation.

## Original grouped-result fixture

The Android job in `.github/workflows/google-organic-6.58.yml` runs this
integrated validation harness. No production publication is part of this job.
On a machine with the SDK and a running emulator, the equivalent commands are:

```bash
bash tests/android-webview/build.sh "$PWD" /tmp/autopager-webview-build
python3 tests/android-webview/run.py /tmp/autopager-webview-build /tmp/autopager-webview-evidence
```

The SDK-only Java Activity serves every HTTP(S) request from APK assets or
returns an empty 404. It never contacts Google. The same complete built
userscript that will be released runs in Android WebView, with a frozen v6.53
control. Controlled HTML reproduces three complete organic entries inside a
group that has only a final divider. It is modeled on the screenshot, not a
captured Berry/Google DOM. The complete userscript is injected at the start of
the initial fixture's head, before its result DOM is parsed. This models early
injection without reproducing a particular userscript manager's implementation.

The host runner captures the actual emulator compositor with `adb screencap`,
then counts painted divider bands between the four intact results. It requires
the old control to have exactly two omissions, and the candidate to paint one
8 CSS px band at every boundary. Pages 2/3, light/dark themes, and mixed versus
plain-div title shapes are checked (16 scenarios). The shared controlled DOM is
generated from `tests/fixtures/google-organic-groups.mjs`. Title, text,
destinations, thumbnail source/size, first-page DOM, horizontal overflow and
script errors are also checked. Screenshots, geometry, WebView package/version, script hashes
and logcat are uploaded even if a test fails.
Candidate cases run before frozen controls. Individual page failures are saved
and the remaining cases still run, then any failure fails the job. Zero-size
results are reported as missing rendering, with ancestor computed styles and
bounded container HTML in the geometry report; they are not treated as an image
loading or divider-size failure. All original pixel assertions remain strict.

The Activity leaves Android's navigation bar visible and hides only its status
bar, so the first-run immersive-mode confirmation does not cover the test.
Screenshot coordinates use the recorded WebView origin and dimensions. Known
blank background pixels are checked before divider colors, rejecting dimmed or
obscured captures without weakening the expected divider color/size checks.

This uses Android API 35 and its installed WebView. It is **not** Android 17,
Galaxy S26 Ultra, Berry Browser, AdGuard or live Google testing. It complements
the broader Chromium suite; it does not prove those untested environments.

## Diagnostic dialog smoke test

The v6.59 diagnostic addition has a separate, single-scenario UI command. Build
the complete candidate, start an API 35 emulator, then run:

```bash
bash tests/android-webview/build.sh "$PWD" /tmp/autopager-webview-build
python3 tests/android-webview/run-diagnostics.py /tmp/autopager-webview-build /tmp/autopager-diagnostic-evidence
```

This command waits for the existing page-2 ready report on the current, mixed
title, light fixture, and checks that all four results are rendered and intact.
Only then does its probe remove the fixture's status-hiding stylesheet. It adds
synthetic private query/hash and form-value sentinels and saves the source DOM
baseline. It does not open the dialog or simulate browser events in JavaScript.

Actual `adb input` touches verify normal tap pauses, a second tap resumes,
a 1300 ms long press opens the diagnostic dialog, and its close button closes
it. Touch coordinates come from the live WebView geometry and screen origin.
An Activity intent calls a read-only probe through `evaluateJavascript` to save
the textarea content and UI state; requests have distinct IDs so stale reports
cannot pass. The Activity waits for `WebView.postVisualStateCallback` and the
following Android frame-commit callback before making each probe report ready.
The compositor may present that submitted frame later, so the runner waits up
to five seconds for actual screencap pixels in the inner dialog panel to pass
the unchanged difference threshold, saving every attempt. A DOM-visible dialog
alone cannot pass. This addresses the observed race where the first screencap
still showed the old page while the immediately following failure capture
already showed the complete dialog.

The report must identify the candidate version recorded in the build manifest
(the diagnostic JSON schema remains v659) and imported page 2, include four
sources/records/cards and the expected three pair reasons, and omit all private
sentinels, URL queries and fragments. The form values, initial result, imported
markup, scroll position and pager state must remain intact through open/close.

The runner saves actual emulator PNGs before/after the touches, requires the
dialog to change compositor pixels inside its visible bounds, and saves the
diagnostic JSON, probe state, environment, script hash, logcat and failures.
This is a diagnostic UI smoke test; it does not repeat the sixteen divider
paint scenarios or establish behavior on a live Google/Berry page.

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
- https://developer.android.com/reference/android/webkit/WebView#postVisualStateCallback(long,%20android.webkit.WebView.VisualStateCallback)
- https://developer.android.com/reference/android/view/ViewTreeObserver#registerFrameCommitCallback(java.lang.Runnable)
- https://developer.android.com/develop/ui/views/layout/webapps/load-local-content
- https://developer.android.com/develop/ui/views/layout/immersive
