#!/bin/bash
# check-import-boundaries.sh
# Checks for reverse dependencies that violate architecture boundaries
#
# Architecture rules this guard enforces:
# - server/** may NOT import from app/**
# - server/application/** may NOT import from app/**
# - domain modules may NOT import from app/**
# - server/assets/** may NOT import from server/search/** (search is downstream)
# - server/todos|notes|bookmarks summary services may NOT import from server/search/**
# - server/** may NOT import from server/application/** (reverse of data flow)
#
# Allow list patterns (commented exemptions with rationale):
# - NONE - all boundary violations must be explicitly documented

set -e

check_violation() {
  local file_pattern="$1"
  local import_pattern="$2"
  local description="$3"

  local violations
  violations=$(grep -rE "$import_pattern" --include="*.ts" --include="*.tsx" server/ 2>/dev/null | grep -E "$file_pattern" || true)

  if [ -n "$violations" ]; then
    echo "FAIL: $description"
    echo "Import pattern: $import_pattern"
    echo "$violations"
    echo ""
    return 1
  fi
  return 0
}

main() {
  echo "Checking architecture boundaries..."
  echo ""

  local failures=0

  # Rule 1: server/** may NOT import from app/**
  if ! check_violation "server/.*:" "@/app/" "server/** importing from @/app/** (forbidden reverse dependency)"; then
    failures=$((failures + 1))
  fi

  if ! check_violation "server/.*:" " from ['\"]app/" "server/** importing from app/ (forbidden reverse dependency)"; then
    failures=$((failures + 1))
  fi

  # Rule 2: server/application/** may NOT import from app/**
  if ! check_violation "server/application/.*:" "@/app/" "server/application/** importing from @/app/** (forbidden)"; then
    failures=$((failures + 1))
  fi

  # Rule 3: server/domain/** may NOT import from app/**
  if ! check_violation "server/domain/.*:" "@/app/" "server/domain/** importing from @/app/** (forbidden)"; then
    failures=$((failures + 1))
  fi

  # Rule 4: server/assets/** may NOT import from server/search/** (reverse dependency)
  # search -> assets is allowed (search is a consumer of asset data)
  # assets -> search is FORBIDDEN (search is not a data source for assets)
  if ! check_violation "server/assets/.*:" "@/server/search/" "server/assets/** importing from @/server/search/** (forbidden - assets is upstream of search)"; then
    failures=$((failures + 1))
  fi

  # Rule 5: Summary services in todos/notes/bookmarks may NOT import from server/search/**
  if ! check_violation "server/todos/.*:" "@/server/search/" "server/todos/** importing from @/server/search/** (forbidden)"; then
    failures=$((failures + 1))
  fi

  if ! check_violation "server/notes/.*:" "@/server/search/" "server/notes/** importing from @/server/search/** (forbidden)"; then
    failures=$((failures + 1))
  fi

  if ! check_violation "server/bookmarks/.*:" "@/server/search/" "server/bookmarks/** importing from @/server/search/** (forbidden)"; then
    failures=$((failures + 1))
  fi

  # Rule 6: Domain modules may NOT import from application layer (reverse of data flow)
  # application -> domain is allowed, domain -> application is forbidden
  if ! check_violation "server/todos/.*:" "@/server/application/" "server/todos/** importing from @/server/application/** (forbidden - reverse of data flow)"; then
    failures=$((failures + 1))
  fi

  if ! check_violation "server/notes/.*:" "@/server/application/" "server/notes/** importing from @/server/application/** (forbidden - reverse of data flow)"; then
    failures=$((failures + 1))
  fi

  if ! check_violation "server/bookmarks/.*:" "@/server/application/" "server/bookmarks/** importing from @/server/application/** (forbidden - reverse of data flow)"; then
    failures=$((failures + 1))
  fi

  if ! check_violation "server/assets/.*:" "@/server/application/" "server/assets/** importing from @/server/application/** (forbidden - reverse of data flow)"; then
    failures=$((failures + 1))
  fi

  if ! check_violation "server/search/.*:" "@/server/application/" "server/search/** importing from @/server/application/** (forbidden - reverse of data flow)"; then
    failures=$((failures + 1))
  fi

  echo ""
  if [ $failures -eq 0 ]; then
    echo "PASS: No boundary violations detected"
    exit 0
  else
    echo "FAIL: Found $failures boundary violation categories"
    exit 1
  fi
}

main "$@"