# Recovered development source

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
