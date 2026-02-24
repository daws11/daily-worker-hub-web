#!/bin/bash

# E2E Test: Repeated Cancellations Affect Reliability Score
#
# This script runs the end-to-end test that verifies:
# - Worker cancels multiple bookings
# - Check reliability score calculation
# - Verify penalty increases with repeated cancellations
#
# Usage:
#   ./scripts/test-e2e-repeated-cancellations.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "========================================================================"
echo "🧪 E2E TEST: Repeated Cancellations Affect Reliability Score"
echo "========================================================================"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found"
    echo "   Please create .env.local with required environment variables"
    exit 1
fi

# Run the test
npm run test:e2e:repeated-cancellations

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "========================================================================"
    echo "✅ Test completed successfully"
    echo "========================================================================"
else
    echo ""
    echo "========================================================================"
    echo "❌ Test failed"
    echo "========================================================================"
fi

exit $exit_code
