#!/bin/bash
# check-capability-boundary.sh
# Guard: block unapproved new subsystem introductions in code changes.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash .ai-rules/advanced-workflows/guards/check-capability-boundary.sh [--against <ref>] [--staged] [--allow-env <VAR_NAME>]

Options:
  --against <ref>      Compare against ref (default: origin/main if exists, else main, else HEAD~1)
  --staged             Check staged changes instead of commit-range diff
  --allow-env <name>   Environment variable name to allow boundary extension (default: ALLOW_CAPABILITY_EXTENSION)
  -h, --help           Show help
EOF
}

AGAINST_REF=""
CHECK_STAGED=0
ALLOW_ENV_NAME="ALLOW_CAPABILITY_EXTENSION"

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

if [ -z "$CHANGED_FILES" ]; then
  echo "PASS: no changed files to scan for capability boundary violations"
  exit 0
fi

is_scannable_file() {
  local file="$1"

  case "$file" in
    .ai-rules/*|docs/*|prd/*|*.md|*.txt)
      return 1
      ;;
  esac

  case "$file" in
    app/*|server/*|components/*|hooks/*|client/*|lib/*|config/*|scripts/*|package.json)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

collect_added_lines_for_file() {
  local file="$1"
  if [ "$CHECK_STAGED" -eq 1 ]; then
    git diff --cached --unified=0 -- "$file" | grep -E '^\+' | grep -Ev '^\+\+\+' || true
  else
    git diff --unified=0 "${AGAINST_REF}...HEAD" -- "$file" | grep -E '^\+' | grep -Ev '^\+\+\+' || true
  fi
}

ADDED_LINES=""
while IFS= read -r file; do
  [ -z "$file" ] && continue
  if is_scannable_file "$file"; then
    FILE_ADDED_LINES="$(collect_added_lines_for_file "$file")"
    if [ -n "$FILE_ADDED_LINES" ]; then
      ADDED_LINES+="$FILE_ADDED_LINES"
      ADDED_LINES+=$'\n'
    fi
  fi
done <<< "$CHANGED_FILES"

if [ -z "$ADDED_LINES" ]; then
  echo "PASS: no relevant added lines to scan for capability boundary violations"
  exit 0
fi

PATTERN='(nodemailer|\bresend\b|sendgrid|mailgun|postmark|smtp|aws-sdk/client-ses|stripe|paddle|braintree|wechatpay|alipay|bullmq|\bbull\b|agenda|bee-queue|amqplib|rabbitmq|kafka|sqs|pub/sub|new[[:space:]]+Queue\()'

VIOLATIONS="$(printf '%s\n' "$ADDED_LINES" | grep -Ein "$PATTERN" || true)"

if [ -z "$VIOLATIONS" ]; then
  echo "PASS: capability boundary check passed"
  exit 0
fi

ALLOW_VALUE="${!ALLOW_ENV_NAME:-}"
if [ "$ALLOW_VALUE" = "1" ] || [ "$ALLOW_VALUE" = "true" ]; then
  echo "WARN: capability boundary keywords detected but explicitly allowed by ${ALLOW_ENV_NAME}=${ALLOW_VALUE}"
  echo "$VIOLATIONS"
  exit 0
fi

echo "FAIL: potential new subsystem introduction detected"
echo "Boundary source: PROJECT_CAPABILITIES.md"
echo "Added lines matching blocked subsystem keywords:"
echo "$VIOLATIONS"
echo ""
echo "Action: confirm scope with user before introducing new infrastructure."
echo "If explicitly approved, rerun with override:"
echo "  ${ALLOW_ENV_NAME}=1 bash .ai-rules/advanced-workflows/guards/check-capability-boundary.sh"
exit 1
