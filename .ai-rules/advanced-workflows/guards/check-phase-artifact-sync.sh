#!/bin/bash
# check-phase-artifact-sync.sh
# Fail in worktree mode when phase artifacts are not synced to primary workspace.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash .ai-rules/advanced-workflows/guards/check-phase-artifact-sync.sh [--phase-id <phase_id>]

Options:
  --phase-id <phase_id>   Explicit phase_id. Defaults to branch suffix after "<type>/".
  -h, --help              Show help
EOF
}

PHASE_ID=""

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

COMMON_DIR="$(git rev-parse --git-common-dir)"
if [ -z "$COMMON_DIR" ]; then
  echo "FAIL: unable to resolve git common dir"
  exit 1
fi
if [ "${COMMON_DIR#/}" = "$COMMON_DIR" ]; then
  COMMON_DIR="${REPO_ROOT}/${COMMON_DIR}"
fi
COMMON_DIR="$(cd "$(dirname "$COMMON_DIR")" && pwd)/$(basename "$COMMON_DIR")"
PRIMARY_ROOT="$(dirname "$COMMON_DIR")"

if [ "$REPO_ROOT" = "$PRIMARY_ROOT" ]; then
  echo "PASS: current workspace is primary workspace (no sync check needed)"
  exit 0
fi

if [ -z "$PHASE_ID" ]; then
  BRANCH_NAME="$(git branch --show-current)"
  PHASE_ID="${BRANCH_NAME#*/}"
  if [ -z "$PHASE_ID" ] || [ "$PHASE_ID" = "$BRANCH_NAME" ]; then
    echo "FAIL: unable to infer phase_id from branch '${BRANCH_NAME}', use --phase-id"
    exit 1
  fi
fi

SYNC_CMD=(bash .ai-rules/advanced-workflows/scripts/sync-phase-artifacts.sh --phase-id "$PHASE_ID" --dry-run)
SYNC_OUTPUT="$("${SYNC_CMD[@]}" 2>&1 || true)"

if echo "$SYNC_OUTPUT" | grep -q '^PASS: artifact sync completed'; then
  echo "FAIL: unsynced phase artifacts detected for phase_id=${PHASE_ID}"
  echo "Run:"
  echo "  bash .ai-rules/advanced-workflows/scripts/sync-phase-artifacts.sh --phase-id ${PHASE_ID}"
  exit 1
fi

if echo "$SYNC_OUTPUT" | grep -q '^INFO: already in primary workspace, nothing to sync'; then
  echo "PASS: current workspace is primary workspace (no sync check needed)"
  exit 0
fi

echo "PASS: phase artifacts are synced for phase_id=${PHASE_ID}"
