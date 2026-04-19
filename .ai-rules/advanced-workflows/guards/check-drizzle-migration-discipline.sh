#!/bin/bash
# Guard: keep database SQL files generated and managed by Drizzle Kit.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash .ai-rules/advanced-workflows/guards/check-drizzle-migration-discipline.sh [--against <ref>] [--staged] [--all] [--files <path...>] [--warn-only]

Options:
  --against <ref>      Compare against ref (default: origin/main if exists, else main, else HEAD~1)
  --staged             Check staged changes instead of commit-range diff
  --all                Scan all SQL files outside the configured Drizzle Kit output directory
  --files <path...>    Scan explicit files; must be the last option
  --warn-only          Print findings but exit 0
  -h, --help           Show help

Purpose:
  Database SQL files must live in the Drizzle Kit output directory configured in drizzle.config.ts.
  Table, column, index, and constraint changes must be made in
  server/lib/db/schema.ts and generated with pnpm db:generate.
  Data changes must use Drizzle ORM code paths, not self-managed SQL migration files.
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

configured_drizzle_out_dir() {
  local config_file="drizzle.config.ts"
  local configured_out

  if [ ! -f "$config_file" ]; then
    echo "FAIL: drizzle.config.ts is required for database migration governance" >&2
    exit 1
  fi

  configured_out="$(
    sed -nE "s/^[[:space:]]*out:[[:space:]]*['\"]([^'\"]+)['\"].*/\1/p" "$config_file" | head -n 1
  )"

  if [ -z "$configured_out" ]; then
    echo "FAIL: drizzle.config.ts must declare a static out directory for Drizzle Kit migrations" >&2
    exit 1
  fi

  configured_out="${configured_out#./}"
  configured_out="${configured_out%/}"

  if [ -z "$configured_out" ] || [ "$configured_out" = "." ]; then
    echo "FAIL: Drizzle Kit out directory must not be the repository root" >&2
    exit 1
  fi

  printf '%s\n' "$configured_out"
}

DRIZZLE_OUT_DIR="$(configured_drizzle_out_dir)"

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
    rg --files -g '*.sql' 2>/dev/null || true
  elif [ "$CHECK_STAGED" -eq 1 ]; then
    git diff --cached --name-only
  else
    if [ -z "$AGAINST_REF" ]; then
      AGAINST_REF="$(default_against_ref)"
    fi
    git diff --name-only "${AGAINST_REF}...HEAD"
  fi
}

is_sql_file() {
  case "$1" in
    *.sql) return 0 ;;
    *) return 1 ;;
  esac
}

is_drizzle_generated_sql() {
  case "$1" in
    "$DRIZZLE_OUT_DIR"/*.sql) return 0 ;;
    *) return 1 ;;
  esac
}

scan_file_all() {
  local file="$1"
  printf '1:SQL file outside configured Drizzle Kit output directory (%s/)\n' "$DRIZZLE_OUT_DIR"
}

scan_file_added_lines() {
  local file="$1"
  printf '1:SQL file outside configured Drizzle Kit output directory (%s/)\n' "$DRIZZLE_OUT_DIR"
}

TMP_FINDINGS="$(mktemp)"
trap 'rm -f "$TMP_FINDINGS"' EXIT

if [ "$CHECK_ALL" -eq 0 ] && [ "$CHECK_STAGED" -eq 0 ] && [ "${#EXPLICIT_FILES[@]}" -eq 0 ] && [ -z "$AGAINST_REF" ]; then
  AGAINST_REF="$(default_against_ref)"
fi

while IFS= read -r file; do
  [ -z "$file" ] && continue
  if ! is_sql_file "$file"; then
    continue
  fi
  if is_drizzle_generated_sql "$file"; then
    continue
  fi
  if [ ! -f "$file" ]; then
    continue
  fi

  if [ "$CHECK_ALL" -eq 1 ] || [ "${#EXPLICIT_FILES[@]}" -gt 0 ]; then
    findings="$(scan_file_all "$file")"
  else
    findings="$(scan_file_added_lines "$file")"
  fi

  if [ -n "$findings" ]; then
    printf '%s\n' "$findings" \
      | sed "s|^|${file}:|" >> "$TMP_FINDINGS" || true
  fi
done <<< "$(changed_files)"

if [ ! -s "$TMP_FINDINGS" ]; then
  echo "PASS: drizzle migration discipline check passed"
  exit 0
fi

if [ "$WARN_ONLY" -eq 1 ]; then
  echo "WARN: database SQL file found outside the configured Drizzle Kit output directory"
  cat "$TMP_FINDINGS"
  exit 0
fi

echo "FAIL: database SQL file found outside the configured Drizzle Kit output directory"
cat "$TMP_FINDINGS"
echo ""
echo "Change server/lib/db/schema.ts, run pnpm db:generate, then verify with pnpm db:check."
echo "Do not create self-managed SQL migration files; data changes must use Drizzle ORM code paths."
exit 1
