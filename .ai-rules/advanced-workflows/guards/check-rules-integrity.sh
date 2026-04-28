#!/bin/bash
# check-rules-integrity.sh
# Guard: block unintended edits to AI governance source of truth files.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash .ai-rules/advanced-workflows/guards/check-rules-integrity.sh [--against <ref>] [--staged] [--allow-env <VAR_NAME>]

Options:
  --against <ref>      Compare against ref (default: origin/main if exists, else main, else HEAD~1)
  --staged             Check staged changes instead of commit-range diff
  --allow-env <name>   Environment variable name to allow protected-file changes (default: ALLOW_RULE_CHANGES)
  -h, --help           Show help
EOF
}

AGAINST_REF=""
CHECK_STAGED=0
ALLOW_ENV_NAME="ALLOW_RULE_CHANGES"

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
    --allow-env)
      ALLOW_ENV_NAME="${2:-}"
      shift 2
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
  CHANGED_FILES="$(git diff --cached --name-only)"
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
  CHANGED_FILES="$(git diff --name-only "${AGAINST_REF}...HEAD")"
fi

PROTECTED_CHANGES="$(echo "$CHANGED_FILES" | grep -E '^(AGENTS\.md|PROJECT_CAPABILITIES\.md|\.ai-rules/|\.github/workflows/architecture-and-governance-guards\.yml$)' || true)"

if [ -z "$PROTECTED_CHANGES" ]; then
  echo "PASS: no protected governance file changes detected"
  exit 0
fi

ALLOW_VALUE="${!ALLOW_ENV_NAME:-}"
if [ "$ALLOW_VALUE" = "1" ] || [ "$ALLOW_VALUE" = "true" ]; then
  echo "WARN: protected governance files changed but explicitly allowed by ${ALLOW_ENV_NAME}=${ALLOW_VALUE}"
  echo "$PROTECTED_CHANGES"
  exit 0
fi

echo "FAIL: protected governance files changed without explicit approval flag"
echo "Changed files:"
echo "$PROTECTED_CHANGES"
echo ""
echo "If this change is approved, rerun with environment override:"
echo "  ${ALLOW_ENV_NAME}=1 bash .ai-rules/advanced-workflows/guards/check-rules-integrity.sh"
exit 1
