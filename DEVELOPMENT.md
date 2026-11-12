# Recovered development source

## Selected-result evidence capture before changing grouped-card rendering

On 2026-11-13 the owner approved investigating the still-missing boundaries
between three ordinary Google results and moving to explicit result frames.
The first required step is reproduction of the actual failing subtree. The
historical device diagnostics contain selectors, geometry and rejection
reasons, but not its complete HTML; the stored neutral fixtures and CI
screenshots are not that capture. The surviving recordings likewise do not
establish the DOM. A fresh cloud-browser inspection of the same train query
returned desktop results with ten separate one-heading MjjYud children, not
the reported Berry group. Direct Android-UA fetching returned HTTP 429.

The standalone `tools/google-result-capture.user.js` is an opt-in, one-shot
local capture aid, not part of the production autopager. It lets the owner
select a result in the affected page so the selected page, rather than the
most recently appended page, can be inspected. The intended next change is
to normalize confirmed complete ordinary-result units into explicit wrappers
while still detached, after existing style/title preparation and before the
first visible append. Rich modules and unresolved result ranges must remain
intact. The old post-append boundary painter must not repaint new wrappers.

Until the actual affected capture is available, no v6.67 layout fix is
claimed or released. The fixed production userscript remains byte-identical
to v6.66.0. The migrated repository validator remains authoritative; the old
bundled validator still exits at the retired Sites identity check.

The complete migrated v6.66.0 validator passed unchanged on candidate
`844aecb690f89fe40e1bf4536f14b3061f00235d`, Actions run `43300078544`.
Further collector-only refinements use the focused capture suite and exact
package comparisons; they do not change the production executable. The helper
now checks retained attributes, children, text and viewport consistency, and
only persists its completion boolean after the owner confirms that the file
was saved. A cancelled download remains retryable across navigation.

To supply the missing evidence, install the separate helper while the regular
autopager stays enabled, open the affected Google results, press
`区切り箇所を取得` and select one of the three affected results. Attach the
downloaded `Google_Result_Structure_YYYYMMDD.json` to the ongoing conversation.
After verifying the file exists, `保存できたので終了` dismisses the helper for
that Google origin. Do not publish the owner's resulting capture to the public
repository; derive a minimized, anonymized regression fixture from it.

## v6.66: sustained Google page preparation, not only earlier triggering

The 2026-11-13 00:07 Berry recording still reaches the loaded document end
while the status says loading. Stops occur at 3.231–3.989, 5.147–5.814,
6.656–7.572, 8.689–9.790 and 10.631–11.381 seconds. Each appended page is
about two viewports and the reader traverses it in about one second. The
v6.65 test used roughly six-viewport pages, waited for page 2 before scrolling
and stopped before crossing page 3. It did not establish sustained throughput.

The old rendered-frame preparation imposed 3 x 180ms even with fully loaded
images, and another 450ms on pages with no images: 990ms without any network
or layout work. v6.66 visits the same lazy-loading viewport positions with
rendering opportunities instead of fixed sleeps. Pending images with reserved
dimensions can paint later; unsized pending images keep a bounded load wait.
Known safe lazy-image URLs in reserved slots are activated after the viewport
pass without a deadline sleep. Unsized delayed images, placeholders and picture
sources are observed until their source and intrinsic geometry are ready within
the shared bound; unresolved activation is not silently imported as a blank.
The image source/geometry pass now batches all reads before writes and removes
the redundant synchronous computed-background walk already covered by the
preserved layout snapshot.

Eligible video titles start resolving as soon as the source root is available,
overlapping frame and layout preparation within the existing shared deadline.
Ready titles are retained. While the reader approaches the loaded end, optional
unfinished title lookups no longer hold the entire next page: Google's visible
title remains and is never rewritten after append. No outer scroll positions,
gestures, separator geometry or unrelated site adapters are changed.

