#!/bin/bash

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  echo "FAIL: not inside a git repository"
  exit 1
fi
cd "$REPO_ROOT"

failures=0

echo "Checking boundary exception TODO format and due dates..."
TODOS="$(rg --glob '!node_modules/**' --glob '!.next/**' --glob '!.git/**' --glob '!.worktrees/**' --glob '*.ts' --glob '*.tsx' --glob '*.js' --glob '*.jsx' --glob '*.cjs' --glob '*.mjs' --no-heading -n 'TODO:\s*resolve boundary violation' app server client components hooks shared tests 2>/dev/null || true)"

if [ -n "$TODOS" ]; then
  today="$(date +%F)"
  while IFS= read -r row; do
    [ -z "$row" ] && continue

    file="${row%%:*}"
    remain="${row#*:}"
    line_no="${remain%%:*}"
    content="${remain#*:}"

    if [[ "$content" =~ TODO:[[:space:]]*resolve[[:space:]]boundary[[:space:]]violation[[:space:]]*\[owner=@[A-Za-z0-9._-]+[[:space:]]+due=([0-9]{4}-[0-9]{2}-[0-9]{2})\] ]]; then
      due_date="${BASH_REMATCH[1]}"
      if [[ "$due_date" < "$today" ]]; then
        echo "FAIL: overdue boundary exception TODO at ${file}:${line_no} (due=${due_date}, today=${today})"
        failures=$((failures + 1))
      fi
    else
      echo "FAIL: invalid boundary exception TODO format at ${file}:${line_no}"
      echo "Expected: TODO: resolve boundary violation [owner=@<id> due=YYYY-MM-DD]"
      failures=$((failures + 1))
    fi
  done <<< "$TODOS"
fi

if [ "$failures" -eq 0 ]; then
  echo "PASS: boundary-exception TODO checks passed"
  exit 0
fi

echo "FAIL: found ${failures} boundary-exception TODO issue(s)"
exit 1
