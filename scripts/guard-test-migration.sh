#!/bin/bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash scripts/guard-test-migration.sh [--against <ref>] [--staged]

Options:
  --against <ref>   Compare against ref (default: origin/main if exists, else main, else HEAD~1)
  --staged          Check staged changes instead of commit-range diff
  -h, --help        Show help
EOF
}

AGAINST_REF=""
CHECK_STAGED=0

while [ $# -gt 0 ]; do
  case "$1" in
    --against)
      AGAINST_REF="${2:-}"
      shift 2
      ;;
    --staged)
      CHECK_STAGED=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "FAIL: unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  echo "FAIL: not inside a git repository"
  exit 1
fi
cd "$REPO_ROOT"

if [ "$CHECK_STAGED" -eq 1 ]; then
  CHANGES="$(git diff --cached --name-status)"
else
  if [ -z "$AGAINST_REF" ]; then
    if git show-ref --verify --quiet refs/remotes/origin/main; then
      AGAINST_REF="origin/main"
    elif git show-ref --verify --quiet refs/heads/main; then
      AGAINST_REF="main"
    else
      AGAINST_REF="HEAD~1"
    fi
  fi
  CHANGES="$(git diff --name-status "${AGAINST_REF}...HEAD")"
fi

if [ -z "$CHANGES" ] && [ "$CHECK_STAGED" -eq 0 ]; then
  CHANGES="$(git diff --name-status HEAD~1..HEAD 2>/dev/null || true)"
fi

CHANGES_NORMALIZED="$(printf '%s\n' "$CHANGES" | awk 'BEGIN{OFS="\t"} $1 ~ /^R[0-9]*$/ {print "D", $2; print "A", $3; next} {print substr($1,1,1), $2}')"

ALL_SERVICE_TEST_DELETIONS="$(printf '%s\n' "$CHANGES_NORMALIZED" | awk '$1=="D" && $2 ~ /^tests\/unit\/server\/services\/[^\/]+\/.*\.test\.ts$/ { print $2 }')"

LEGACY_DELETIONS=""
if [ -n "$ALL_SERVICE_TEST_DELETIONS" ]; then
  while IFS= read -r deleted_file; do
    [ -z "$deleted_file" ] && continue
    domain="$(printf '%s\n' "$deleted_file" | cut -d'/' -f5)"
    if [ ! -d "server/services/$domain" ]; then
      LEGACY_DELETIONS+="$deleted_file"$'\n'
    fi
  done <<< "$ALL_SERVICE_TEST_DELETIONS"
fi

LEGACY_DELETIONS="$(printf '%s' "$LEGACY_DELETIONS" | sed '/^$/d' || true)"

if [ -z "$LEGACY_DELETIONS" ]; then
  echo "PASS: no legacy service test deletions detected"
  exit 0
fi

ALL_SERVICE_TEST_ADDS="$(printf '%s\n' "$CHANGES_NORMALIZED" | awk '$1=="A" && $2 ~ /^tests\/unit\/server\/services\/[^\/]+\/.*\.test\.ts$/ { print $2 }')"

REPLACEMENT_ADDS=""
if [ -n "$ALL_SERVICE_TEST_ADDS" ]; then
  while IFS= read -r added_file; do
    [ -z "$added_file" ] && continue
    domain="$(printf '%s\n' "$added_file" | cut -d'/' -f5)"
    if [ -d "server/services/$domain" ]; then
      REPLACEMENT_ADDS+="$added_file"$'\n'
    fi
  done <<< "$ALL_SERVICE_TEST_ADDS"
fi

REPLACEMENT_ADDS="$(printf '%s' "$REPLACEMENT_ADDS" | sed '/^$/d' || true)"

if [ -z "$REPLACEMENT_ADDS" ]; then
  echo "FAIL: legacy service tests were deleted but no replacement tests were added in active service domains"
  echo "Deleted legacy tests:"
  echo "$LEGACY_DELETIONS"
  echo ""
  echo "Add replacement tests under tests/unit/server/services/<new-domain>/ before merge."
  exit 1
fi

echo "PASS: legacy test migration guard satisfied"
echo "Deleted legacy tests:"
echo "$LEGACY_DELETIONS"
echo ""
echo "Replacement tests added:"
echo "$REPLACEMENT_ADDS"
