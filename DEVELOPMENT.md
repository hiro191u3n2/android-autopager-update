# Recovered development source

## v6.60: root-level gaps identified by the owner's diagnostic

The owner's v6.59 report captured on 2026-11-12 identified a concrete exclusion:
three successful repair invocations found ten sources, nine records and eight
eligible cards, but added no markers. Six adjacent pairs were rejected as
`common-root`, each with an 8px gap. The imported root was transparent and about
499.78 CSS px wide. Its independent `MjjYud` children wrapped full-size white
`Ww4FFb` surfaces with 8px bottom margins. Another record remained its anchor
because the site-name `gnavi.co.jp` and URL `r.gnavi.co.jp` were counted twice
inside the same source header. The omitted record caused a 214.98px pair gap.
These are reported facts about the selected page; its titles differ from the
original three-store screenshot. The complete original Google HTML was not
captured. Tests use neutral structural examples derived from this report.

The existing parser now lets a plain base-domain name yield to an explicit
subdomain URL only within the bounded source-only header ancestry. Separate
headers and two explicit URLs retain their identities. Full-width cards that
are direct children of the imported root can repair an existing 2-16px gap.
The source/title ancestry must identify an opaque surface covering each card.
Visible intervening modules, existing shadows, rounded/complex paint and
clipping that would hide the gap reject this additional path. A contrasting
native gutter and existing divider paint remain unchanged.

The root path uses a zero-blur, zero-spread outer shadow to paint the existing
gap. It does not add elements or change margins, borders, heights or positions.
The earlier grouped-result border path is retained. The inspector calls the
same new surface/root-gap helpers and includes surface and shadow evidence.
Its schema remains v659; the running script version is now 6.60.0.

The preservation test substitutes only the changed Google layout/classifier,
its inspector and the version initializer back to frozen v6.59, then checks
the entire executable byte-for-byte. The older v6.44 feature-preservation gate
also remains active. Frozen v6.59 has Git blob
32e645f7c7fef0bd561628581a7d8335369510b4. No unrelated site adapters or Google
input/cleanup behavior are changed.

## v6.59: collect evidence for the unresolved Google result boundaries

The owner reported that v6.58 did not fix the actual device display. The earlier
controlled Chromium and Android fixtures did not establish the structure served
to that device. No captured Google DOM was recovered from the source/evidence;
live Google had shown an unusual-traffic CAPTCHA. Do not describe v6.59 as a
completed visual fix. It is an on-demand diagnostic addition needed to identify
the actual failed branch before changing the boundary rules again.

`src/google-import-layout.js` and all v6.58 rendering behavior remain unchanged.
The preservation test removes the two diagnostic modules and their initializer,
then compares the entire remaining executable byte-for-byte with frozen v6.58.
The only wrapper around the existing repair function delegates exactly once,
preserving this/arguments/return/exception identity. It records invocation time,
connection/source-root presence and outcome in a WeakMap with six recent entries
per page, without extra repairs, geometry reads or background traversal.

On Google /search, a roughly one-second hold on the existing bottom-right
page/status control opens a local diagnostic dialog. Short taps retain pause/
resume. Movement, release and cancellation stop the pending hold; contextmenu
provides a long-press fallback. Diagnosis runs only when this dialog is opened.
There is no startup scan, new observer, recurring timer, network transmission or
persistent storage. The user can review and copy the JSON, save it locally or
close the dialog. Closing preserves the result markup and scroll position.

The inspector uses the unchanged v6.58 source/title parser and reports root and
card eligibility, source/title/card mappings, ancestor geometry, existing bands,
and pair skip reasons. Up to three nearby contexts/400 structural nodes are
sampled even when zero records are recognized. This can distinguish split URL
text, visible aria-hidden source rows, display:contents wrappers, hidden heading
selection, narrow cards and root-level siblings, without assuming any is the
actual device cause. Semantic headers are included only inside appended result
pages; initial-page fallback excludes headers and global controls.

Serialized text excludes form fields, menus, dialogs and script content,
including those nested in otherwise eligible parent nodes. URL query/hash and
credentials, image src/base64 payloads, event attributes, cookies and storage
are omitted. The inspector is bounded to 140,000 UTF-8 bytes and the whole report
to 200,000 bytes. Compact JSON is used before dropping a large inspection, and
all truncation is explicit. The user's selected-page report is still required
to determine why their three results remain joined.

