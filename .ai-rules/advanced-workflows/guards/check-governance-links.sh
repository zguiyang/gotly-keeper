#!/bin/bash

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  echo "FAIL: not inside a git repository"
  exit 1
fi
cd "$REPO_ROOT"

failures=0

echo "Checking .ai-rules path references..."
RULE_REFS="$(rg \
  --glob '!node_modules/**' \
  --glob '!.next/**' \
  --glob '!.git/**' \
  --glob '!.worktrees/**' \
  -o \
  --no-heading \
  --no-filename \
  '\.ai-rules/[A-Za-z0-9_./-]+' \
  . | sort -u || true)"

if [ -n "$RULE_REFS" ]; then
  while IFS= read -r ref; do
    [ -z "$ref" ] && continue
    ref="${ref%%#*}"
    ref="${ref%%\)*}"
    ref="${ref%%\]*}"
    ref="${ref%%\}*}"
    ref="${ref%%,*}"
    ref="${ref%%;*}"
    ref="${ref%%:*}"
    ref="${ref%%\`*}"
    ref="${ref%\"}"
    ref="${ref%\'}"
    while [ -n "$ref" ] && [ ! -e "$ref" ]; do
      case "$ref" in
        *.) ref="${ref%.}" ;;
        */) ref="${ref%/}" ;;
        *) break ;;
      esac
    done
    [ -z "$ref" ] && continue
    if [ ! -e "$ref" ]; then
      echo "FAIL: broken .ai-rules reference -> $ref"
      failures=$((failures + 1))
    fi
  done <<< "$RULE_REFS"
fi

if [ "$failures" -eq 0 ]; then
  echo "PASS: governance link checks passed"
  exit 0
fi

echo "FAIL: found ${failures} governance guard issue(s)"
exit 1
