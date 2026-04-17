#!/bin/bash
# ai-bootstrap-check.sh
# Validate that current (or target) worktree is using expected AI rule entry and baseline.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash .ai-rules/advanced-workflows/scripts/ai-bootstrap-check.sh [--worktree <path>] [--strict] [--init-baseline] [--allow-rules-drift]

Options:
  --worktree <path>   Check a specific worktree path (default: current directory)
  --strict            Also run boundary guards as preflight
  --init-baseline     Initialize baseline metadata for current workspace if missing
  --allow-rules-drift Allow rule baseline drift (same as ALLOW_RULE_DRIFT=1)
  -h, --help          Show help
EOF
}

TARGET_DIR="."
STRICT_MODE=0
ARG_ALLOW_RULE_DRIFT=0
INIT_BASELINE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --worktree)
      TARGET_DIR="${2:-}"
      shift 2
      ;;
    --strict)
      STRICT_MODE=1
      shift
      ;;
    --allow-rules-drift)
      ARG_ALLOW_RULE_DRIFT=1
      shift
      ;;
    --init-baseline)
      INIT_BASELINE=1
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

if [ -z "$TARGET_DIR" ] || [ ! -d "$TARGET_DIR" ]; then
  echo "FAIL: invalid worktree path: ${TARGET_DIR}"
  exit 1
fi

REPO_ROOT="$(git -C "$TARGET_DIR" rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  echo "FAIL: target is not a git worktree: ${TARGET_DIR}"
  exit 1
fi

if [ ! -f "$REPO_ROOT/AGENTS.md" ]; then
  echo "FAIL: AGENTS.md missing at repository root"
  exit 1
fi

if [ ! -f "$REPO_ROOT/.ai-rules/core/README.md" ]; then
  echo "FAIL: .ai-rules/core/README.md missing"
  exit 1
fi

BASELINE_FILE="$(git -C "$TARGET_DIR" rev-parse --git-path ai-rules-baseline)"
if [ ! -f "$BASELINE_FILE" ]; then
  if [ "$INIT_BASELINE" -eq 1 ]; then
    BASELINE_MAIN_SHA="$(git -C "$TARGET_DIR" rev-parse HEAD)"
    BASELINE_RULES_TREE="$(git -C "$TARGET_DIR" rev-parse HEAD:.ai-rules)"
    BASELINE_SOURCE="HEAD"
    if git -C "$TARGET_DIR" show-ref --verify --quiet refs/remotes/origin/main; then
      BASELINE_MAIN_SHA="$(git -C "$TARGET_DIR" rev-parse origin/main)"
      BASELINE_RULES_TREE="$(git -C "$TARGET_DIR" rev-parse origin/main:.ai-rules)"
      BASELINE_SOURCE="origin/main"
    fi
    cat > "$BASELINE_FILE" <<EOF
RULES_BASELINE_MAIN_SHA=${BASELINE_MAIN_SHA}
RULES_BASELINE_TREE_SHA=${BASELINE_RULES_TREE}
RULES_BASELINE_CREATED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RULES_BASELINE_SOURCE=${BASELINE_SOURCE}
EOF
    echo "INFO: baseline initialized at ${BASELINE_FILE} from ${BASELINE_SOURCE}"
  else
    echo "FAIL: rules baseline metadata missing for this workspace"
    echo "If this is a phase workspace, create via:"
    echo "  bash .ai-rules/advanced-workflows/scripts/create-ai-worktree.sh <phase_id> [branch_type]"
    echo "If this is an existing workspace, initialize once via:"
    echo "  bash .ai-rules/advanced-workflows/scripts/ai-bootstrap-check.sh --init-baseline"
    exit 1
  fi
fi

CURRENT_RULES_TREE="$(git -C "$TARGET_DIR" rev-parse HEAD:.ai-rules)"
BASELINE_RULES_TREE="$(grep '^RULES_BASELINE_TREE_SHA=' "$BASELINE_FILE" | cut -d'=' -f2)"
LATEST_MAIN_SHA=""
LATEST_MAIN_RULES_TREE=""

if git -C "$TARGET_DIR" show-ref --verify --quiet refs/remotes/origin/main; then
  LATEST_MAIN_SHA="$(git -C "$TARGET_DIR" rev-parse origin/main)"
  LATEST_MAIN_RULES_TREE="$(git -C "$TARGET_DIR" rev-parse origin/main:.ai-rules)"
fi

refresh_baseline() {
  local source_sha="$1"
  local rules_tree="$2"
  local source_name="$3"

  cat > "$BASELINE_FILE" <<EOF
RULES_BASELINE_MAIN_SHA=${source_sha}
RULES_BASELINE_TREE_SHA=${rules_tree}
RULES_BASELINE_CREATED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RULES_BASELINE_SOURCE=${source_name}
EOF
}

