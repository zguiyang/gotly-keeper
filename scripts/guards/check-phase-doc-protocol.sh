#!/bin/bash
# check-phase-doc-protocol.sh
# Validates that a phase plan document contains required protocol fields

set -e

PROTOCOL_FIELDS=(
  "phase_id"
  "depends_on"
  "parallel_safe"
)

PROTOCOL_RULES=(
  "Rule 0"
  "Start Gate"
  "Sync Gate"
  "Fail-Fast"
)

check_field() {
  local file="$1"
  local field="$2"
  
  if ! grep -q "$field" "$file"; then
    echo "FAIL: Missing '$field' in $file"
    return 1
  fi
  return 0
}

check_rule() {
  local file="$1"
  local rule="$2"
  
  if ! grep -q "$rule" "$file"; then
    echo "FAIL: Missing '$rule' in $file"
    return 1
  fi
  return 0
}

main() {
  local phase_plan=""
  
  # Find the phase plan document
  for f in docs/superpowers/plans/*.md; do
    if grep -q "phase_id:" "$f"; then
      phase_plan="$f"
      break
    fi
  done
  
  if [ -z "$phase_plan" ]; then
    echo "FAIL: No phase plan document found"
    exit 1
  fi
  
  echo "Checking phase plan: $phase_plan"
  
  local failures=0
  
  for field in "${PROTOCOL_FIELDS[@]}"; do
    if ! check_field "$phase_plan" "$field"; then
      failures=$((failures + 1))
    fi
  done
  
  for rule in "${PROTOCOL_RULES[@]}"; do
    if ! check_rule "$phase_plan" "$rule"; then
      failures=$((failures + 1))
    fi
  done
  
  if [ $failures -eq 0 ]; then
    echo "PASS: Phase plan protocol validation passed"
    exit 0
  else
    echo "FAIL: Phase plan protocol validation failed with $failures errors"
    exit 1
  fi
}

main "$@"
