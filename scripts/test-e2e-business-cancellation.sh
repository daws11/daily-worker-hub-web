#!/bin/bash

# E2E Test: Business Cancels Worker Booking Flow
#
# This script runs the end-to-end test for business cancellation.
# It tests the complete flow from viewing a booking to cancelling with reason and note.
#
# Usage:
#   ./scripts/test-e2e-business-cancellation.sh

set -e

echo "================================"
echo "E2E Test: Business Cancellation"
echo "================================"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found"
    echo "Please create .env.local with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# Check if ts-node is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js and npm."
    exit 1
fi

# Run the test
echo "Running E2E test for business cancellation..."
echo ""

npx ts-node scripts/test-e2e-business-cancellation.ts

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "================================"
    echo "✅ E2E test completed successfully"
    echo "================================"
    exit 0
else
    echo ""
    echo "================================"
    echo "❌ E2E test failed"
    echo "================================"
    exit 1
fi