Validation passed at candidate dd651178172c925a1eb489217eaf8122b55d9376:
https://github.com/hiro191u3n2/android-autopager-update/actions/runs/43192861098
The full Chromium regression command and release package checks passed, along
with 14 inspector scenarios and 12 diagnostic UI/gesture/copy/limit scenarios.
The preservation check confirms that removing the diagnostic addition yields
the exact v6.58 executable. These local DOM tests do not establish the owner's
Google markup or native clipboard integration.

One actual Android 15 / API 35 WebView smoke test passed short tap/pause,
resume, a 1300 ms long press/open, sanitized page-2 report capture and close.
The source markup, form values and scroll were preserved, and the report
contained four sources/records/cards, the expected three pair reasons and
three existing repair calls. The diagnostic panel was also visually inspected
in its emulator compositor screenshot. No verification failures remained.
The complete script in the Android APK and release package has SHA-256
98103fe6414bbda15b67f1e9daaad75f1a5574738763f36a34c4fb8202e58647;
the metadata SHA-256 is
4f10b6eee0e7e14fcbda2e64c7ed04a657a841b1ebe460686983254f0a8f717e.

An initial harness run sampled the previous frame after evaluateJavascript
had returned the new DOM. Its immediately subsequent failure screenshot
already showed the complete dialog. The harness now waits for WebView visual
state and an Android frame commit, then checks actual compositor pixels with
the original difference threshold and a bounded presentation wait. The
production diagnostic UI was not changed to address this harness race.
This single offline diagnostic smoke does not repeat the sixteen divider
paint scenarios and is not a live Google, Berry Browser or physical-device
verification. The original visual issue remains unresolved pending the
owner's report.

## v6.58: boundaries inside grouped organic results

v6.58 starts from the owner's v6.57 rollback, main commit
9b52d18419848b1d463f42c4d7d8551042d683fc. Before editing, the unmodified
worker output matched the published v6.57 script exactly (SHA-256
7c7a488ab1c08f639aa34b6bd223f8a2ec021b157fbefe0268362d7a30a8baf6).
The v6.53 layout snapshot remains unchanged; v6.54-v6.56's separator snapshot
and broader normalization are not reintroduced.

Only appended Google search pages receive the new boundary repair. A result
must have its own source identity and matching external title link. Plain-div
titles and alternate heading levels are supported. Duplicate domain text in
one source header is deduplicated, while independently headed same-site
results remain separate. CSS-hidden alternatives, sitelinks without their own
source header and horizontal rows cannot become vertical result boundaries.
All source identities constrain wrapper promotion, including results whose
titles cannot be recognized, so a known result cannot swallow an unknown one.

Only adjacent full-width results within a shared group receive a missing
border-top. Existing edge borders, short decorative paint and background
gutters are retained. The new border inherits a native divider's height/color,
with a theme-aware 6px fallback. No empty separator nodes are inserted.
Multiple-result groups and their children are also excluded from the legacy
price-based commerce reconstruction, preserving organic entries that mention
prices. Standalone commerce cards retain the existing behavior. Work runs from
the existing immediate/RAF/350ms import passes; no input/scroll handler,
observer or new recurring timer is added.

The new Chromium suite has four frozen-version failure controls and thirteen
current-code scenarios. It covers rendered-frame/fetch imports, 360/412 CSS px,
light/dark themes, mixed/plain title markup, independently headed same-host
results, prices, and more than 6500 retained imported elements. Large-DOM
checks establish that boundary repair is not skipped, not a speed benchmark.
Pages 2/3 must paint one contiguous native-color 8px band at each boundary,
across at least 95% of the sampled width, without bands inside result content,
sitelinks or horizontal cards. Delayed paint is measured again after 1200ms.
Titles, descriptions, links, thumbnails, hidden alternatives and the initial
native result's exact markup are checked.

The Android test harness runs the complete userscript before the initial
fixture body is parsed and captures actual emulator-compositor screenshots
with adb. Every HTTP(S) request is served from APK assets or rejected, so no
live Google request occurs. Sixteen control/current, mixed/plain-title,
light/dark and page-2/3 cases compare painted pixels and content geometry.
The Activity leaves navigation visible to avoid Android's first-run immersive
confirmation; known background pixels reject dimmed or obscured captures.
The divider color, thickness and single-band assertions remain unchanged.

