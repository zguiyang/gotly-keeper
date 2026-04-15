#!/bin/bash
# sync-phase-artifacts.sh
# Sync local phase execution artifacts from current worktree to the primary workspace.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash .ai-rules/scripts/sync-phase-artifacts.sh [--phase-id <phase_id>] [--dry-run]

Options:
  --phase-id <phase_id>   Sync only files prefixed with <phase_id>
  --dry-run               Preview operations without writing
  -h, --help              Show help

Notes:
  - Source is always current worktree: docs/superpowers/plans/artifacts/
  - Target is always primary workspace: docs/superpowers/plans/artifacts/
  - Artifacts remain local workspace files and must not be staged/committed.
EOF
}

PHASE_ID=""
DRY_RUN=0

while [ $# -gt 0 ]; do
  case "$1" in
    --phase-id)
      PHASE_ID="${2:-}"
      if [ -z "$PHASE_ID" ]; then
        echo "FAIL: missing value for --phase-id"
        exit 1
      fi
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
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

CURRENT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$CURRENT_ROOT" ]; then
  echo "FAIL: not inside a git repository"
  exit 1
fi

COMMON_DIR="$(git rev-parse --git-common-dir)"
if [ -z "$COMMON_DIR" ]; then
  echo "FAIL: unable to resolve git common dir"
  exit 1
fi
if [ "${COMMON_DIR#/}" = "$COMMON_DIR" ]; then
  COMMON_DIR="${CURRENT_ROOT}/${COMMON_DIR}"
fi
COMMON_DIR="$(cd "$(dirname "$COMMON_DIR")" && pwd)/$(basename "$COMMON_DIR")"

if [ "$(basename "$COMMON_DIR")" != ".git" ]; then
  echo "FAIL: expected git common dir to end with .git, got: ${COMMON_DIR}"
  exit 1
fi

PRIMARY_ROOT="$(dirname "$COMMON_DIR")"
SOURCE_DIR="${CURRENT_ROOT}/docs/superpowers/plans/artifacts"
TARGET_DIR="${PRIMARY_ROOT}/docs/superpowers/plans/artifacts"

mkdir -p "$SOURCE_DIR"
mkdir -p "$TARGET_DIR"

if [ "$CURRENT_ROOT" = "$PRIMARY_ROOT" ]; then
  echo "INFO: already in primary workspace, nothing to sync"
  exit 0
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "FAIL: rsync is required but not found"
  exit 1
fi

RSYNC_ARGS=(-a --prune-empty-dirs)
if [ "$DRY_RUN" -eq 1 ]; then
  RSYNC_ARGS+=(-n -v)
fi
if [ -n "$PHASE_ID" ]; then
  RSYNC_ARGS+=(--include "${PHASE_ID}*" --exclude "*")
fi

echo "==> Syncing artifacts"
echo "  from: ${SOURCE_DIR}"
echo "  to:   ${TARGET_DIR}"
if [ -n "$PHASE_ID" ]; then
  echo "  filter: ${PHASE_ID}*"
fi

rsync "${RSYNC_ARGS[@]}" "${SOURCE_DIR}/" "${TARGET_DIR}/"

echo "PASS: artifact sync completed"
