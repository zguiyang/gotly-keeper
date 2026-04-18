#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "Running domain tests..."
node --require ./scripts/register-server-only-alias.cjs --import tsx --test \
  "server/notes/__tests__/*.test.ts" \
  "server/todos/__tests__/*.test.ts" \
  "server/bookmarks/__tests__/*.test.ts" \
  "server/search/__tests__/*.test.ts" \
  "server/ai/__tests__/*.test.ts" 2>&1

echo "Domain tests completed"