These are controlled pages modeled on the supplied screenshot, not captured
Google DOM. Live Google showed an unusual-traffic CAPTCHA, which was not
solved or bypassed. Android API 35 WebView testing is distinct from the user's
Berry Browser, AdGuard and physical device. It cannot establish the exact
markup served to that device or guarantee future Google templates.

The compact plain-title fixture initially used the synthetic phrase
"次の検索結果を表示", which collided with the preserved correction-notice
classifier and hid the test container. It now uses neutral restaurant copy.
Production cleanup and strict visibility/pixel assertions were not changed.

Validation passed at candidate 67f3ac50947cb9f4866eb651ebe6eac8f1c81105:
https://github.com/hiro191u3n2/android-autopager-update/actions/runs/43184073720
The complete Chromium regression suite, all 17 grouping scenarios, and release
package verification passed after the fixture change. Android 15 / API 35 with
com.google.android.webview 124.0.6367.219 passed all 16 screenshot cases with no
verification failures. Each current boundary measured one 21-physical-pixel
band (about 8.01 CSS px); each frozen control retained the two missing internal
bands. Representative light/dark, old/current emulator screenshots were also
visually inspected. The control uses frozen v6.53, whose executable body is
identical to the v6.57 rollback.

The Android APK manifest, Chromium release build and local release all contain
the same complete v6.58 userscript (SHA-256
5526d606fe395e8c1f8985a4f5fa8574584325783507f13e41d577790b1e402d).
The metadata SHA-256 is
b8b7054bd3fe1c6879de5822c0270642a0ec1fb123c6302c0f5be4ce6d1c211e.
Run the full local gate in a browser-capable environment with
`bash scripts/validate-project.sh 6.58.0`; Android instructions and scope are in
`tests/android-webview/README.md`.

## Historical releases

v6.57 is a rollback requested by the owner after separator changes worsened
their device display. The executable is restored exactly to the frozen v6.53
package, Git blob 1d0077630bb5cdbc80a85ff0b12862010b398f06. Only metadata is
changed for forward delivery (version 6.57.0 and an explicit rollback notice).
The fixed update/download URLs remain unchanged. Google layout source and
worker assembly are restored from pre-separator commit
61ffb0d8265bb5b9fe2f6aca8458862fbc8d32aa; v6.54/v6.55 separator capture and
v6.56 boundary normalization are absent. The v6.53 search-input changes remain.

Active test commands again use the pre-separator suites. The later separator
test files and historical release aliases remain as history, not active
release requirements. Rollback validation compares the complete executable
bytes against frozen v6.53, plus syntax, preserved-module and package checks;
this is not a new device/browser behavior claim. Historical investigations
below describe superseded releases, not the current runtime.

v6.56 adds result-boundary normalization after a Google page is appended. The
v6.54/v6.55 fixes only preserved existing source paint; they could not supply
missing dividers inside a grouped result wrapper. The user reported continuing
and increased gaps on v6.55, so those fixture successes were insufficient.

The normalizer identifies external linked titles with their own preceding
source identity, keeps the highest wrapper containing one primary result, and
checks only adjacent full-width vertically stacked units. Same-host results
are separate; sitelinks without independent source headers and horizontal rows
are protected. Existing borders, short decorative strips and pseudo paint are
checked at the exact result edges. A group's final border cannot satisfy its
internal boundaries. Missing bands inherit an existing divider's color/height,
or use a theme-aware 6px fallback. Existing native background gutters count as
boundaries. Work is restricted to the existing immediate/RAF/350ms import
passes; there are no additional scroll/input handlers or mutation observers.

tests/test_google_result_boundaries.mjs reproduces three organic entries in
one group with only a group-bottom border. Frozen v6.55 must lose its two
internal dividers on both rendered-frame and fetch imports; current code must
paint all adjacent result boundaries once. It covers same-domain results,
role-based headings, URL-text source labels, sitelinks, CSS-only horizontal
cards, title/snippet/link preservation, pages 2/3, 360/412px and light/dark.
These are controlled fixtures modeled on the screenshot, not a device DOM
capture. Google blocked the remote test browser with an unusual-traffic
CAPTCHA; it was not solved or bypassed. Native Berry verification is pending.