Validation uses frozen v6.65 controls, approximately 1900px pages, identical
fixed-start sustained relative inputs through at least five boundaries, and
actual CDP touch/fling input. It includes slow-title responses, real iframe
lazy images, unsized image readiness and operation-count checks for the removed
background walk. These are controlled Chromium tests, not native Berry/AdGuard
measurements on the owner's device. The migrated repository validator remains
the validation authority for the approved GitHub migration.

The complete migrated validator passed on candidate
`609162353e48cbc766c8bc5a7b9d7eded882e9e9`, Actions run `43250762662`.
Both dense-text and 1800ms title-response scenarios crossed seven page
boundaries with zero lost scroll displacement. Frozen v6.65 lost 2826px and
9508px respectively. During native touch inertia the next page appended 273ms
after release and movement continued another 525px after the first appended
frame. Ten image-preparation scenarios cover ready, reserved, unsized, delayed
IO, placeholder and picture sources plus the duplicate-background-walk count.
The existing Google layout/cleanup/input and Yahoo/fashion/commerce suites all
passed. Lifecycle fixtures now distinguish initial native pageshow from a
simulated history departure; urgent retry explicitly checks stable Google-title
fallback after its gated resolver settles. No production event handling was
changed to accommodate those fixture corrections.

CI artifacts and the local package are byte-identical: userscript SHA-256
`c0eaac604a31073fecfea32cf35b982665355654b33534affe855d221267830f`,
metadata `a4c1d38dfecc77e67166298b5819f42b9711a75b51c1260223943911ed7f3be1`,
executable body `32d45b79faecea51f042070392e0fb6f37efdb6cf500b0d46e39fa1dde483c38`.

Published on 2026-11-13 (Asia/Tokyo) through the fixed GitHub repository;
package commit `83fdd2492ccdd328ed9de294c79215b656884df6`. The versioned alias,
fixed userscript, metadata and installation page match the validated package
in GitHub. The literal production userscript URL, metadata URL and homepage
each returned HTTP 200 with exact local/CI bytes; homepage SHA-256
`a15acaa559426b4407e9ce895b6431845f122388a7c8d9ec3ec378d1ac67e02c`.
No native Berry device verification is claimed.

## v6.65: prepare the next Google page before the scroll boundary

The two 2026-11-12 Berry recordings repeatedly reach the loaded document's
bottom while the status shows loading. In the second clip, the content stays
fixed around 6.95–9.00 seconds despite moving touch indicators; page 4 then
appears and scrolling resumes. The previous Google trigger waits until only
1400px remain, then serially waits for navigation, iframe hydration, preserved
layout and final title preparation. This can exhaust the available scrollable
content before the next page is ready.

Google now prepares page 2 immediately and advances again only when the reader
approaches the beginning of the latest appended page. The direct section
reference and passive, animation-frame-coalesced check avoid walking accumulated
results. Short pages fill enough content ahead; page limits, duplicate checks,
failure behavior and serial loading remain owned by the existing loader.
The Google completion path rechecks promptly without the former 350ms delay.

Input/composition and hidden documents defer new requests. Pause, route changes,
detached targets and pagehide generation changes prevent old responses from
being appended. The helper does not intercept gestures, write scroll positions
or force smooth scrolling. All layout/title preparation remains unchanged.
Exact reversible replacements and the frozen v6.64 body check preserve every
unrelated executable byte. Browser tests use controlled fixtures, not a claim
of native Berry/AdGuard verification on the owner's device.

The complete migrated validator passed at
`8601112b97567f9c462e5d1c7eb8410f0779836e`:
https://github.com/hiro191u3n2/android-autopager-update/actions/runs/43239776527
All 9 read-ahead browser scenarios and 4 lifecycle unit groups passed, as did
the complete prior layout, title/tail, cleanup, input and non-Google suite.
With a controlled 1.2-second response delay, the frozen release clamped repeated
scroll attempts at 5094px; the new release continued the same trajectory to
8000px across the boundary with no outer scroll writes or overlapping requests.
Pending success and error responses were checked across pause, query changes
and pagehide. Existing staging fixtures now wait for DOMContentLoaded and use
a tall first result with a compact tail, preserving their original assertions
without racing the intentionally earlier request.

