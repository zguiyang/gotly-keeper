#!/bin/bash
# Guard: block frontend implementation colors that bypass semantic design tokens.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash .ai-rules/advanced-workflows/guards/check-design-token-usage.sh [--against <ref>] [--staged] [--all] [--warn-only] [--allow-env <VAR_NAME>]

Options:
  --against <ref>      Compare against ref (default: origin/main if exists, else main, else HEAD~1)
  --staged             Check staged changes instead of commit-range diff
  --all                Scan all frontend implementation files
  --warn-only          Print findings but exit 0
  --allow-env <name>   Environment variable name to allow findings (default: ALLOW_DESIGN_TOKEN_EXCEPTION)
  -h, --help           Show help

Purpose:
  Frontend UI colors should come from semantic design tokens so contrast and
  light/dark theme behavior stay centralized. This guard scans frontend pages,
  components, hooks, client code, and frontend config for added color literals,
  arbitrary Tailwind color utilities, and Tailwind built-in palette colors.

Approved one-off exceptions must be local and include:
  DESIGN_TOKEN_EXCEPTION: <short reason>
EOF
}

AGAINST_REF=""
CHECK_STAGED=0
CHECK_ALL=0
WARN_ONLY=0
ALLOW_ENV_NAME="ALLOW_DESIGN_TOKEN_EXCEPTION"

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
    --warn-only)
      WARN_ONLY=1
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

if [ "$CHECK_STAGED" -eq 1 ] && [ "$CHECK_ALL" -eq 1 ]; then
  echo "FAIL: --staged and --all cannot be used together"
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  echo "FAIL: not inside a git repository"
  exit 1
fi
cd "$REPO_ROOT"

if ! command -v rg >/dev/null 2>&1; then
  echo "FAIL: ripgrep (rg) is required for this guard"
  exit 1
fi

is_frontend_file() {
  local file="$1"

  case "$file" in
    app/globals.css|components/ui/*)
      return 1
      ;;
  esac

  case "$file" in
    app/*|components/*|hooks/*|client/*|config/*)
      ;;
    *)
      return 1
      ;;
  esac

  case "$file" in
    *.ts|*.tsx|*.js|*.jsx|*.css|*.module.css)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

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
  if [ "$CHECK_ALL" -eq 1 ]; then
    rg --files app components hooks client config 2>/dev/null || true
  elif [ "$CHECK_STAGED" -eq 1 ]; then
    git diff --cached --name-only
  else
    if [ -z "$AGAINST_REF" ]; then
      AGAINST_REF="$(default_against_ref)"
    fi
    git diff --name-only "${AGAINST_REF}...HEAD"
  fi
}

scan_file_all() {
  local file="$1"
  rg --no-heading -n "$BLOCKED_PATTERN" "$file" 2>/dev/null || true
}

scan_file_added_lines() {
  local file="$1"
  local diff_output

  if [ "$CHECK_STAGED" -eq 1 ]; then
    diff_output="$(git diff --cached --unified=0 -- "$file")"
  else
    diff_output="$(git diff --unified=0 "${AGAINST_REF}...HEAD" -- "$file")"
  fi

  printf '%s\n' "$diff_output" \
    | grep -E '^\+' \
    | grep -Ev '^\+\+\+' \
    | sed 's/^+//' \
    | rg --no-heading -n "$BLOCKED_PATTERN" 2>/dev/null || true
}

TAILWIND_COLOR_ROLES='(bg|text|border|from|to|via|ring|shadow|outline|decoration|accent|caret|fill|stroke|divide|placeholder)'
TAILWIND_PALETTES='(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)'
ARBITRARY_COLOR_VALUE='(#|rgba?\(|hsla?\(|color-mix\(|oklch\(|lab\(|lch\()'
BLOCKED_PATTERN="(#[0-9A-Fa-f]{3,8}|\\brgba?\\(|\\bhsla?\\(|${TAILWIND_COLOR_ROLES}-\\[[^]]*${ARBITRARY_COLOR_VALUE}[^]]*\\]|${TAILWIND_COLOR_ROLES}-${TAILWIND_PALETTES}(-[0-9]{2,3})?(/[0-9]{1,3})?\\b|:[[:space:]]*(white|black)\\b|color-mix\\([^;]*(white|black|#[0-9A-Fa-f]{3,8}|rgba?\\(|hsla?\\())"

TMP_FINDINGS="$(mktemp)"
trap 'rm -f "$TMP_FINDINGS"' EXIT

if [ "$CHECK_ALL" -eq 0 ] && [ "$CHECK_STAGED" -eq 0 ] && [ -z "$AGAINST_REF" ]; then
  AGAINST_REF="$(default_against_ref)"
fi

while IFS= read -r file; do
  [ -z "$file" ] && continue
  if ! is_frontend_file "$file"; then
    continue
  fi
  if [ ! -f "$file" ]; then
    continue
  fi

  if [ "$CHECK_ALL" -eq 1 ]; then
    findings="$(scan_file_all "$file")"
  else
    findings="$(scan_file_added_lines "$file")"
  fi

  if [ -n "$findings" ]; then
    printf '%s\n' "$findings" \
      | grep -v 'DESIGN_TOKEN_EXCEPTION:' \
      | sed "s|^|${file}:|" >> "$TMP_FINDINGS" || true
  fi
done <<< "$(changed_files)"

if [ ! -s "$TMP_FINDINGS" ]; then
  echo "PASS: design-token usage check passed"
  exit 0
fi

ALLOW_VALUE="${!ALLOW_ENV_NAME:-}"
if [ "$ALLOW_VALUE" = "1" ] || [ "$ALLOW_VALUE" = "true" ]; then
  echo "WARN: design-token bypasses detected but explicitly allowed by ${ALLOW_ENV_NAME}=${ALLOW_VALUE}"
  cat "$TMP_FINDINGS"
  exit 0
fi

if [ "$WARN_ONLY" -eq 1 ]; then
  echo "WARN: frontend color values bypass semantic design tokens"
  cat "$TMP_FINDINGS"
  exit 0
fi

echo "FAIL: frontend color values bypass semantic design tokens"
cat "$TMP_FINDINGS"
echo ""
echo "Use semantic token utilities such as bg-primary/10, text-muted-foreground, border-border, or status-success."
echo "Raw colors, arbitrary color utilities, and Tailwind built-in palette colors require user approval and a local DESIGN_TOKEN_EXCEPTION: comment."
exit 1