Validation passed at candidate 9d45762b468a0c7b91f6c937836748e3ae3e0760:
https://github.com/hiro191u3n2/android-autopager-update/actions/runs/43158407580
The new suite passed all 10 scenarios, including frozen-v6.55 failure controls
for both acquisition paths. Existing divider/layout, cleanup, input-performance
and unrelated-site regressions passed. The CI-built script matches the local
package (SHA-256
1269711b531e7c05eef67d8464a51aabe40071acbcb536ed5cae259e95bdae91).

v6.55 extends the separator capture to painted, short, text-free decorative
containers with empty descendants, and to whitespace-only generated content.
The v6.54 leaf-only test lost the parent strip's fixed height in the former
case; its empty-string-only pseudo test missed the latter. Interactive/media
descendants remain excluded, and the width/height/paint limits still apply.
No result/title-based separator synthesis, observer or input work is added.

The additional fixtures use frozen v6.54 as a failure control. They are
controlled Chromium reproductions, not a captured Android DOM. This session's
live mobile Google request returned HTTP 429; local Chromium was blocked at
process-singleton socket creation, so browser validation uses the existing
read-only GitHub Actions job before production publication. The source starts
at main a500840dd7a4f340639fef43c49b9dcbca806da7, and its unmodified build
matched repository v6.54 exactly (SHA-256
01050b7437f329dd4206fc05b6eafc9e900e8a9c2388237613f823a4ef3573bb).

Validation passed at candidate b64543abc3070f9879f1c2fde7424885b6df6a56:
https://github.com/hiro191u3n2/android-autopager-update/actions/runs/43135492308
The complete regression suite and release checks passed. The CI-built script
matches the local release (SHA-256
5b41458a5316890369af6f28e21e19702c11955459de873c87a0abd6163e5342).

v6.54 preserves Google result dividers when importing later pages. The v6.47
layout snapshot replaced every non-media in-flow element's height with auto
and min-height with zero, collapsing short empty background strips. It also
did not capture generated ::before/::after paint. Normal borders survived,
which explains why the previous all-border layout fixtures missed both paths.

The snapshot now retains width/height/min-height for painted, empty, horizontal
decorative leaf elements. It captures only empty-content, short, wide painted
pseudo elements and restores their computed declarations through unique
attributes on imported nodes. These rules live in the document head because
the legacy import cleanup removes style elements inside result subtrees. No
source stylesheet or general title-based boundary rule is inserted. Existing
border dividers, nested result groups, sitelinks and carousels retain their
structure. Edge-anchored absolute pseudo dividers keep one auto inset so they
follow title growth instead of retaining a stale vertical position. Normal
text/card heights remain flexible. This adds work only to the existing one-time
page snapshot; no observer, input handler, scrolling task or timer is added.

tests/test_google_separators.mjs uses actual iframe imports and painted-pixel
checks with the frozen v6.53 package as a failure control. It covers generated
before/after/background/border strips, empty height/min-height elements,
ordinary borders, grouped results and title growth on pages 2/3 at 360/412px in
light/dark themes. Parent CSS intentionally gives the same pseudo classes a
different shape/color to detect leaking rules or duplicate paint. These are
controlled Chromium fixtures, not captured Berry DOM. Live mobile Google
returned HTTP 429; native Android/Berry verification remains unavailable.

The initial checkout at 61ffb0d8265bb5b9fe2f6aca8458862fbc8d32aa was clean.
Its worker output matched both repository v6.53 and live GitHub Pages exactly
(SHA-256 faa9a21914d1c4bdaf8528c8c283898ed42e35c1cfcd2c61e4f09dd5ad5ebd33).
The retired Sites identity remains unused; the canonical source and migrated
validator remain bound to the existing GitHub repository. The local execution
environment blocks Chromium's process-singleton socket, so browser regressions
run on the read-only GitHub Actions validation job in fix/google-separators-6.54.
The job also builds and verifies the release package before production writes.
Local syntax, source identity, frozen-baseline preservation, offline DOM/event
checks and package checks use the same source. The complete local entry point
in a browser-capable environment is `bash scripts/validate-project.sh 6.54.0`.

Validation passed at candidate 88d7f2222c27a652abbea8ac9d54ed8c56be74da:
https://github.com/hiro191u3n2/android-autopager-update/actions/runs/43091508379
The complete regression suite and release-package checks passed. The CI-built
userscript matches the local package exactly (SHA-256
01050b7437f329dd4206fc05b6eafc9e900e8a9c2388237613f823a4ef3573bb).

