# Recovered development source

The owner approved reconstruction from the public GitHub main branch on 2026-10-16 (Asia/Tokyo), after workspace maintenance removed the old checkout. The previous Sites source checkout and its original browser regression tests were not recovered. Do not fabricate that source identity or reactivate the retired host.

- Canonical directory: `/workspace/sites/android-autopager-update`
- Actual source remote: `https://github.com/hiro191u3n2/android-autopager-update.git`
- Recovery commit: `462e8b7f1ac81184a6adc95204bbdfe6aca25c4e`
- Frozen baseline: `Android_Generic_AutoPager_v6.44.js`, Git blob `ee0c1d906375c7d34ebc3046719abef10d42c7ae`
- Local Node build entry: `worker/index.js`
- New behavior: `src/yahoo-realtime-autopager.js`
- Tests: `scripts/test-buzzap.mjs` (preservation, metadata, syntax and host isolation), `tests/test_yahoo_realtime.mjs` (DOM/event regression fixtures)

Install test dependencies with `npm install --ignore-scripts`. Build/validate with `bash scripts/validate-project.sh 6.45.0`. The validator checks the actual GitHub remote rather than the obsolete Sites remote. It retains the original release-packaging and production SHA-256 checks. Do not run old feature-specific build scripts during this release; they intentionally target their historical versions.

The current change appends no HTML and invents no pagination endpoint. It activates the existing Yahoo More button only in the search-result timeline. Apart from a host/path guard disabling the generic pager on that exact route, every pre-existing v6.44 executable byte is retained. Fixtures are not Android/AdGuard or live network verification.

Publish using the connected GitHub file tools, preserving all historical aliases. Confirm remote blobs and live Pages HTTP 200 plus exact userscript/metadata hashes before reporting completion.
