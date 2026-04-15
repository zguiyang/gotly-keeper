#!/bin/bash
# create-ai-worktree.sh
# Create a phase worktree from latest origin/main and persist rule baseline metadata.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash .ai-rules/scripts/create-ai-worktree.sh <phase_id> [branch_type]

Examples:
  bash .ai-rules/scripts/create-ai-worktree.sh phase-assets-owner-matrix feat
  bash .ai-rules/scripts/create-ai-worktree.sh phase-assets-boundary-hardening refactor

Notes:
  - branch is created as: <branch_type>/<phase_id>
  - worktree path is: .worktrees/<phase_id>
  - baseline metadata is stored in worktree git metadata (not tracked files)
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

PHASE_ID="${1:-}"
BRANCH_TYPE="${2:-feat}"

if [ -z "$PHASE_ID" ]; then
  echo "FAIL: missing <phase_id>"
  usage
  exit 1
fi

if ! [[ "$BRANCH_TYPE" =~ ^(feat|fix|refactor|ui|chore)$ ]]; then
  echo "FAIL: branch_type must be one of: feat|fix|refactor|ui|chore"
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  echo "FAIL: not inside a git repository"
  exit 1
fi
cd "$REPO_ROOT"

if [ ! -f "AGENTS.md" ] || [ ! -f ".ai-rules/README.md" ]; then
  echo "FAIL: repository does not match expected rule entry layout"
  echo "Expected files: AGENTS.md and .ai-rules/README.md"
  exit 1
fi

echo "==> Fetching latest refs..."
git fetch --all --prune

if ! git show-ref --verify --quiet refs/remotes/origin/main; then
  echo "FAIL: origin/main not found"
  exit 1
fi

BRANCH_NAME="${BRANCH_TYPE}/${PHASE_ID}"
WORKTREE_PATH=".worktrees/${PHASE_ID}"

if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
  echo "FAIL: local branch already exists: ${BRANCH_NAME}"
  exit 1
fi

if [ -d "$WORKTREE_PATH" ]; then
  echo "FAIL: worktree path already exists: ${WORKTREE_PATH}"
  exit 1
fi

echo "==> Creating worktree: ${WORKTREE_PATH}"
git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" origin/main

BASELINE_MAIN_SHA="$(git rev-parse origin/main)"
BASELINE_RULES_TREE="$(git rev-parse origin/main:.ai-rules)"
BASELINE_FILE="$(git -C "$WORKTREE_PATH" rev-parse --git-path ai-rules-baseline)"

cat > "$BASELINE_FILE" <<EOF
RULES_BASELINE_MAIN_SHA=${BASELINE_MAIN_SHA}
RULES_BASELINE_TREE_SHA=${BASELINE_RULES_TREE}
RULES_BASELINE_CREATED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RULES_BASELINE_SOURCE=origin/main
EOF

echo "==> Running bootstrap check..."
bash .ai-rules/scripts/ai-bootstrap-check.sh --worktree "$WORKTREE_PATH"

echo ""
echo "PASS: worktree ready"
echo "  branch:   ${BRANCH_NAME}"
echo "  path:     ${WORKTREE_PATH}"
echo "  baseline: ${BASELINE_MAIN_SHA}"