v6.53 fixes search editing work in the Google cleanup module. Keyboard/overlay
class and style changes on shared page roots no longer restart result-wide
traversal. Input, combobox and suggestion descendants are excluded before a
walker is created, including directly supplied mutation roots. Capturing input,
focus, pointer and composition events pauses cleanup while editing without
changing events, query text, selection or focus. Up to 200 non-input mutations
are deferred; overflow uses one recovery scan and revalidates existing hidden
notices first so they do not flash behind a long result list. Nodes recycled as
input/suggestion controls are immediately released from previous hiding.

An actual search change (path, q, udm, tbm or start) resumes cleanup even if the
input retains focus. Fragment and tracking-parameter changes retain the pause.
Blur resumes after a short settling delay. Bounded mutation/traversal chunks
now yield through tasks instead of chaining microtasks until the entire page
has been scanned. Changed roots and native location notices are classified
before bulk traversal so existing first-paint suppression is retained. Cheap
text/structure checks also precede expensive result-protection walks. The
legacy pager and every unrelated feature remain byte-preserved.

The supplied recording showed Google results for 渋谷, an apparent delay while
opening its query editor, and repeated IME/candidate updates for 渋谷駅 and
渋谷 スナイデル. It did not include an installed version, an OFF comparison, or
device profiling. The frozen v6.52 Chromium fixture reproduced 24 result-wide
walkers and 5,644 total walkers after four keyboard-style/class changes, and
209 candidate-subtree walkers for a 50-option update. v6.53 performs zero of
those walks. These are controlled DOM operation counts, not Berry timing or
an Android speed-up claim. tests/test_google_input_performance.mjs covers the
module and complete package, IME/caret/focus preservation, blur/SPA recovery,
hash/tracking updates, recycled controls, bounded-buffer recovery without
flashing old notices, and task progress before a large scan finishes.

This session restored the public canonical GitHub main at
0945001bd2c6297e462003d46982e0b0f88e7fb7. The untouched worker output matched
both repository v6.52 and the live Pages script byte-for-byte (SHA-256
e8747a19b61eaef9a6dae2c1947c6cffe692d532b4f1404a008443a69203e3d1).
Use the migrated repository validator with `bash scripts/validate-project.sh
6.53.0`. The obsolete Sites identity and retired host remain unused.

v6.52 fixes two reproduced blank-page failure paths. A competing page MutationObserver can reassert a notice's inline display after each hide; the frozen v6.51 module then starves renderer tasks indefinitely. Inline reassertions now have a three-attempt limit, after which only the classified notice is collapsed/clipped through a CSS shield, avoiding further display writes. Cleanup's own synchronous display mutations are removed from its observer queue while earlier external records and synchronous custom-element reactions are preserved. Leaving search/recycling nodes removes the shield and restores the latest page display value.

Blanket early CSS for AI attribute hints was removed: it could hide body or shared search roots despite the JavaScript guard rejecting them. Strong AI classification also refuses containers holding search roots, page controls or navigation. Isolated AI modules with citations remain eligible. The liveness suite uses a separate Node process watchdog and a frozen v6.51 failure control; it verifies continuing timers/frames, displayed results, streamed correction/location/AI notices, updates and unrelated style mutations. The boundary suite covers six AI attributes on body/shared shells, eight known root shapes and the complete packaged userscript.

Live desktop Google was inspected for the reported search. It had sibling correction/location dynamic-visibility-control components, then an AI subtree and a separate result root. The reproducible style-owner conflict is a synthetic stress condition, not a captured Google implementation or proof of the exact native Berry failure. The actual response did not put an AI hint on body/shared roots. Native Android verification remains pending. Source was restored by cloning the public canonical GitHub repository at bfeadfbfa2bd2b9fec6ffd3a7bb5fa5dac73c4d0 after workspace maintenance; the untouched worker output matched production byte-for-byte before edits.

v6.51 adds a location-only semantic scan before the generic protected-subtree walker. Live desktop Google was inspected successfully: the location heading (`検索の場所:` / `.BBwThe`) and `現在地情報の使用方法` menu are siblings of `update-location`, with hidden dialogs/snackbars in the component. The new path identifies their enclosing row without depending on a generated middle dot, icon dimensions, text length, or a specific city. Location auxiliaries do not disqualify the row. Shared data-q/MjjYud wrappers remain intact and retain the generic text-path protection. Existing precise-location controls in standalone dialogs, Places, normal results, PAA and the footer remain protected.

