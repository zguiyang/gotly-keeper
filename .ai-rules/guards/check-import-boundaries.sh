#!/bin/bash
# check-import-boundaries.sh
# Server layering guard for final architecture:
# modules -> services -> lib
# plus boundary API ownership checks for modules

set -euo pipefail

check_violation() {
  local source_pattern="$1"
  local import_pattern="$2"
  local description="$3"

  local matches
  local violations

  matches=$(grep -rEn "$import_pattern" --include="*.ts" --include="*.tsx" server/ 2>/dev/null || true)
  violations=$(printf '%s\n' "$matches" | grep -E "$source_pattern" || true)

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
  echo "Checking server import boundaries..."
  echo ""

  local failures=0

  # Rule 1: server/** may NOT import from app/**
  if ! check_violation "^server/.*:" "@/app/" "server/** importing from @/app/** is forbidden"; then
    failures=$((failures + 1))
  fi
  if ! check_violation "^server/.*:" " from ['\"]app/" "server/** importing from app/** is forbidden"; then
    failures=$((failures + 1))
  fi

  # Rule 2: modules -> services only (no direct lib, no modules->modules coupling)
  if ! check_violation "^server/modules/.*:" "@/server/lib/" "server/modules/** importing from @/server/lib/** is forbidden"; then
    failures=$((failures + 1))
  fi
  if ! check_violation "^server/modules/.*:" "@/server/modules/" "server/modules/** importing from @/server/modules/** is forbidden"; then
    failures=$((failures + 1))
  fi

  # Rule 2.1: modules must own their exported API (no passthrough re-export from services)
  if ! check_violation "^server/modules/.*:" "^export[[:space:]].*from[[:space:]]+['\"]@/server/services/" "server/modules/** passthrough re-export from @/server/services/** is forbidden"; then
    failures=$((failures + 1))
  fi

  # Rule 3: services -> lib only (no reverse to modules)
  if ! check_violation "^server/services/.*:" "@/server/modules/" "server/services/** importing from @/server/modules/** is forbidden"; then
    failures=$((failures + 1))
  fi

  # Rule 4: lib is bottom layer (no reverse to modules/services)
  if ! check_violation "^server/lib/.*:" "@/server/modules/" "server/lib/** importing from @/server/modules/** is forbidden"; then
    failures=$((failures + 1))
  fi
  if ! check_violation "^server/lib/.*:" "@/server/services/" "server/lib/** importing from @/server/services/** is forbidden"; then
    failures=$((failures + 1))
  fi

  # Rule 5: legacy top-level server directories are forbidden in imports
  if ! check_violation "^.*:" "@/server/(application|actions|auth|assets|search|ai|cache|config|db|notes|bookmarks|todos|user)/" "legacy server root directories are forbidden in imports"; then
    failures=$((failures + 1))
  fi

  echo ""
  if [ "$failures" -eq 0 ]; then
    echo "PASS: No boundary violations detected"
    exit 0
  else
    echo "FAIL: Found $failures boundary violation categories"
    exit 1
  fi
}

main "$@"
