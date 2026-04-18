#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

cd "$PROJECT_ROOT"

echo "Running domain tests..."
./node_modules/.bin/vitest --run \
  tests/unit/server \
  tests/unit/shared

echo "Domain tests completed"