Markers also apply a saved/restorable inline display override, because inline author `!important` can outrank the cleanup stylesheet. Site display rewrites are suppressed without observer loops; leaving search and recycling content restore original display/priority. The semantic suite includes offline fixtures derived from the observed desktop structure and synthetic mobile/failure variants. It is not an Android DOM capture, and cannot establish which of these failure modes occurred on the user's device. Device verification is still pending. There are no extra network requests or city-specific rules.

v6.50 replaces post-paint timer scheduling with bounded microtask work, so dynamic notice mutations are classified before the next rendering opportunity. Known AI/correction payloads also have protected-scope early CSS. Same-search pageshow/query changes retain hidden markers; leaving search releases them. Location detection accepts small CSS/SVG-use/image icons, generated middle dots, nested jsaction overflow menus, and location-only children in the header/Places wrapper. A pure #taw/#topstuff location row can be hidden without hiding a shared result container. No body-wide blanking is used.

The supplied recording showed ordinary results first, then three notice strips added around 2.4 seconds, and their removal around 3.3 seconds. The pager status was already visible during this interval, so a post-insertion cleanup delay is a plausible contributor; video cannot identify the exact device DOM or installed version. The new paint suite samples every requestAnimationFrame while parser execution and timers are delayed, includes a frozen v6.49 failure control, and checks initial/dynamic/pageshow/SPA behavior and preservation of search/map/results. These remain synthetic Chromium checks, not a guarantee about code that runs before a native userscript manager injects it. Large initial DOMs may delay rendering while the microtask scan completes.

v6.49 addresses the mobile misses reported after v6.48: an AI error outside the assumed result IDs/in a custom element or reused `.g` wrapper, and a region strip without the Choose area label. It scans the bounded mutation queue across body content and protects actual result headings, Places, question panels, sidebar/footer and search controls. SVG titles are ignored when matching split error text. Current-location custom elements (`dynamic-visibility-control` / `update-location`) and the mobile AI payload `[data-mg-cp="YzCcne"]` are recognized. A limited pre-result icon/middle-dot/menu fallback covers the short location strip without depending on a city or query. Shared wrappers are kept.

The new mobile suite includes a frozen-v6.48 failure control and 16 synthetic Chromium scenarios. These fixtures reproduce the old misses and check the screenshots' UI patterns; they are not captured device HTML. Live Google still returned HTTP 429, and Berry/AdGuard device confirmation remains pending. Selector evidence was checked against the author's mobile filter at https://wikiwiki.jp/gift/スマホ用GoogleのuBlock%20Originフィルタ (location and AI sections); ordinary place results use a separate selector and are preserved. Existing cleanup, layout and unrelated site regressions are retained.

v6.48 adds `src/google-search-cleanup.js` before the preserved runtimes. It hides Google search correction notices, the region-selection strip, and AI Overview modules/errors across queries. It does not rewrite the query or force another search mode. It observes changed subtrees, handles history/pageshow and recycled nodes, and protects ordinary result cards and question panels. The existing executable body remains byte-preserved under the invariant test.

The v6.48 release passed 26 offline Chromium cleanup scenarios, 6 existing Google layout scenarios, and the existing Yahoo/fashion/gallery/commerce regression checks. Cleanup checks cover extra menu controls, citations, shared wrappers, query changes, AI Mode isolation, large-DOM insertion, dynamic text and restored pages. Live Google returned HTTP 429 in this environment; native Berry/AdGuard verification is still pending. Unrecognized future AI markup may need new selectors. Restoration used exact GitHub blobs from main `3ce592c86a2088bca99c9fc20c984ec3ecd35eb8`, including the unchanged v6.44/v6.45 regression baselines.

The owner approved reconstruction from the public GitHub main branch on 2026-10-16 (Asia/Tokyo), after workspace maintenance removed the old checkout. The previous Sites source checkout and its original browser regression tests were not recovered. Do not fabricate that source identity or reactivate the retired host.

