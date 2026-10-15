#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
release_version="${1:-}"
test "$project_dir" = /workspace/sites/android-autopager-update
test "$release_version" = 6.45.0
test "$(git -C "$project_dir" remote get-url origin)" = https://github.com/hiro191u3n2/android-autopager-update.git
test "$(git -C "$project_dir" branch --show-current)" = main
test "$(git -C "$project_dir" hash-object Android_Generic_AutoPager_v6.44.js)" = ee0c1d906375c7d34ebc3046719abef10d42c7ae

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
node "$project_dir/scripts/test-buzzap.mjs"
node "$project_dir/tests/test_yahoo_realtime.mjs"
release_dir="$(mktemp -d /tmp/android-autopager-release.XXXXXX)"
node "$project_dir/scripts/build-release.mjs" "$project_dir" "$release_dir" "$release_version"
node "$project_dir/scripts/verify-release.mjs" "$release_dir" "$release_version"
git -C "$project_dir" status --short --branch
printf 'Validated release directory: %s\n' "$release_dir"