Validated userscript SHA-256:
`8190a67dab751ae95f2ef03e13c25e32191d7ce494486dc8e8dcd00f3601627c`.
Validated metadata SHA-256:
`e953c5c59b57d1eb5eb3fd757536de85a344c9d1fe28233e2f1dd53b98046e58`.

Published under the owner's continuing automatic-publication instruction.
At 2026-11-12 14:48 UTC, the fixed homepage, userscript and metadata URLs all
returned HTTP 200 and matched the validated release byte-for-byte. Pages run
43240924777 and published-content verification run 43240924425 succeeded for
`af88f89c0c591de31c7b52d479f4cf57aebaeb0a`. Homepage SHA-256:
`9123ca4605db3df9e03683321a4262aa7c27f293a6a7d86d1603cf9f8b89b446`.

## v6.64: touching results and inline source addresses

The two 2026-11-12 22:46/22:47 Berry recordings still show missing grey
dividers between independent results. Examples include Pixiv / Eki-net PDF /
NAVITIME and the Chiba tourism site / MAFF / Daigo. The videos do not reveal
the device DOM or installed version. Live Google in the inspection browser
requested reCAPTCHA; no challenge was attempted. No new device logs are added.

Two concrete exclusions are reproduced against frozen v6.63: direct-root
result boxes with 0–1px external gaps were rejected even when their padding
provided safe empty space; source addresses split by inline elements or a PDF
badge were skipped as non-leaf nodes. These are verified code defects matching
the symptoms, not proof of the exact path taken on the owner's device.

Touching results now receive an inset stripe only within confirmed existing
top padding. The source/title and rendered children must remain below the
stripe. Full opaque result surfaces, adjacency, clipping, transforms, radius,
pseudos and existing shadows are checked; known thin outer outlines are kept.
No card height, margin, content position or scrolling handler is changed.
Existing native borders and ambiguous decoration remain unchanged.

Source recognition accepts short complete URL rows made from safe inline
text/emphasis/wbr and an optional trailing PDF badge. It rejects mixed domains,
headings, snippets, interactive/hidden content and URL fragments masquerading
as separate hosts. Nested complete rows retain only one source identity.

The v6.63 executable preservation gate requires every byte outside the layout
module to remain unchanged. Previous title staging, tail behavior, diagnostic
removal and all non-Google adapters are preserved. Tests include frozen failure
controls, source classification and real iframe import/pixel checks with zero
geometry drift. The migrated repository validator is used: the bundled skill
validator still expects the retired Sites identity and exits before validation.
Do not fabricate that identity or reactivate its host.

The complete migrated validator passed at candidate
`a99bcb1f4e2ab930c25ce4d96bffa86746dcab52`:
https://github.com/hiro191u3n2/android-autopager-update/actions/runs/43233936945
All 62 source-row cases and 25 iframe/pixel cases pass, including 0px geometry
change after touching-card paint, 8px single bands, outline preservation and
protected shadows/rounded/translucent content. The complete existing suite also
passes, including grouped/root layouts, rich imports, title/tail staging,
diagnostic removal, cleanup, input liveness, Yahoo and fashion adapters.

The initial test's intervening-content fixture used a 40px min-height that the
pre-existing importer intentionally normalizes for text. It now uses 10px
padding and natural line height to provide the same 40px source height without
testing unrelated min-height behavior. Strict pixel and geometry assertions
were retained; no feature code changed after the first CI candidate.

The local release equals the CI-built package byte-for-byte. Userscript SHA-256:
`cfd28266e45fe42d84609e9420930c3dc3215a054d89bb066757ae6dae35faf7`.
Metadata SHA-256:
`3c46f18da3412c507b186d2c41c3258ecfacc8f0fa04902cb8849dd45d228c58`.
Published after the owner's explicit approval on 2026-11-12. Pages deployment
of `d0c11852d2756df0cdc69d1bd3efeca6445f15ed` completed successfully:
https://github.com/hiro191u3n2/android-autopager-update/actions/runs/43235842685
At 14:26 UTC, the fixed homepage, userscript and metadata URLs all returned
HTTP 200 and matched the validated local release byte-for-byte. The homepage
SHA-256 was `eb9c42893559ba630a33ba34e16c5b524cf477bd35b1155792e738b5da3b782e`.
Native Berry/AdGuard validation on the owner's device remains unverified.

