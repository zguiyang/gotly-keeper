#!/bin/bash
# check-import-boundaries.sh
# Checks for reverse dependencies that violate architecture boundaries

set -e

# Forbidden patterns: server/** importing app/**
FORBIDDEN_PATTERNS=(
  "server/.*from ['\"]@/app/"
  "server/.*from ['\"]app/"
  "server/application/.*from ['\"]@/app/"
  "server/domain/.*from ['\"]@/app/"
)

check_violation() {
  local pattern="$1"
  
  # Search for forbidden imports in server/ files
  local violations=$(grep -rE "$pattern" --include="*.ts" --include="*.tsx" server/ 2>/dev/null || true)
  
  if [ -n "$violations" ]; then
    echo "FAIL: Boundary violation detected:"
    echo "$violations"
    return 1
  fi
  return 0
}

main() {
  echo "Checking architecture boundaries..."
  
  local failures=0
  
  for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
    if ! check_violation "$pattern"; then
      failures=$((failures + 1))
    fi
  done
  
  if [ $failures -eq 0 ]; then
    echo "PASS: No boundary violations detected"
    exit 0
  else
    echo "FAIL: Found $failures boundary violations"
    exit 1
  fi
}

main "$@"
