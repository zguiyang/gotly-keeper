#!/bin/bash
# Guard: keep stable AI model prompts in server/prompts/*.md templates.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash .ai-rules/advanced-workflows/guards/check-ai-prompt-templates.sh [--against <ref>] [--staged] [--all] [--files <path...>] [--warn-only]

Options:
  --against <ref>      Compare against ref (default: origin/main if exists, else main, else HEAD~1)
  --staged             Check staged changes instead of commit-range diff
  --all                Scan all server TypeScript files
  --files <path...>    Scan explicit files; must be the last option
  --warn-only          Print findings but exit 0
  -h, --help           Show help

Purpose:
  Stable system/user prompts for model calls belong in server/prompts/**/*.md
  and should be read with renderPrompt(). Dynamic content should be passed as
  template variables or typed prompt input objects.
EOF
}

AGAINST_REF=""
CHECK_STAGED=0
CHECK_ALL=0
WARN_ONLY=0
EXPLICIT_FILES=()

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
    --all)
      CHECK_ALL=1
      shift
      ;;
    --files)
      shift
      while [ $# -gt 0 ]; do
        EXPLICIT_FILES+=("$1")
        shift
      done
      ;;
    --warn-only)
      WARN_ONLY=1
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

if [ "$CHECK_STAGED" -eq 1 ] && [ "$CHECK_ALL" -eq 1 ]; then
  echo "FAIL: --staged and --all cannot be used together"
  exit 1
fi

if [ "${#EXPLICIT_FILES[@]}" -gt 0 ] && { [ "$CHECK_STAGED" -eq 1 ] || [ "$CHECK_ALL" -eq 1 ] || [ -n "$AGAINST_REF" ]; }; then
  echo "FAIL: --files cannot be combined with --staged, --all, or --against"
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

if ! command -v rg >/dev/null 2>&1; then
  echo "FAIL: ripgrep (rg) is required for this guard"
  exit 1
fi

default_against_ref() {
  if git show-ref --verify --quiet refs/remotes/origin/main; then
    echo "origin/main"
  elif git show-ref --verify --quiet refs/heads/main; then
    echo "main"
  else
    echo "HEAD~1"
  fi
}

changed_files() {
  if [ "${#EXPLICIT_FILES[@]}" -gt 0 ]; then
    printf '%s\n' "${EXPLICIT_FILES[@]}"
  elif [ "$CHECK_ALL" -eq 1 ]; then
    rg --files server -g '*.ts' -g '*.tsx' 2>/dev/null || true
  elif [ "$CHECK_STAGED" -eq 1 ]; then
    git diff --cached --name-only
  else
    if [ -z "$AGAINST_REF" ]; then
      AGAINST_REF="$(default_against_ref)"
    fi
    git diff --name-only "${AGAINST_REF}...HEAD"
  fi
}

is_server_ts_file() {
  case "$1" in
    server/*.ts|server/*.tsx|server/**/*.ts|server/**/*.tsx) return 0 ;;
    *) return 1 ;;
  esac
}

has_model_call_context() {
  local file="$1"
  rg -q 'generateText|streamText|generateObject|streamObject|runAiGeneration|embed\(|embedMany\(' "$file" 2>/dev/null
}

scan_file_all() {
  local file="$1"

  awk '
    /AI_PROMPT_INLINE_EXCEPTION:/ { next }
    /^[[:space:]]*(system|prompt|systemPrompt|userPrompt):[[:space:]]*["'\''`]/ {
      print FNR ":" $0
      next
    }
    /^[[:space:]]*(system|prompt|systemPrompt|userPrompt):[[:space:]]*$/ {
      pending=FNR ":" $0
      next
    }
    pending && /^[[:space:]]*$/ { next }
    pending && /^[[:space:]]*["'\''`]/ {
      print pending
      print FNR ":" $0
      pending=""
      next
    }
    pending { pending="" }
  ' "$file"
}

TMP_FINDINGS="$(mktemp)"
trap 'rm -f "$TMP_FINDINGS"' EXIT

while IFS= read -r file; do
  [ -z "$file" ] && continue
  if ! is_server_ts_file "$file"; then
    continue
  fi
  if [ ! -f "$file" ]; then
    continue
  fi
  if ! has_model_call_context "$file"; then
    continue
  fi

  findings="$(scan_file_all "$file")"

  if [ -n "$findings" ]; then
    printf '%s\n' "$findings" \
      | sed "s|^|${file}:|" >> "$TMP_FINDINGS" || true
  fi
done <<< "$(changed_files)"

if [ ! -s "$TMP_FINDINGS" ]; then
  echo "PASS: AI prompt template check passed"
  exit 0
fi

if [ "$WARN_ONLY" -eq 1 ]; then
  echo "WARN: inline AI model prompt literals found"
  cat "$TMP_FINDINGS"
  exit 0
fi

echo "FAIL: inline AI model prompt literals found"
cat "$TMP_FINDINGS"
echo ""
echo "Move stable model prompt text into server/prompts/**/*.md and read it with renderPrompt()."
echo "Use AI_PROMPT_INLINE_EXCEPTION: <reason> only for approved one-off exceptions."
exit 1
