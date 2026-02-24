#!/bin/bash

# =============================================================================
# Reliability Score Calculation - Development Environment Setup
# =============================================================================
# This script starts the necessary services for developing the reliability
# score calculation feature.
#
# Services:
#   - Next.js dev server (port 3000)
#   - Supabase local (ports 54321, 54322)
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Reliability Score Feature Dev Environment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# =============================================================================
# Configuration
# =============================================================================
NEXTJS_PORT=3000
SUPABASE_PORT=54321

# =============================================================================
# Helper Functions
# =============================================================================

# Check if a port is in use
port_in_use() {
    lsof -ti:$1 > /dev/null 2>&1
}

# Wait for service to be ready
wait_for_service() {
    local port=$1
    local name=$2
    local max_attempts=30
    local count=0

    echo -e "${YELLOW}Waiting for $name on port $port...${NC}"

    while [ $count -lt $max_attempts ]; do
        if port_in_use $port; then
            echo -e "${GREEN}✓ $name is ready${NC}"
            return 0
        fi
        count=$((count + 1))
        sleep 1
    done

    echo -e "${RED}✗ $name failed to start${NC}"
    return 1
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

echo -e "${BLUE}[1/5] Running pre-flight checks...${NC}"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
else
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}✗ .env.local not found${NC}"
    echo -e "${YELLOW}Copy .env.local.example to .env.local and configure${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Pre-flight checks passed${NC}"
echo ""

# =============================================================================
# Start Supabase Local
# =============================================================================

echo -e "${BLUE}[2/5] Starting Supabase local...${NC}"

# Check if Supabase is already running
if port_in_use $SUPABASE_PORT; then
    echo -e "${YELLOW}⊘ Supabase already running on port $SUPABASE_PORT${NC}"
else
    # Start Supabase in background
    npx supabase start > /dev/null 2>&1 &
    wait_for_service $SUPABASE_PORT "Supabase"
fi

echo ""

# =============================================================================
# Apply Database Migrations
# =============================================================================

echo -e "${BLUE}[3/5] Applying database migrations...${NC}"

# Apply migrations
npx supabase db reset

echo -e "${GREEN}✓ Migrations applied${NC}"
echo ""

# =============================================================================
# Generate TypeScript Types
# =============================================================================

echo -e "${BLUE}[4/5] Generating TypeScript types...${NC}"

# Generate types from database schema
npx supabase gen types typescript --local > lib/supabase/types.ts

echo -e "${GREEN}✓ Types generated${NC}"
echo ""

# =============================================================================
# Start Next.js Dev Server
# =============================================================================

echo -e "${BLUE}[5/5] Starting Next.js dev server...${NC}"

# Check if Next.js is already running
if port_in_use $NEXTJS_PORT; then
    echo -e "${YELLOW}⊘ Next.js already running on port $NEXTJS_PORT${NC}"
else
    # Start Next.js in background
    npm run dev > /tmp/nextjs-dev.log 2>&1 &
    wait_for_service $NEXTJS_PORT "Next.js"
fi

echo ""

# =============================================================================
# Summary
# =============================================================================

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Environment Ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Services running:"
echo -e "  • Next.js:        ${BLUE}http://localhost:$NEXTJS_PORT${NC}"
echo -e "  • Supabase Studio:${BLUE}http://localhost:$SUPABASE_PORT${NC}"
echo -e "  • API Gateway:    ${BLUE}http://localhost:$SUPABASE_PORT/functions/v1${NC}"
echo ""
echo -e "${YELLOW}Available commands:${NC}"
echo -e "  • View logs:      tail -f /tmp/nextjs-dev.log"
echo -e "  • Stop services:  npx supabase stop && pkill -f 'next dev'"
echo -e "  • Reset DB:       npx supabase db reset"
echo ""
echo -e "${BLUE}Feature: Reliability Score Calculation${NC}"
echo -e "  Formula: 40% attendance + 30% punctuality + 30% ratings"
echo ""
