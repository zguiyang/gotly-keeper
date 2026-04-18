#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "Running action contract tests..."
node --require ./scripts/register-server-only-alias.cjs --import tsx --test \
  "server/actions/__tests__/*.test.ts" \
  "app/workspace/__tests__/*.test.ts" 2>&1

echo "Action contract tests completed"
