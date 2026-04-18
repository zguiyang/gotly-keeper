#!/bin/bash
# check-phase-doc-protocol.sh
# Validates phase plan documents against protocol requirements.
# Supports:
# - Legacy plans (PR-only)
# - Current plans (local-first-pr-fallback)

set -e

LEGACY_FIELDS=(
  "phase_id"
  "depends_on"
  "parallel_safe"
  "merge_strategy"
)

LEGACY_RULES=(
  "Preflight Gate"
  "Start Gate"
  "Sync Gate"
  "Fail-Fast"
  "PR-only"
)

V2_FIELDS=(
  "phase_id"
  "depends_on"
  "parallel_safe"
  "branch_type"
  "branch_naming_rule"
  "merge_strategy: local-first-pr-fallback"
  "task_report_path"
  "failure_report_path"
  "artifact_dir"
  "task_report_template"
  "failure_report_template"
  "code_review_rule"
  "gh_auth_rule"
)

V2_RULES=(
  "Preflight Gate"
  "Start Gate"
  "Sync Gate"
  "Code Review Gate"
  "Local Merge Gate"
  "PR Fallback Consent Gate"
  "GitHub CLI Auth Gate"
  "PR Fallback Creation Gate"
  "PR Review and Status Gate"
  "PR Fallback Merge Gate"
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

validate_plan() {
  local phase_plan="$1"
  local mode="$2"
  local failures=0

  if [ "$mode" = "v2" ]; then
    echo "Checking phase plan (v2): $phase_plan"
    for field in "${V2_FIELDS[@]}"; do
      if ! check_field "$phase_plan" "$field"; then
        failures=$((failures + 1))
      fi
    done
    for rule in "${V2_RULES[@]}"; do
      if ! check_rule "$phase_plan" "$rule"; then
        failures=$((failures + 1))
      fi
    done

    if ! grep -q "Create PR only after local merge fails and user explicitly approves PR fallback" "$phase_plan"; then
      echo "FAIL: Missing PR fallback approval rule in $phase_plan"
      failures=$((failures + 1))
    fi
  else
    echo "Checking phase plan (legacy): $phase_plan"
    for field in "${LEGACY_FIELDS[@]}"; do
      if ! check_field "$phase_plan" "$field"; then
        failures=$((failures + 1))
      fi
    done
    for rule in "${LEGACY_RULES[@]}"; do
      if ! check_rule "$phase_plan" "$rule"; then
        failures=$((failures + 1))
      fi
    done
    echo "WARN: Legacy protocol detected in $phase_plan (allowed for completed historical plans)."
  fi

  return $failures
}

main() {
  local phase_plans=()
  local checked=0

  shopt -s nullglob

  for f in docs/superpowers/plans/*.md; do
    if grep -q "phase_id" "$f" && grep -q "depends_on" "$f" && grep -q "parallel_safe" "$f"; then
      phase_plans+=("$f")
    fi
  done

  if [ ${#phase_plans[@]} -eq 0 ]; then
    echo "FAIL: No phase plan document found"
    exit 1
  fi

  local failures=0

  for phase_plan in "${phase_plans[@]}"; do
    checked=$((checked + 1))
    if grep -q "merge_strategy: local-first-pr-fallback" "$phase_plan"; then
      if validate_plan "$phase_plan" "v2"; then
        rc=0
      else
        rc=$?
      fi
    else
      if validate_plan "$phase_plan" "legacy"; then
        rc=0
      else
        rc=$?
      fi
    fi
    failures=$((failures + rc))
  done

  if [ $failures -eq 0 ]; then
    echo "PASS: Phase plan protocol validation passed ($checked files checked)"
    exit 0
  else
    echo "FAIL: Phase plan protocol validation failed with $failures errors across $checked files"
    exit 1
  fi
}

main "$@"