## v6.63: grouped separators, stable imports and Google diagnostic removal

The owner's second recording on 2026-11-12 shows two missing separators within
three-result groups, the repeated initial-page related searches/footer moving
away when another page arrives, and a YouTube heading changing immediately
after import. The requested scope is those three display problems and removal
of the recently added Google diagnostic feature. Page-boundary duplicate
results and the status button's position are outside this revision.

The grouped-gap path still treated any unequal background color string as
evidence of an existing painted divider. The frozen v6.62 reproduces both
missing separators with three recognized cards and 8px margins on near-white
and translucent backgrounds. Qualified sibling cards inside a group now reuse
the existing root-gap shadow painter, including its surface, clipping, native
paint and outline checks. This changes only the existing gap's paint. A site
name/time without a visible URL can identify its result when the same primary
heading link contains a small favicon and a short separate source row. Body
links, sitelinks, questions, carousels and large-image captions are excluded.
The full device DOM is unavailable; these are reproducible code failures and
controlled structural fixtures, not proof of the exact device branch.

Google's initial-page tail is hidden reversibly while continuous loading is
active, so imported results do not repeatedly push the same footer away.
Known or semantically identified tail modules are removed from detached imports
before display. Ordinary results, shared result containers, input controls and
non-Google pages remain protected. Pausing or a load failure restores usable
manual pagination, and leaving the search restores the saved page state.

YouTube title restoration runs on the detached imported page. The existing
resolver and cache remain in use, with at most three concurrent resolutions and
one shared 2.2-second deadline. Completed titles are applied before insertion;
failure or timeout retains Google's visible title. The old attribute-label
intermediate write and all post-insertion title writes from that import task
are removed. Late network completions may populate the cache but cannot mutate
the displayed imported page.

The Google inspector, repair-history wrapper, diagnostic dialog, long-press and
context-menu interception, clipboard/export UI and initialization are removed
from the current build. There was no persistent diagnostic store to migrate.
Normal pause/resume behavior and unrelated site adapters are retained. Frozen
release aliases and historical failure controls remain unchanged; the old
Android diagnostic runner is explicitly documented as v6.59–v6.62 only.

The v6.62 preservation gate reverses only the new named import hooks and layout
module, then compares the entire executable with frozen v6.62 minus its Google
diagnostic addition. The original v6.44 preservation gate also remains active.
New fixtures check missing/native grouped gaps and source-relative geometry,
the first visible imported title and late completions, reversible tail behavior,
and real status-button gestures after diagnostic removal. The workspace's
Chromium launch restriction requires browser validation in GitHub Actions;
these checks do not imply verification on the owner's Berry/AdGuard device.

The complete migrated validator and release-package checks passed at candidate
7a31759cee5e5805d7a84fb18627455090415976:
https://github.com/hiro191u3n2/android-autopager-update/actions/runs/43227145089
The 22 organic-grouping paint cases include frozen-v6.62 missing-gap controls
and current near-white, alpha and native-dark grouped results on pages 2/3.
The three new current cases have two single 8px separator bands, no unwanted
paint inside content or sitelinks, and a maximum source-geometry delta of 0px.
The native-dark bands are not doubled. The 11 classifier unit cases also pass.

All three full-script staging browser scenarios and seven staging unit cases
pass: first-visible prepared titles, deadline/late-response stability, detached
tail cleanup, pause/resume, failure/manual continuation, retry, existing
duplicate-signature termination, route changes and non-Google isolation.
The full-script status-button test confirms short taps, held-pointer release
and context-menu clicks without a Google diagnostic dialog, clipboard action,
download or repair-history wrapper. Unrelated diagnostics remain intact.

