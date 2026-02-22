#!/bin/bash

# E2E Test Helper Script for Job Completion & Payment Release
# This script helps automate database setup and verification for E2E testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    echo "Please set DATABASE_URL before running this script"
    exit 1
fi

# Function to run SQL query
run_query() {
    local query="$1"
    local description="$2"

    echo -e "\n${BLUE}▶ $description${NC}"
    echo -e "${YELLOW}Executing:${NC}"
    echo "$query" | sed 's/^/  /'
    echo ""
    psql "$DATABASE_URL" -c "$query"
}

# Function to prompt for input
prompt_input() {
    local prompt_text="$1"
    local var_name="$2"
    read -p "$prompt_text: " value
    eval "$var_name='$value'"
}

echo -e "${GREEN}=== E2E Test Helper for Job Completion & Payment Release ===${NC}\n"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql is not installed${NC}"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

# Test database connection
echo -e "${BLUE}Testing database connection...${NC}"
if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
    echo -e "${GREEN}✓ Database connection successful${NC}\n"
else
    echo -e "${RED}✗ Database connection failed${NC}"
    echo "Please check your DATABASE_URL"
    exit 1
fi

# Menu
echo "Select an option:"
echo "1. Verify database schema"
echo "2. List existing test data (workers, businesses, jobs)"
echo "3. Create test booking"
echo "4. Update booking to 'in_progress'"
echo "5. Verify booking state after checkout"
echo "6. Simulate payment release (expire review deadline)"
echo "7. Check wallet balances and transactions"
echo "8. Check notifications"
echo "9. Run full verification suite"
echo "10. Cleanup test data"
echo "0. Exit"

read -p "Enter choice: " choice

