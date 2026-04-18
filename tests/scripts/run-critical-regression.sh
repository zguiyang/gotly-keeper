#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "Running critical regression suite..."

echo "1. Domain tests..."
./scripts/test/run-domain-tests.sh || {
  echo "Domain tests failed"
  exit 1
}

echo "2. Action contract tests..."
./scripts/test/run-action-contract-tests.sh || {
  echo "Action contract tests failed"
  exit 1
}

echo "Critical regression suite passed"
