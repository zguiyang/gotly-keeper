#!/bin/bash
# Guard: flag page-specific selector groups that were placed in app/globals.css.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash .ai-rules/advanced-workflows/guards/check-global-css-placement.sh [--css <path>] [--warn-only] [--allow-prefix <prefix>]

Options:
  --css <path>              CSS file to inspect (default: app/globals.css)
  --warn-only               Print findings but exit 0
  --allow-prefix <prefix>   Allow a selector prefix such as auth or type
  -h, --help                Show help

Purpose:
  app/globals.css is for shared system styling, theme tokens, base styles, and
  truly reusable utilities. This guard flags route/page-specific selector
  families such as .landing-* when they live in global CSS and are used by only
  one or two source files.
EOF
}

CSS_PATH="app/globals.css"
WARN_ONLY=0

ALLOW_PREFIXES=(
  "dark"
  "font"
  "focus"
  "interactive"
  "no"
  "surface"
  "type"
  "auth"
)

while [ $# -gt 0 ]; do
  case "$1" in
    --css)
      CSS_PATH="${2:-}"
      shift 2
      ;;
    --warn-only)
      WARN_ONLY=1
      shift
      ;;
    --allow-prefix)
      ALLOW_PREFIXES+=("${2:-}")
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

if [ ! -f "$CSS_PATH" ]; then
  echo "PASS: CSS file not found: $CSS_PATH"
  exit 0
fi

if ! command -v rg >/dev/null 2>&1; then
  echo "FAIL: ripgrep (rg) is required for this guard"
  exit 1
fi

is_allowed_prefix() {
  local prefix="$1"
  local allowed
  for allowed in "${ALLOW_PREFIXES[@]}"; do
    if [ "$prefix" = "$allowed" ]; then
      return 0
    fi
  done
  return 1
}

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

SELECTORS_FILE="$TMP_DIR/selectors.txt"
PREFIXES_FILE="$TMP_DIR/prefixes.txt"
FINDINGS_FILE="$TMP_DIR/findings.txt"

rg --no-heading --no-line-number --only-matching '\.[_a-zA-Z][-_a-zA-Z0-9]*' "$CSS_PATH" \
  | sed 's/^\.//' \
  | sort -u > "$SELECTORS_FILE"

: > "$PREFIXES_FILE"
: > "$FINDINGS_FILE"

while IFS= read -r selector; do
  case "$selector" in
    *-*) prefix="${selector%%-*}" ;;
    *) prefix="$selector" ;;
  esac

  if is_allowed_prefix "$prefix"; then
    continue
  fi

  echo "$prefix" >> "$PREFIXES_FILE"
done < "$SELECTORS_FILE"

if [ ! -s "$PREFIXES_FILE" ]; then
  echo "PASS: no suspicious global CSS selector prefixes found"
  exit 0
fi

sort "$PREFIXES_FILE" | uniq -c | sort -nr | while read -r count prefix; do
  if [ "$count" -lt 3 ]; then
    continue
  fi

  PREFIX_SELECTORS_FILE="$TMP_DIR/${prefix}-selectors.txt"
  PREFIX_USAGE_FILE="$TMP_DIR/${prefix}-usage.txt"

  grep -E "^${prefix}(-|$)" "$SELECTORS_FILE" > "$PREFIX_SELECTORS_FILE" || true
  : > "$PREFIX_USAGE_FILE"

  while IFS= read -r selector; do
    rg --files-with-matches --fixed-strings "$selector" app components client hooks config 2>/dev/null \
      | grep -v "^${CSS_PATH}$" >> "$PREFIX_USAGE_FILE" || true
  done < "$PREFIX_SELECTORS_FILE"

  sort -u "$PREFIX_USAGE_FILE" -o "$PREFIX_USAGE_FILE"
  usage_count="$(wc -l < "$PREFIX_USAGE_FILE" | tr -d ' ')"

  if [ "$usage_count" -le 2 ]; then
    {
      echo "prefix: ${prefix}"
      echo "  selectors: ${count}"
      echo "  usage files: ${usage_count}"
      if [ "$usage_count" -gt 0 ]; then
        sed 's/^/    - /' "$PREFIX_USAGE_FILE"
      else
        echo "    - no source usage found"
      fi
    } >> "$FINDINGS_FILE"
  fi
done

if [ ! -s "$FINDINGS_FILE" ]; then
  echo "PASS: no page-specific global CSS selector groups detected"
  exit 0
fi

if [ "$WARN_ONLY" -eq 1 ]; then
  echo "WARN: page-specific selector groups detected in $CSS_PATH"
  cat "$FINDINGS_FILE"
  exit 0
fi

echo "FAIL: page-specific selector groups detected in $CSS_PATH"
cat "$FINDINGS_FILE"
echo ""
echo "Move route/component-specific styling to Tailwind className composition or local components."
echo "Keep app/globals.css for theme tokens, base styles, and genuinely shared utilities only."
exit 1