Existing imported-layout (6), rich-import (8), root-gap (13), input-performance
(18), cleanup (26), mobile-cleanup (16), first-paint (13), location-semantics
(12), cleanup-boundary (22) and liveness (7) cases also pass, along with Yahoo,
fashion, gallery and commerce-image regressions and both frozen-byte gates.
The mobile/first-paint integration cases retain their original ordinary-content
and no-flash assertions, additionally checking exact footer content while
pagination suppresses it and full restoration when paused.

Two test assumptions were corrected during CI without changing production
code: a missing Google next link still uses the existing synthesized start+10,
so final restoration is tested through the real duplicate-signature stop;
and the packaged pager now temporarily suppresses the footer while standalone
cleanup continues to preserve it visibly. No pixel or geometry threshold was
relaxed. The release executable matches the fully validated candidate.

Verified release SHA-256 values:
- userscript: `349045d116b1252016ccbca59e09b2504bacaf65e4c3faadb4cdace65125de34`
- metadata: `d80336468db2386a759d3734d25d1b72e6c9545c71b9ee49f51b3458c72eede1`
- executable body: `1c4c9a630d346d78467ced1edc10689b357cff2efb57141e663afdb42a81ed47`

## v6.62: preserve shopping columns and generated decorations

The owner's 23.71-second screen recording supplied on 2026-11-12 shows native
horizontal shopping cards becoming vertical on added pages. The same organic
result on either side of a page boundary retains its rating text but loses its
stars and stock dot. Some result dividers also disappear. This is visual
evidence, not a capture of the device's DOM or proof of which snapshot branch
ran on that device.

The rendered-source snapshot previously replaced every ordinary wrapper's
width with auto, omitted before/after pseudo-elements and CSS masks, collapsed
empty decoration heights, and rejected the entire page above 5,000 elements.
Widths now retain computed auto/percent/calc constraints through Typed OM with
a measured-width fallback. Text heights still grow, including restored YouTube
titles. Empty painted boxes keep their heights. Pseudo rules and masks are
copied into selectors unique to one imported root, with absent pseudos reset
inside that root only. The first page's stylesheet is not changed.

Capture and detached-clone application yield in short batches. Display-none
branches retain their hiding parent without reading every descendant's style.
There is no all-or-nothing element-count cutoff. A source tree changed during
capture gets one retry before legacy image hydration; mismatched application
stops the import rather than exposing an unstyled clone to legacy card repair.
No observer, scroll handler or recurring timer is added. The existing boundary
classifier and all unrelated site adapters are unchanged. The production
Google preference remains rendered frames; its opt-in fetch path is unchanged.

The new rich-result suite uses controlled fixtures with CSS-only card widths,
rounded pseudo backgrounds, rating/stock decorations, masks, source dividers,
and a hidden subtree bringing the source above 5,000 elements. It compares
frozen v6.61 against the built script at 360/500px in dark/light themes on
pages 2/3, including screenshot pixels, geometry, content and first-page
isolation. These fixtures model the video's symptoms, not Google's full HTML.
The complete existing regression and release-packaging gates remain required.

The current workspace cannot launch Chromium because its process-singleton
socket is denied. Rendering validation runs in the repository's dedicated
GitHub Actions workflow. No Android/Berry/AdGuard device result is implied.
Validation passed at candidate 5b3342b2a8b3d9f599096a4bd558e9d19af91b70:
https://github.com/hiro191u3n2/android-autopager-update/actions/runs/43214422750
The canonical migrated validator and release package checks passed. Eight new
rich-import scenarios passed: three frozen-v6.61 failure controls, four current
mobile/theme/size cases on both added pages, and one asynchronous source-tree
consistency case. All seven product widths/heights in the representative 500px
case exactly match the standalone source. The stars, mask shapes, stock dots,
rounded backgrounds and both original divider gaps pass screenshot color
checks. No horizontal document overflow or first-page mutation occurred.
The existing 6 imported-layout, 17 organic-grouping, 13 root-gap and 18 search
input-performance scenarios also passed, along with cleanup, diagnostic,
Yahoo, fashion, gallery and image regressions and frozen-byte preservation.