case $choice in
    1)
        echo -e "\n${BLUE}=== Verifying Database Schema ===${NC}"
        run_query "
            SELECT tablename
            FROM pg_tables
            WHERE schemaname='public'
              AND tablename IN ('wallets', 'wallet_transactions', 'disputes', 'bookings');
        " "Checking required tables exist"

        run_query "
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'bookings'
              AND column_name IN ('checkout_time', 'payment_status', 'review_deadline')
            ORDER BY ordinal_position;
        " "Checking booking completion fields"
        ;;

    2)
        echo -e "\n${BLUE}=== Existing Test Data ===${NC}"

        run_query "
            SELECT id, full_name, phone, created_at
            FROM workers
            ORDER BY created_at DESC
            LIMIT 5;
        " "Listing workers"

        run_query "
            SELECT id, name, email, created_at
            FROM businesses
            ORDER BY created_at DESC
            LIMIT 5;
        " "Listing businesses"

        run_query "
            SELECT id, title, budget_max, status, created_at
            FROM jobs
            ORDER BY created_at DESC
            LIMIT 5;
        " "Listing jobs"
        ;;

    3)
        echo -e "\n${BLUE}=== Create Test Booking ===${NC}\n"
        prompt_input "Enter Worker ID" worker_id
        prompt_input "Enter Business ID" business_id
        prompt_input "Enter Job ID" job_id
        prompt_input "Enter Final Price (e.g., 500000)" final_price

        run_query "
            INSERT INTO bookings (
                worker_id,
                business_id,
                job_id,
                status,
                start_date,
                end_date,
                final_price,
                created_at
            ) VALUES (
                '$worker_id',
                '$business_id',
                '$job_id',
                'accepted',
                NOW(),
                NOW() + INTERVAL '1 day',
                $final_price,
                NOW()
            ) RETURNING id, status, final_price;
        " "Creating test booking with status 'accepted'"

        echo -e "\n${GREEN}✓ Next step: Update booking to 'in_progress' (option 4)${NC}"
        ;;

    4)
        echo -e "\n${BLUE}=== Update Booking to 'in_progress' ===${NC}\n"
        prompt_input "Enter Booking ID" booking_id

        run_query "
            UPDATE bookings
            SET status = 'in_progress',
                updated_at = NOW()
            WHERE id = '$booking_id'
            RETURNING id, status, updated_at;
        " "Updating booking status"

        echo -e "\n${GREEN}✓ Next step: Worker should checkout via UI, then verify (option 5)${NC}"
        ;;

    5)
        echo -e "\n${BLUE}=== Verify Booking After Checkout ===${NC}\n"
        prompt_input "Enter Booking ID" booking_id
        prompt_input "Enter Worker User ID" worker_user_id

        run_query "
            SELECT
                id,
                status,
                checkout_time,
                payment_status,
                review_deadline,
                EXTRACT(EPOCH FROM (review_deadline - NOW())) / 3600 as hours_until_deadline,
                final_price
            FROM bookings
            WHERE id = '$booking_id';
        " "Checking booking state"

        run_query "
            SELECT
                wt.id,
                wt.amount,
                wt.type,
                wt.status,
                wt.description,
                w.pending_balance,
                w.available_balance
            FROM wallet_transactions wt
            JOIN wallets w ON wt.wallet_id = w.id
            WHERE wt.booking_id = '$booking_id'
              AND w.user_id = '$worker_user_id'
            ORDER BY wt.created_at DESC
            LIMIT 5;
        " "Checking wallet transactions"

        run_query "
            SELECT
                id,
                user_id,
                pending_balance,
                available_balance,
                (pending_balance + available_balance) as total_balance
            FROM wallets
            WHERE user_id = '$worker_user_id';
        " "Checking wallet balance"
        ;;

    6)
        echo -e "\n${BLUE}=== Simulate Payment Release ===${NC}\n"
        prompt_input "Enter Booking ID" booking_id
        prompt_input "Enter Worker User ID" worker_user_id
        prompt_input "Enter Payment Amount (e.g., 500000)" payment_amount

        echo -e "${YELLOW}This will expire the review deadline and release payment${NC}"
        read -p "Continue? (y/n): " confirm

        if [ "$confirm" = "y" ]; then
            run_query "
                UPDATE bookings
                SET review_deadline = NOW() - INTERVAL '1 hour'
                WHERE id = '$booking_id'
                RETURNING id, review_deadline;
            " "Setting review deadline to past"

            run_query "
                UPDATE bookings
                SET payment_status = 'available',
                    updated_at = NOW()
                WHERE id = '$booking_id'
                  AND payment_status = 'pending_review'
                  AND review_deadline < NOW()
                RETURNING id, payment_status;
            " "Updating payment status to available"

            run_query "
                UPDATE wallets
                SET
                    pending_balance = pending_balance - $payment_amount,
                    available_balance = available_balance + $payment_amount,
                    updated_at = NOW()
                WHERE user_id = '$worker_user_id'
                RETURNING id, pending_balance, available_balance;
            " "Updating wallet balances"

            run_query "
                UPDATE wallet_transactions
                SET status = 'released'
                WHERE booking_id = '$booking_id'
                  AND type = 'hold'
                  AND status = 'pending_review';
            " "Updating hold transaction status"

            run_query "
                INSERT INTO wallet_transactions (
                    wallet_id,
                    booking_id,
                    amount,
                    type,
                    status,
                    description,
                    metadata,
                    created_at
                )
                SELECT
                    w.id,
                    '$booking_id',
                    $payment_amount,
                    'release',
                    'released',
                    'Pembayaran tersedia untuk penarikan',
                    '{}',
                    NOW()
                FROM wallets w
                WHERE w.user_id = '$worker_user_id'
                RETURNING id, type, status, amount;
            " "Creating release transaction"

            echo -e "\n${GREEN}✓ Payment released! Verify with option 7${NC}"
        else
            echo -e "${YELLOW}Cancelled${NC}"
        fi
        ;;

    7)
        echo -e "\n${BLUE}=== Check Wallet State ===${NC}\n"
        prompt_input "Enter Worker User ID" worker_user_id

        run_query "
            SELECT
                id,
                user_id,
                pending_balance,
                available_balance,
                (pending_balance + available_balance) as total_balance
            FROM wallets
            WHERE user_id = '$worker_user_id';
        " "Checking wallet balance"

        run_query "
            SELECT
                wt.id,
                wt.type,
                wt.status,
                wt.amount,
                wt.description,
                wt.created_at,
                j.title as job_title
            FROM wallet_transactions wt
            JOIN wallets w ON wt.wallet_id = w.id
            LEFT JOIN bookings b ON wt.booking_id = b.id
            LEFT JOIN jobs j ON b.job_id = j.id
            WHERE w.user_id = '$worker_user_id'
            ORDER BY wt.created_at DESC
            LIMIT 10;
        " "Checking recent wallet transactions"
        ;;

    8)
        echo -e "\n${BLUE}=== Check Notifications ===${NC}\n"
        prompt_input "Enter User ID to check (worker or business)" user_id

        run_query "
            SELECT
                id,
                title,
                body,
                link,
                created_at,
                read_at
            FROM notifications
            WHERE user_id = '$user_id'
            ORDER BY created_at DESC
            LIMIT 10;
        " "Checking recent notifications"
        ;;

    9)
        echo -e "\n${BLUE}=== Full Verification Suite ===${NC}\n"
        prompt_input "Enter Booking ID" booking_id
        prompt_input "Enter Worker User ID" worker_user_id
        prompt_input "Enter Business User ID" business_user_id

        echo -e "\n${GREEN}--- 1. Booking Status ---${NC}"
        run_query "
            SELECT
                id,
                status,
                checkout_time IS NOT NULL as has_checkout_time,
                payment_status,
                review_deadline,
                final_price
            FROM bookings
            WHERE id = '$booking_id';
        " "Checking booking"

        echo -e "\n${GREEN}--- 2. Worker Wallet Balance ---${NC}"
        run_query "
            SELECT
                pending_balance,
                available_balance,
                (pending_balance + available_balance) as total
            FROM wallets
            WHERE user_id = '$worker_user_id';
        " "Checking worker wallet"

        echo -e "\n${GREEN}--- 3. Wallet Transactions ---${NC}"
        run_query "
            SELECT
                type,
                status,
                amount,
                description
            FROM wallet_transactions wt
            JOIN wallets w ON wt.wallet_id = w.id
            WHERE w.user_id = '$worker_user_id'
              AND wt.booking_id = '$booking_id'
            ORDER BY wt.created_at;
        " "Checking transactions for this booking"

        echo -e "\n${GREEN}--- 4. Worker Notifications ---${NC}"
        run_query "
            SELECT
                title,
                body,
                created_at
            FROM notifications
            WHERE user_id = '$worker_user_id'
              AND created_at > NOW() - INTERVAL '2 days'
            ORDER BY created_at DESC
            LIMIT 5;
        " "Checking worker notifications"

        echo -e "\n${GREEN}--- 5. Business Notifications ---${NC}"
        run_query "
            SELECT
                title,
                body,
                created_at
            FROM notifications
            WHERE user_id = '$business_user_id'
              AND created_at > NOW() - INTERVAL '2 days'
            ORDER BY created_at DESC
            LIMIT 5;
        " "Checking business notifications"

        echo -e "\n${GREEN}--- 6. Payment Release Status ---${NC}"
        run_query "
            SELECT
                payment_status,
                review_deadline,
                NOW() as current_time,
                CASE
                    WHEN review_deadline < NOW() THEN 'Ready for release'
                    ELSE 'Waiting for review period'
                END as release_status
            FROM bookings
            WHERE id = '$booking_id';
        " "Checking if ready for release"
        ;;

    10)
        echo -e "\n${BLUE}=== Cleanup Test Data ===${NC}"
        echo -e "${RED}WARNING: This will delete test data${NC}"
        read -p "Continue? (y/n): " confirm

        if [ "$confirm" = "y" ]; then
            prompt_input "Enter Worker User ID to cleanup" worker_user_id
            prompt_input "Enter Booking IDs to cleanup (comma-separated)" booking_ids

            run_query "
                DELETE FROM wallet_transactions
                WHERE booking_id IN ($booking_ids);
            " "Deleting wallet transactions"

            run_query "
                UPDATE wallets
                SET
                    pending_balance = 0,
                    available_balance = 0,
                    updated_at = NOW()
                WHERE user_id = '$worker_user_id';
            " "Resetting wallet balances"

            run_query "
                DELETE FROM bookings
                WHERE id IN ($booking_ids);
            " "Deleting bookings"

            run_query "
                DELETE FROM notifications
                WHERE user_id = '$worker_user_id'
                  AND created_at > NOW() - INTERVAL '1 day';
            " "Deleting recent notifications"

            echo -e "\n${GREEN}✓ Cleanup complete${NC}"
        else
            echo -e "${YELLOW}Cancelled${NC}"
        fi
        ;;

    0)
        echo -e "${GREEN}Goodbye!${NC}"
        exit 0
        ;;

    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}=== Done ===${NC}\n"