if [ -z "$BASELINE_RULES_TREE" ]; then
  echo "FAIL: invalid baseline file (missing RULES_BASELINE_TREE_SHA)"
  exit 1
fi

if [ "$CURRENT_RULES_TREE" != "$BASELINE_RULES_TREE" ]; then
  ENV_ALLOW_RULE_DRIFT="${ALLOW_RULE_DRIFT:-0}"
  if [ -n "$LATEST_MAIN_RULES_TREE" ] && [ "$CURRENT_RULES_TREE" = "$LATEST_MAIN_RULES_TREE" ]; then
    refresh_baseline "$LATEST_MAIN_SHA" "$LATEST_MAIN_RULES_TREE" "origin/main"
    BASELINE_RULES_TREE="$LATEST_MAIN_RULES_TREE"
    echo "INFO: refreshed stale rules baseline from origin/main"
  elif [ "$ARG_ALLOW_RULE_DRIFT" -eq 1 ] || [ "$ENV_ALLOW_RULE_DRIFT" = "1" ] || [ "$ENV_ALLOW_RULE_DRIFT" = "true" ]; then
    echo "WARN: rule baseline drift detected but explicitly allowed"
    echo "  baseline tree: ${BASELINE_RULES_TREE}"
    echo "  current tree:  ${CURRENT_RULES_TREE}"
  else
    echo "FAIL: rule baseline drift detected"
    echo "  baseline tree: ${BASELINE_RULES_TREE}"
    echo "  current tree:  ${CURRENT_RULES_TREE}"
    echo "Action: sync your branch with latest approved rules before continuing."
    echo "If this drift is approved, rerun with --allow-rules-drift (or ALLOW_RULE_DRIFT=1)."
    exit 1
  fi
fi

if [ -n "$LATEST_MAIN_RULES_TREE" ]; then
  if [ "$BASELINE_RULES_TREE" != "$LATEST_MAIN_RULES_TREE" ]; then
    ENV_ALLOW_RULE_DRIFT="${ALLOW_RULE_DRIFT:-0}"
    if [ "$ARG_ALLOW_RULE_DRIFT" -eq 1 ] || [ "$ENV_ALLOW_RULE_DRIFT" = "1" ] || [ "$ENV_ALLOW_RULE_DRIFT" = "true" ]; then
      echo "WARN: baseline is stale vs latest origin/main rules, but explicitly allowed"
      echo "  baseline tree: ${BASELINE_RULES_TREE}"
      echo "  origin/main:   ${LATEST_MAIN_RULES_TREE}"
    else
      echo "FAIL: baseline is stale vs latest origin/main rules"
      echo "  baseline tree: ${BASELINE_RULES_TREE}"
      echo "  origin/main:   ${LATEST_MAIN_RULES_TREE}"
      echo "Action: sync/rebase to latest main and refresh baseline before development."
      echo "If this is explicitly approved, rerun with --allow-rules-drift (or ALLOW_RULE_DRIFT=1)."
      exit 1
    fi
  fi
fi

if [ "$STRICT_MODE" -eq 1 ]; then
  echo "==> Strict mode: running guard checks..."
  bash "$REPO_ROOT/.ai-rules/advanced-workflows/guards/check-import-boundaries.sh"
fi

PROTECTED_WORKTREE_CHANGES="$(git -C "$TARGET_DIR" status --porcelain -- AGENTS.md .ai-rules 2>/dev/null || true)"
if [ -n "$PROTECTED_WORKTREE_CHANGES" ]; then
  ENV_ALLOW_RULE_DRIFT="${ALLOW_RULE_DRIFT:-0}"
  if [ "$ARG_ALLOW_RULE_DRIFT" -eq 1 ] || [ "$ENV_ALLOW_RULE_DRIFT" = "1" ] || [ "$ENV_ALLOW_RULE_DRIFT" = "true" ]; then
    echo "WARN: protected governance files have local modifications, but explicitly allowed"
    echo "$PROTECTED_WORKTREE_CHANGES"
  else
    echo "FAIL: protected governance files have local modifications in this workspace"
    echo "$PROTECTED_WORKTREE_CHANGES"
    echo "Action: revert/split these changes or explicitly allow with --allow-rules-drift."
    echo "Recommended verification: bash .ai-rules/advanced-workflows/guards/check-rules-integrity.sh --staged"
    exit 1
  fi
fi

echo "PASS: bootstrap check passed"
echo "  repo:     ${REPO_ROOT}"
echo "  worktree: $(cd "$TARGET_DIR" && pwd)"
echo "  baseline: ${BASELINE_RULES_TREE}"
echo "  note:     in worktree mode, run: bash .ai-rules/advanced-workflows/guards/check-phase-artifact-sync.sh --phase-id <phase_id> before merge/PR"
