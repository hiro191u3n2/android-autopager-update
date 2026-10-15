# Recovered development source

The owner approved reconstruction from the public GitHub main branch on 2026-10-16 (Asia/Tokyo), after workspace maintenance removed the old checkout. The previous Sites source checkout and its original browser regression tests were not recovered. Do not fabricate that source identity or reactivate the retired host.

- Canonical directory: `/workspace/sites/android-autopager-update`
- Actual source remote: `https://github.com/hiro191u3n2/android-autopager-update.git`
- Recovery commit: `462e8b7f1ac81184a6adc95204bbdfe6aca25c4e`
- Frozen baseline: `Android_Generic_AutoPager_v6.44.js`, Git blob `ee0c1d906375c7d34ebc3046719abef10d42c7ae`
- Local Node build entry: `worker/index.js`
- Current modules: `src/yahoo-realtime-autopager.js`, `src/cityhill-gallery-compat.js`, `src/fashion-product-guard.js`, and the three fashion listing adapters.
- Tests: `scripts/test-buzzap.mjs` (preservation, metadata, syntax and host isolation), `tests/test_yahoo_realtime.mjs` (DOM/event regression fixtures), `tests/test_fashion_performance.mjs` (operation counts, pagination and product isolation), `tests/test_cityhill_gallery.mjs` (tap compatibility and gesture isolation).

Install test dependencies with `npm install --ignore-scripts`. Build/validate with `bash scripts/validate-project.sh 6.46.0`. The validator checks the actual GitHub remote rather than the obsolete Sites remote. It retains the original release-packaging and production SHA-256 checks. Do not run old feature-specific build scripts during this release; they intentionally target their historical versions.

v6.45 added the Yahoo More-button runtime and exact-route generic-core guard. v6.46 replaces only the three hash-pinned fashion adapter ranges: CITYHILL caches card identities and checks the last visible cards on scroll; all three adapters use native lazy loading for imported card images. Two exact-count substitutions also keep generic imported commerce-card images lazy (Product microdata or standard card classes); Google/Buzzap and non-commerce image behavior stay unchanged, verified by `tests/test_generic_commerce_images.mjs`. A product-detail guard runs before generic content scoring. CITYHILL gallery compatibility uses existing Swiper instances after a stationary tap only when native selection did not complete. It does not clone gallery nodes, rewrite main images, prevent default events, or poll during scrolling. Other legacy executable bytes are restored and compared exactly in the preservation test.

Evidence for v6.46: public CITYHILL item 945932 has 118 gallery slides. The unmodified official gallery switches on desktop Chrome; jsdom with the actual Swiper 11.2.10/item.js reproduces failure for DOM-click/touch-only sequences, equally with and without v6.45. Thus a userscript-caused thumbnail failure has not been proven. The compatibility fallback covers that input gap. Actual product HTML profiling shows unnecessary generic startup scans, but no persistent observers or image rewrites on that snapshot. CITYHILL listing operation counts do show a userscript bottleneck increasing with all loaded cards. Regression fixtures use controlled time/geometry; they are not Android/AdGuard performance or live network verification.

Publish using the connected GitHub file tools, preserving all historical aliases. Confirm remote blobs and live Pages HTTP 200 plus exact userscript/metadata hashes before reporting completion.