The initial rendering run exposed a fixture comparison mistake: an empty
data attribute was written without =\"\", but outerHTML serializes it with
=\"\". The fixture now supplies that exact normal form; no geometry or pixel
threshold was relaxed and no production change was made for this assertion.
The final script is byte-identical to that rendering candidate. A prior CI-only
failure was the checkout action's remote spelling without .git; it is explicitly
verified and normalized to the same repository before the unchanged gate.

Verified release SHA-256 values:
- userscript and v6.62 alias: 035e4d9d63045591dc76f4dfd22d128c8cddf07fadacef4578b488b50ba763c7
- metadata: 28a2743de6f2ba2cfa44cdb06a37da61c75376bb71c51e53f17472e7267107f2
- executable body: 7c55b9d9a23ef2d8f952ebc446944fe5222561e1932c75098e9a1c3d49c8386e

Primary CSS reference used for retaining percentage/auto widths:
https://developer.chrome.com/docs/css-ui/cssom

## v6.61: do not infer a painted gutter from ancestor color inequality

The owner reported that v6.60 was still visually unresolved and supplied a
second diagnostic captured at 2026-11-12T10:23:41.178Z. Nine records and all nine
cards were accepted, with eight aligned 8px gaps and confirmed white result
surfaces. Every pair was rejected by `different-background`; repair markers and
detected bands were both zero after three normal repair invocations. Nested
surfaces additionally showed an opaque 1px outline shadow in rgb(235,237,239).
The report does not record the resolved ancestor backdrop or contain the full
source HTML. The new fixtures therefore use explicit representative near-white
and translucent backgrounds, not an invented claim about the owner's exact
ancestor color or a capture of the original three-store DOM.

The old background helper walks past the transparent imported root/page into
the initial page's ancestors. That color string differing from the result face
is not evidence that the imported gap contains a visible separator. Qualified
direct-root gaps no longer use this inequality to cancel paint. The old grouped
path and native border/pseudo/decorative-band guards remain unchanged.

For root gaps, an opaque parsed sRGB ancestor color is retained when its contrast
against both opaque result faces is at least 1.12. Otherwise a known native band
supplies the paint color, followed by the existing theme fallback for weak,
translucent or unsupported backgrounds. A band elsewhere in the imported root
cannot recolor an already contrasting local gutter. This threshold chooses a decorative color;
it never decides whether to repair and is not an accessibility conformance
threshold. No root/body background, source content, geometry, event handler or
recurring work is added or changed.

The existing zero-blur outer-shadow method paints only the existing gap. An
opaque, simple hard surface outline up to 2px is retained at the previous
result's bottom edge when its ancestry does not clip it; the new fill starts
after that edge. Surface shadows and margins themselves are not overwritten.
The inspector uses the renderer's shared paint helper and exposes the raw
backdrop, source node, alpha, opaque contrast ratios, chosen color/basis and
outline inset, including current decisions for already marked pairs.

The preservation gate now restores only the layout module, inspector and
diagnostic version initializer to frozen v6.60 and compares the whole executable
byte-for-byte. Frozen v6.60 has Git blob
dfa28418b2ea6fb4af5ed7bcfa537ff903d5decd. The v6.44 preservation gate remains.

Validation passed at candidate 38a6b175dd18218c731ee2bd3b9cd2c23dc16032:
https://github.com/hiro191u3n2/android-autopager-update/actions/runs/43203877673
The complete npm regression suite, frozen-baseline checks and release package
validation passed. The root-result Chromium suite passed 13 scenarios, including
two actual frozen-v6.60 controls whose own diagnostic UI reports three
`different-background` rejections and zero markers. Current near-white and
translucent backgrounds are repaired. Native light, dark and custom-gray gaps
retain every pixel when compared at the same position with only the added
outer shadow temporarily disabled. The 25 inspector scenarios and 12 diagnostic
UI scenarios also passed, together with the existing layout, input, cleanup and
unrelated-site regressions.

