#!/bin/bash
# check-import-boundaries.sh
# Server layering guard for final architecture:
# modules -> services/lib
# services -> lib
# plus boundary API ownership checks for modules

set -euo pipefail

check_violation() {
  local source_pattern="$1"
  local import_pattern="$2"
  local description="$3"
  local search_root="${4:-server}"

  local matches
  local violations

  matches=$(grep -rEn "$import_pattern" --include="*.ts" --include="*.tsx" "$search_root" 2>/dev/null || true)
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

  # Rule 1.1: app/** may only access server modules, never services/lib directly
  if ! check_violation "^app/.*:" "@/server/services(/|['\"])" "app/** importing from @/server/services/** is forbidden; use server/modules/**" "app"; then
    failures=$((failures + 1))
  fi
  if ! check_violation "^app/.*:" "@/server/lib(/|['\"])" "app/** importing from @/server/lib/** is forbidden; use server/modules/**" "app"; then
    failures=$((failures + 1))
  fi
  if ! check_violation "^app/.*:" "from ['\"][.]{1,2}/.*server/services(/|['\"])" "app/** relative importing from server/services/** is forbidden; use server/modules/**" "app"; then
    failures=$((failures + 1))
  fi
  if ! check_violation "^app/.*:" "from ['\"][.]{1,2}/.*server/lib(/|['\"])" "app/** relative importing from server/lib/** is forbidden; use server/modules/**" "app"; then
    failures=$((failures + 1))
  fi
  if ! check_violation "^server/.*:" " from ['\"]app/" "server/** importing from app/** is forbidden"; then
    failures=$((failures + 1))
  fi
  if ! check_violation "^server/.*:" "from ['\"][.]{1,2}/.*app/" "server/** relative importing from app/** is forbidden"; then
    failures=$((failures + 1))
  fi

  # Rule 2: modules should not couple to other modules through alias imports
  if ! check_violation "^server/modules/.*:" "@/server/modules/" "server/modules/** importing from @/server/modules/** is forbidden"; then
    failures=$((failures + 1))
  fi

  # Rule 2.1: modules must own their exported API (no passthrough re-export from outside module directory)
  if ! check_violation "^server/modules/.*:" "^export[[:space:]].*from[[:space:]]+['\"]@/" "server/modules/** re-export via @/ alias is forbidden; export only module-local declarations"; then
    failures=$((failures + 1))
  fi
  if ! check_violation "^server/modules/.*:" "^export[[:space:]].*from[[:space:]]+['\"]\\.\\./" "server/modules/** re-export via ../ is forbidden; do not export outside current module directory"; then
    failures=$((failures + 1))
  fi

  # Rule 3: services may not import modules (no reverse dependency)
  if ! check_violation "^server/services/.*:" "@/server/modules/" "server/services/** importing from @/server/modules/** is forbidden"; then
    failures=$((failures + 1))
  fi
  if ! check_violation "^server/services/.*:" "from ['\"][.]{1,2}/.*modules/" "server/services/** relative importing from modules/** is forbidden"; then
    failures=$((failures + 1))
  fi

  # Rule 4: lib is bottom layer (no reverse to modules/services)
  if ! check_violation "^server/lib/.*:" "@/server/modules/" "server/lib/** importing from @/server/modules/** is forbidden"; then
    failures=$((failures + 1))
  fi
  if ! check_violation "^server/lib/.*:" "from ['\"][.]{1,2}/.*modules/" "server/lib/** relative importing from modules/** is forbidden"; then
    failures=$((failures + 1))
  fi
  if ! check_violation "^server/lib/.*:" "@/server/services/" "server/lib/** importing from @/server/services/** is forbidden"; then
    failures=$((failures + 1))
  fi
  if ! check_violation "^server/lib/.*:" "from ['\"][.]{1,2}/.*services/" "server/lib/** relative importing from services/** is forbidden"; then
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
