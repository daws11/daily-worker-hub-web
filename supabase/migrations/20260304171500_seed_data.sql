-- Seed Data for Daily Worker Hub
-- Date: 2026-03-04

-- ====================================================================
-- 1. CREATE BUSINESS USER
-- ====================================================================

-- Business user
INSERT INTO users (id, email, full_name, role, phone, created_at)
VALUES (
    'a1111111-1111-1111-1111-111111111111',
    'business@test.com',
    'Grand Bali Hotel',
    'business',
    '+6281234567890',
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Business profile
INSERT INTO businesses (id, user_id, name, description, address, phone, email, verification_status, location_name, lat, lng)
VALUES (
    'b1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'Grand Bali Hotel',
    'Luxury 5-star hotel in Seminyak, Bali',
    'Jl. Petitenget No. 123, Seminyak, Bali',
    '+6281234567890',
    'contact@grandbalihotel.com',
    'verified',
    'Seminyak, Bali',
    -8.6903,
    115.1567
) ON CONFLICT (id) DO NOTHING;

-- Second business
INSERT INTO users (id, email, full_name, role, phone, created_at)
VALUES (
    'a2222222-2222-2222-2222-222222222222',
    'beach.resort@test.com',
    'Beach Club Resort',
    'business',
    '+6281234567891',
    NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO businesses (id, user_id, name, description, address, phone, email, verification_status, location_name, lat, lng)
VALUES (
    'b2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    'Beach Club Resort',
    'Beachfront resort in Canggu',
    'Jl. Batu Bolong No. 456, Canggu, Bali',
    '+6281234567891',
    'info@beachclubresort.com',
    'verified',
    'Canggu, Bali',
    -8.6510,
    115.1385
) ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 2. CREATE JOBS
-- ====================================================================

INSERT INTO jobs (id, business_id, title, description, job_type, status, address, location_name, lat, lng, hourly_rate, hours_per_day, start_date, end_date, required_tier, positions_available, requirements, created_at)
VALUES
-- Job 1: Housekeeping
(
    'j1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    'Housekeeping Staff',
    'Need 3 experienced housekeeping staff for hotel rooms. Must be detail-oriented and have previous hotel experience.',
    'housekeeping',
    'open',
    'Jl. Petitenget No. 123, Seminyak, Bali',
    'Seminyak, Bali',
    -8.6903,
    115.1567,
    75000,
    8,
    CURRENT_DATE + INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '7 days',
    'classic',
    3,
    '["Previous hotel experience preferred", "Attention to detail", "Physical stamina"]'::jsonb,
    NOW()
),
-- Job 2: Driver
(
    'j2222222-2222-2222-2222-222222222222',
    'b1111111-1111-1111-1111-111111111111',
    'Hotel Driver',
    'Looking for reliable driver to transport guests. Must have valid SIM A license.',
    'driver',
    'open',
    'Jl. Petitenget No. 123, Seminyak, Bali',
    'Seminyak, Bali',
    -8.6903,
    115.1567,
    100000,
    8,
    CURRENT_DATE + INTERVAL '2 days',
    CURRENT_DATE + INTERVAL '30 days',
    'classic',
    2,
    '["Valid SIM A license", "Clean driving record", "Good knowledge of Bali area"]'::jsonb,
    NOW() - INTERVAL '2 hours'
),
-- Job 3: Kitchen Staff
(
    'j3333333-3333-3333-3333-333333333333',
    'b2222222-2222-2222-2222-222222222222',
    'Kitchen Helper',
    'Need kitchen helpers for breakfast service. Early morning shift 5 AM - 1 PM.',
    'kitchen',
    'open',
    'Jl. Batu Bolong No. 456, Canggu, Bali',
    'Canggu, Bali',
    -8.6510,
    115.1385,
    65000,
    8,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '14 days',
    'classic',
    4,
    '["Basic kitchen knowledge", "Food handler certificate", "Early riser"]'::jsonb,
    NOW() - INTERVAL '5 hours'
),
-- Job 4: Waiter/Waitress
(
    'j4444444-4444-4444-4444-444444444444',
    'b2222222-2222-2222-2222-222222222222',
    'Waiter/Waitress',
    'Experienced waiters for beach club restaurant. Must speak English fluently.',
    'steward',
    'open',
    'Jl. Batu Bolong No. 456, Canggu, Bali',
    'Canggu, Bali',
    -8.6510,
    115.1385,
    85000,
    8,
    CURRENT_DATE + INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '21 days',
    'pro',
    5,
    '["Fluent English", "Previous F&B experience", "Customer service skills"]'::jsonb,
    NOW() - INTERVAL '1 day'
),
-- Job 5: Gardener
(
    'j5555555-5555-5555-5555-555555555555',
    'b1111111-1111-1111-1111-111111111111',
    'Gardener',
    'Maintain hotel gardens and landscaping. Experience with tropical plants preferred.',
    'gardener',
    'open',
    'Jl. Petitenget No. 123, Seminyak, Bali',
    'Seminyak, Bali',
    -8.6903,
    115.1567,
    70000,
    6,
    CURRENT_DATE + INTERVAL '3 days',
    CURRENT_DATE + INTERVAL '90 days',
    'classic',
    2,
    '["Gardening experience", "Knowledge of tropical plants", "Physical fitness"]'::jsonb,
    NOW() - INTERVAL '3 days'
)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 3. AWARD BADGES TO WORKER
-- ====================================================================

-- Get the worker ID for dawskutel@gmail.com
DO $$
DECLARE
    v_worker_id UUID;
    v_badge_id UUID;
BEGIN
    -- Get worker ID
    SELECT id INTO v_worker_id FROM workers WHERE user_id = 'd94643df-bac3-4be0-a8f4-ab9a9f333557';
    
    IF v_worker_id IS NOT NULL THEN
        -- Award "First Job" badge
        SELECT id INTO v_badge_id FROM badges WHERE slug = 'first-job';
        IF v_badge_id IS NOT NULL THEN
            INSERT INTO worker_badges (worker_id, badge_id, earned_at)
            VALUES (v_worker_id, v_badge_id, NOW() - INTERVAL '5 days')
            ON CONFLICT DO NOTHING;
        END IF;
        
        -- Award "Punctual" badge
        SELECT id INTO v_badge_id FROM badges WHERE slug = 'punctual';
        IF v_badge_id IS NOT NULL THEN
            INSERT INTO worker_badges (worker_id, badge_id, earned_at)
            VALUES (v_worker_id, v_badge_id, NOW() - INTERVAL '3 days')
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;

-- ====================================================================
-- 4. ADD WALLET TRANSACTION
-- ====================================================================

-- Add a bonus transaction
INSERT INTO worker_transactions (wallet_id, type, amount, status, description, created_at)
SELECT 
    ww.id,
    'bonus',
    50000.00,
    'completed',
    'Welcome bonus for new worker',
    NOW() - INTERVAL '2 days'
FROM worker_wallets ww
JOIN workers w ON w.id = ww.worker_id
WHERE w.user_id = 'd94643df-bac3-4be0-a8f4-ab9a9f333557'
ON CONFLICT DO NOTHING;

-- Update wallet balance
UPDATE worker_wallets ww
SET 
    balance = 50000.00,
    total_earned = 50000.00,
    updated_at = NOW()
FROM workers w
WHERE ww.worker_id = w.id
AND w.user_id = 'd94643df-bac3-4be0-a8f4-ab9a9f333557';

-- ====================================================================
-- 5. CREATE SAMPLE CONVERSATION
-- ====================================================================

-- Create conversation between worker and business
INSERT INTO conversations (id, participant_1_id, participant_2_id, participant_1_type, participant_2_type, last_message_at, last_message_preview, created_at)
VALUES (
    'c1111111-1111-1111-1111-111111111111',
    'd94643df-bac3-4be0-a8f4-ab9a9f333557',
    'a1111111-1111-1111-1111-111111111111',
    'worker',
    'business',
    NOW() - INTERVAL '1 hour',
    'Thank you for your application!',
    NOW() - INTERVAL '1 day'
) ON CONFLICT DO NOTHING;

-- Add messages
INSERT INTO messages (id, sender_id, receiver_id, content, is_read, created_at, conversation_id)
VALUES
(
    'm1111111-1111-1111-1111-111111111111',
    'd94643df-bac3-4be0-a8f4-ab9a9f333557',
    'a1111111-1111-1111-1111-111111111111',
    'Hello! I am interested in the Housekeeping Staff position.',
    true,
    NOW() - INTERVAL '1 day',
    'c1111111-1111-1111-1111-111111111111'
),
(
    'm2222222-2222-2222-2222-222222222222',
    'a1111111-1111-1111-1111-111111111111',
    'd94643df-bac3-4be0-a8f4-ab9a9f333557',
    'Hi! Thank you for your interest. Can you tell me about your previous experience?',
    true,
    NOW() - INTERVAL '23 hours',
    'c1111111-1111-1111-1111-111111111111'
),
(
    'm3333333-3333-3333-3333-333333333333',
    'd94643df-bac3-4be0-a8f4-ab9a9f333557',
    'a1111111-1111-1111-1111-111111111111',
    'I have 2 years experience working at a resort in Nusa Dua.',
    true,
    NOW() - INTERVAL '22 hours',
    'c1111111-1111-1111-1111-111111111111'
),
(
    'm4444444-4444-4444-4444-444444444444',
    'a1111111-1111-1111-1111-111111111111',
    'd94643df-bac3-4be0-a8f4-ab9a9f333557',
    'Thank you for your application! We will review and get back to you soon.',
    false,
    NOW() - INTERVAL '1 hour',
    'c1111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- DONE! Data seeded successfully.
-- ====================================================================

-- Summary
SELECT 'Users' as item, COUNT(*)::text as count FROM users
UNION ALL
SELECT 'Workers', COUNT(*)::text FROM workers
UNION ALL
SELECT 'Businesses', COUNT(*)::text FROM businesses
UNION ALL
SELECT 'Jobs', COUNT(*)::text FROM jobs
UNION ALL
SELECT 'Badges', COUNT(*)::text FROM badges
UNION ALL
SELECT 'Worker Badges', COUNT(*)::text FROM worker_badges
UNION ALL
SELECT 'Conversations', COUNT(*)::text FROM conversations
UNION ALL
SELECT 'Messages', COUNT(*)::text FROM messages
UNION ALL
SELECT 'Wallet Transactions', COUNT(*)::text FROM worker_transactions;
