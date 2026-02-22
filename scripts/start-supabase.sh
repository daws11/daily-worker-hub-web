#!/bin/bash

# Start Supabase Local Helper Script
# Daily Worker Hub - Supabase Infrastructure Setup
# Starts Supabase Local development environment with Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Starting Supabase Local${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Docker is installed and running
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is not installed${NC}"
        echo -e "${YELLOW}Please install Docker Desktop from: https://www.docker.com/products/docker-desktop${NC}"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo -e "${RED}Error: Docker is not running${NC}"
        echo -e "${YELLOW}Please start Docker Desktop and try again${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Docker is installed and running${NC}"
}

# Check if Supabase CLI is installed
check_supabase_cli() {
    if ! command -v supabase &> /dev/null && ! npx supabase@latest --version &> /dev/null; then
        echo -e "${RED}Error: Supabase CLI not found${NC}"
        echo -e "${YELLOW}Installing Supabase CLI via npm...${NC}"
        npm install -g supabase
    fi

    # Get version
    if command -v supabase &> /dev/null; then
        SUPABASE_VERSION=$(supabase --version)
    else
        SUPABASE_VERSION="npx supabase@latest"
    fi
    echo -e "${GREEN}✓ Supabase CLI: ${SUPABASE_VERSION}${NC}"
}

# Check if Supabase config exists
check_config() {
    if [ ! -f "supabase/config.toml" ]; then
        echo -e "${RED}Error: supabase/config.toml not found${NC}"
        echo -e "${YELLOW}Please run 'supabase init' first from the project root${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Supabase configuration found${NC}"
}

# Start Supabase Local
start_supabase() {
    echo ""
    echo -e "${YELLOW}Starting Supabase services...${NC}"
    echo ""

    if command -v supabase &> /dev/null; then
        supabase start
    else
        npx supabase@latest start
    fi

    echo ""
    echo -e "${GREEN}✓ Supabase Local started successfully${NC}"
}

# Print service URLs
print_service_info() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Service URLs${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "${GREEN}Supabase Services:${NC}"
    echo -e "  Studio UI:   ${BLUE}http://localhost:54323${NC}"
    echo -e "  API URL:     ${BLUE}http://127.0.0.1:54321${NC}"
    echo -e "  Database:    ${BLUE}postgres://postgres:postgres@localhost:54322/postgres${NC}"
    echo -e "  DB Port:     ${BLUE}54322${NC}"
    echo ""
    echo -e "${YELLOW}Useful Commands:${NC}"
    echo -e "  • ${GREEN}supabase stop${NC}         - Stop Supabase Local"
    echo -e "  • ${GREEN}supabase status${NC}       - Check service status"
    echo -e "  • ${GREEN}supabase db reset${NC}     - Reset database with seed data"
    echo -e "  • ${GREEN}supabase logs${NC}         - View container logs"
    echo ""
}

# Main execution
main() {
    check_docker
    check_supabase_cli
    check_config
    start_supabase
    print_service_info

    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Started${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# Run main function
main
