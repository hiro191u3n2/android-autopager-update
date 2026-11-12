#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
release_version="${1:-}"
test "$project_dir" = /workspace/sites/android-autopager-update
test "$release_version" = 6.65.0
test "$(git -C "$project_dir" remote get-url origin)" = https://github.com/hiro191u3n2/android-autopager-update.git
test "$(git -C "$project_dir" branch --show-current)" = main
test "$(git -C "$project_dir" hash-object Android_Generic_AutoPager_v6.44.js)" = ee0c1d906375c7d34ebc3046719abef10d42c7ae
test "$(git -C "$project_dir" hash-object Android_Generic_AutoPager_v6.60.js)" = dfa28418b2ea6fb4af5ed7bcfa537ff903d5decd
test "$(git -C "$project_dir" hash-object Android_Generic_AutoPager_v6.61.js)" = a1f58d68dcb732d7803e28cc1764543cb006dfce
test "$(git -C "$project_dir" hash-object Android_Generic_AutoPager_v6.62.js)" = e74510bd3669085bab8a73f20b468757f4b166b4

git -C "$project_dir" diff --check
git -C "$project_dir" diff --cached --check
while IFS= read -r -d '' untracked_path; do
  check_output="$(git diff --no-index --check -- /dev/null "$project_dir/$untracked_path" 2>&1 || true)"
  if test -n "$check_output"; then
    printf '%s\n' "$check_output" >&2
    exit 1
  fi
done < <(git -C "$project_dir" ls-files --others --exclude-standard -z)

node --check "$project_dir/worker/index.js"
node --check "$project_dir/src/yahoo-realtime-autopager.js"
node --check "$project_dir/src/cityhill-gallery-compat.js"
node --check "$project_dir/src/fashion-product-guard.js"
node "$project_dir/scripts/test-buzzap.mjs"
node "$project_dir/tests/test_google_read_ahead_unit.mjs"
node "$project_dir/tests/test_google_read_ahead.mjs"
node "$project_dir/tests/test_google_group_gap_units.mjs"
node "$project_dir/tests/test_google_source_rows.mjs"
node "$project_dir/tests/test_google_touching_results.mjs"
node "$project_dir/tests/test_google_no_diagnostics.mjs"
node "$project_dir/tests/test_google_import_staging.mjs"
node "$project_dir/tests/test_google_mobile_cleanup.mjs"
node "$project_dir/tests/test_google_first_paint.mjs"
node "$project_dir/tests/test_yahoo_realtime.mjs"
node "$project_dir/tests/test_fashion_performance.mjs"
node "$project_dir/tests/test_cityhill_gallery.mjs"
node "$project_dir/tests/test_generic_commerce_images.mjs"
node "$project_dir/tests/test_google_layout.mjs"
node "$project_dir/tests/test_google_rich_import.mjs"
node "$project_dir/tests/test_google_organic_groups.mjs"
node "$project_dir/tests/test_google_root_results.mjs"
node "$project_dir/tests/test_google_cleanup.mjs"
node "$project_dir/tests/test_google_location_semantics.mjs"
node "$project_dir/tests/test_google_cleanup_boundaries.mjs"
node "$project_dir/tests/test_google_cleanup_liveness.mjs"
node "$project_dir/tests/test_google_input_performance.mjs"
release_dir="$(mktemp -d /tmp/android-autopager-release.XXXXXX)"
node "$project_dir/scripts/build-release.mjs" "$project_dir" "$release_dir" "$release_version"
node "$project_dir/scripts/verify-release.mjs" "$release_dir" "$release_version"
git -C "$project_dir" status --short --branch
printf 'Validated release directory: %s\n' "$release_dir"