The actual Android 15 / API 35 emulator ran the complete userscript with
WebView 124.0.6367.219. All 16 candidate/frozen-v6.60 screenshots passed on their
first capture attempt: near-white, translucent, native light and native dark,
each on pages 2/3. Forty-eight gap centers and 96 original outline edges matched
the expected colors within one RGB level. Twelve entire native gap crops
matched within one RGB level, and all eight source-relative layout comparisons
passed with a maximum difference of 0.000026703 CSS px (0.2px allowed). Content,
destinations, thumbnails, initial markup, 8px margins and inner shadows remained
intact. The final evidence has 16 measurements and no verification failures;
representative light/dark compositor screenshots were also inspected.

Validation also corrected two measurement errors without relaxing paint/color
expectations. The Chromium reference must temporarily override the outer
inline-important shadow directly; a screenshot stylesheet cannot override it.
Android raster coordinates use the measured DPR and snapped painted card edges,
not viewWidth divided by the independently rounded visualViewport.width. The
earlier Android run's original screenshots were preserved and all 16 passed
offline reanalysis before the successful fresh emulator run. The executable
was unchanged by those Android measurement corrections.

These are controlled structural fixtures derived from the supplied diagnostic,
not captured full Google HTML, the exact original three-store result list, or
verification on the owner's Android 17 / Berry / AdGuard device. The resolved
ancestor color on that device remains unknown; representative fixture colors
must not be described as measured device colors.

Verified release SHA-256 values:
- userscript and v6.61 alias: 0c8cd1e6c9b21036cad21bff3a00cb22cc4837e16ffd7b7f895f569f10fbd5fd
- metadata: c899a9598611eb8be80514df4be259eb1a776c3bdc8e49e3b3093345c219d910
- executable body: 35602d372de0c651a12fa2ee50f85ade1a65e04b1910cde6efc5854d0dca35ba

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

Validation passed at candidate c1132a5701f45ef96866ec91342b4fbcf89e3e78:
https://github.com/hiro191u3n2/android-autopager-update/actions/runs/43198068339
The complete npm regression suite, frozen-baseline checks and release package
validation passed. The new root-result Chromium suite has two frozen-v6.59
failure controls and four current missing/native-gutter light/dark scenarios,
covering frame/fetch imports, pages 2/3 and the delayed repair pass. All six
passed, together with 17 inspector and 12 diagnostic UI scenarios and the
existing grouped-result, input, cleanup and unrelated-site regression suites.

The actual Android 15 / API 35 emulator WebView ran the complete userscript in
16 screenshots: current/frozen v6.59, missing/native gutter, light/dark and
pages 2/3. The frozen missing-gutter cases painted zero separator rows; current
cases painted one band at each existing 8px gap. Native gutters remained single
bands. Text, links, images, initial-page markup and result dimensions remained
intact. Eight current/control geometry comparisons passed with a maximum
source-relative difference of 0.000027 CSS px (0.2px allowed). The final report
contains no verification failures, and light/dark compositor output was checked.

An initial harness comparison treated different page-2 scroll positions as a
layout change, although all 16 paint checks already passed. The runner now
records scroll coordinates and compares each box within the source root while
independently checking root dimensions. In the final run root document positions
also agree within 0.000004px. No production code was changed for this harness
correction. This is an offline structural reproduction based on the diagnostic,
not a capture of the original three-store DOM or a live Google, Berry/AdGuard
or physical-device verification.

The release and the script tested in Android have SHA-256
2f74b29b3fc8e514e355a70551b86b8eab002295ffc196d7b87c6f34ceabc5ed;
the metadata SHA-256 is
6eda4fd15b24bfaa81a53e4af1375fd6f41421f542380bf3fbc579bb54f1b4cc.
After the successful candidate, only this validation record and the update
page's historical v6.58 wording were revised; the executable was unchanged.

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