- Canonical directory: `/workspace/sites/android-autopager-update`
- Actual source remote: `https://github.com/hiro191u3n2/android-autopager-update.git`
- Recovery commit: `462e8b7f1ac81184a6adc95204bbdfe6aca25c4e`
- Frozen baseline: `Android_Generic_AutoPager_v6.44.js`, Git blob `ee0c1d906375c7d34ebc3046719abef10d42c7ae`
- Local Node build entry: `worker/index.js`
- Current modules: `src/yahoo-realtime-autopager.js`, `src/cityhill-gallery-compat.js`, `src/fashion-product-guard.js`, and the three fashion listing adapters.
- Tests: `scripts/test-buzzap.mjs` (preservation, metadata, syntax and host isolation), `tests/test_yahoo_realtime.mjs` (DOM/event regression fixtures), `tests/test_fashion_performance.mjs` (operation counts, pagination and product isolation), `tests/test_cityhill_gallery.mjs` (tap compatibility and gesture isolation).

Install test dependencies with `npm install --ignore-scripts`. Build/validate with `bash scripts/validate-project.sh 6.52.0`. The validator checks the actual GitHub remote rather than the obsolete Sites remote. It retains the original release-packaging and production SHA-256 checks. Do not run old feature-specific build scripts during this release; they intentionally target their historical versions.

v6.45 added the Yahoo More-button runtime and exact-route generic-core guard. v6.46 replaces only the three hash-pinned fashion adapter ranges: CITYHILL caches card identities and checks the last visible cards on scroll; all three adapters use native lazy loading for imported card images. Two exact-count substitutions also keep generic imported commerce-card images lazy (Product microdata or standard card classes); Google/Buzzap and non-commerce image behavior stay unchanged, verified by `tests/test_generic_commerce_images.mjs`. A product-detail guard runs before generic content scoring. CITYHILL gallery compatibility uses existing Swiper instances after a stationary tap only when native selection did not complete. It does not clone gallery nodes, rewrite main images, prevent default events, or poll during scrolling. Other legacy executable bytes are restored and compared exactly in the preservation test.

Evidence for v6.46: public CITYHILL item 945932 has 118 gallery slides. The unmodified official gallery switches on desktop Chrome; jsdom with the actual Swiper 11.2.10/item.js reproduces failure for DOM-click/touch-only sequences, equally with and without v6.45. Thus a userscript-caused thumbnail failure has not been proven. The compatibility fallback covers that input gap. Actual product HTML profiling shows unnecessary generic startup scans, but no persistent observers or image rewrites on that snapshot. CITYHILL listing operation counts do show a userscript bottleneck increasing with all loaded cards. Regression fixtures use controlled time/geometry; they are not Android/AdGuard performance or live network verification.

Publish using the connected GitHub file tools, preserving all historical aliases. Confirm remote blobs and live Pages HTTP 200 plus exact userscript/metadata hashes before reporting completion.

v6.47 restores the preserved development files from GitHub main `5c2269968487eed00279b80c58906d9b5791c51a` after workspace cleanup. Every restored blob was compared to GitHub; the unchanged worker output matched production blob `b52187ccd2efe33bb749d5ed154bd62c32e47bbb`. The old Sites identity remains retired. The bundled skill validator still expects that obsolete identity; use this repository's migrated validator, never fabricate `.openai/hosting.json` or an old remote.

Google rendered-page imports now snapshot their source computed layout before legacy image hydration and restore it on the detached clone. The style snapshot is local to the imported subtree and does not add source stylesheets to the first page. When a snapshot was successfully applied, the legacy commerce reconstruction, overlap repair and image-visibility rewrite are skipped. This prevents editorial price mentions being rebuilt as products and preserves hidden alternate images. Exact-count build substitutions and the preservation test limit changes to these named Google boundaries. Failed or unavailable captures retain the old path. Native Android/Berry Browser/AdGuard behavior still requires device confirmation; local browser fixtures are not live Google or Android tests.

The Google regression test uses the pinned Playwright dependency. Install Chromium with `npx playwright install chromium` or set `GOOGLE_TEST_CHROMIUM_EXECUTABLE` to an existing compatible executable. `GOOGLE_TEST_CHROMIUM_MODULE` can point to an installed `@sparticuz/chromium` module when that binary distribution is needed. All test network requests are intercepted. The six scenarios include an old-version failure control, real iframe imports across two appended pages at 360/412 CSS pixels in light/dark themes, and non-Google isolation. Checks include thumbnail controls, product descriptions, editorial prices, title growth in CSS grid, hidden alternatives, destination links and unchanged first-page content. Existing Yahoo (57), commerce images (27), CITYHILL gallery (22), fashion pagination/performance and byte-preservation tests also pass.
