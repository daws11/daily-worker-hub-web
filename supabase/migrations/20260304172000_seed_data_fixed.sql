-- Fixed Seed Data for Daily Worker Hub
-- Date: 2026-03-04

-- ====================================================================
-- 1. SEED CATEGORIES FIRST
-- ====================================================================

INSERT INTO categories (id, name, slug) VALUES
('c1111111-1111-1111-1111-111111111111', 'Housekeeping', 'housekeeping'),
('c2222222-2222-2222-2222-222222222222', 'Driver', 'driver'),
('c3333333-3333-3333-3333-333333333333', 'Kitchen Staff', 'kitchen-staff'),
('c4444444-4444-4444-4444-444444444444', 'Waiter/Waitress', 'waiter-waitress'),
('c5555555-5555-5555-5555-555555555555', 'Gardener', 'gardener'),
('c6666666-6666-6666-6666-666666666666', 'Security', 'security'),
('c7777777-7777-7777-7777-777777777777', 'Spa & Wellness', 'spa-wellness'),
('c8888888-8888-8888-8888-888888888888', 'Front Desk', 'front-desk')
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 2. CREATE BUSINESS USER
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
INSERT INTO businesses (id, user_id, name, description, address, phone, email, verification_status, area, lat, lng, business_type)
VALUES (
    'b1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'Grand Bali Hotel',
    'Luxury 5-star hotel in Seminyak, Bali',
    'Jl. Petitenget No. 123, Seminyak, Bali',
    '+6281234567890',
    'contact@grandbalihotel.com',
    'verified',
    'Seminyak',
    -8.6903,
    115.1567,
    'hotel'
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

INSERT INTO businesses (id, user_id, name, description, address, phone, email, verification_status, area, lat, lng, business_type)
VALUES (
    'b2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    'Beach Club Resort',
    'Beachfront resort in Canggu',
    'Jl. Batu Bolong No. 456, Canggu, Bali',
    '+6281234567891',
    'info@beachclubresort.com',
    'verified',
    'Canggu',
    -8.6510,
    115.1385,
    'resort'
) ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 3. CREATE JOBS
-- ====================================================================

INSERT INTO jobs (id, business_id, category_id, title, description, status, address, lat, lng, budget_min, budget_max, hours_needed, deadline, requirements, is_urgent, created_at)
VALUES
-- Job 1: Housekeeping
(
    '81111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    'Housekeeping Staff',
    'Need 3 experienced housekeeping staff for hotel rooms. Must be detail-oriented and have previous hotel experience.',
    'open',
    'Jl. Petitenget No. 123, Seminyak, Bali',
    -8.6903,
    115.1567,
    600000,
    800000,
    8,
    CURRENT_DATE + INTERVAL '7 days',
    'Previous hotel experience preferred. Attention to detail. Physical stamina.',
    false,
    NOW()
),
-- Job 2: Driver
(
    '82222222-2222-2222-2222-222222222222',
    'b1111111-1111-1111-1111-111111111111',
    'c2222222-2222-2222-2222-222222222222',
    'Hotel Driver',
    'Looking for reliable driver to transport guests. Must have valid SIM A license.',
    'open',
    'Jl. Petitenget No. 123, Seminyak, Bali',
    -8.6903,
    115.1567,
    800000,
    1000000,
    8,
    CURRENT_DATE + INTERVAL '30 days',
    'Valid SIM A license. Clean driving record. Good knowledge of Bali area.',
    true,
    NOW() - INTERVAL '2 hours'
),
-- Job 3: Kitchen Staff
(
    '83333333-3333-3333-3333-333333333333',
    'b2222222-2222-2222-2222-222222222222',
    'c3333333-3333-3333-3333-333333333333',
    'Kitchen Helper',
    'Need kitchen helpers for breakfast service. Early morning shift 5 AM - 1 PM.',
    'open',
    'Jl. Batu Bolong No. 456, Canggu, Bali',
    -8.6510,
    115.1385,
    500000,
    650000,
    8,
    CURRENT_DATE + INTERVAL '14 days',
    'Basic kitchen knowledge. Food handler certificate. Early riser.',
    false,
    NOW() - INTERVAL '5 hours'
),
-- Job 4: Waiter/Waitress
(
    '84444444-4444-4444-4444-444444444444',
    'b2222222-2222-2222-2222-222222222222',
    'c4444444-4444-4444-4444-444444444444',
    'Waiter/Waitress',
    'Experienced waiters for beach club restaurant. Must speak English fluently.',
    'open',
    'Jl. Batu Bolong No. 456, Canggu, Bali',
    -8.6510,
    115.1385,
    650000,
    850000,
    8,
    CURRENT_DATE + INTERVAL '21 days',
    'Fluent English. Previous F&B experience. Customer service skills.',
    false,
    NOW() - INTERVAL '1 day'
),
-- Job 5: Gardener
(
    '85555555-5555-5555-5555-555555555555',
    'b1111111-1111-1111-1111-111111111111',
    'c5555555-5555-5555-5555-555555555555',
    'Gardener',
    'Maintain hotel gardens and landscaping. Experience with tropical plants preferred.',
    'open',
    'Jl. Petitenget No. 123, Seminyak, Bali',
    -8.6903,
    115.1567,
    550000,
    700000,
    6,
    CURRENT_DATE + INTERVAL '90 days',
    'Gardening experience. Knowledge of tropical plants. Physical fitness.',
    false,
    NOW() - INTERVAL '3 days'
)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 4. CREATE SAMPLE CONVERSATION
-- ====================================================================

-- Create conversation between worker and business
INSERT INTO conversations (id, participant_1_id, participant_2_id, participant_1_type, participant_2_type, last_message_at, last_message_preview, created_at)
VALUES (
    '91111111-1111-1111-1111-111111111111',
    'd94643df-bac3-4be0-a8f4-ab9a9f333557',
    'a1111111-1111-1111-1111-111111111111',
    'worker',
    'business',
    NOW() - INTERVAL '1 hour',
    'Thank you for your application!',
    NOW() - INTERVAL '1 day'
) ON CONFLICT DO NOTHING;

-- Add messages (using gen_random_uuid() for auto-generated IDs)
INSERT INTO messages (sender_id, receiver_id, content, is_read, created_at, conversation_id)
VALUES
(
    'd94643df-bac3-4be0-a8f4-ab9a9f333557',
    'a1111111-1111-1111-1111-111111111111',
    'Hello! I am interested in the Housekeeping Staff position.',
    true,
    NOW() - INTERVAL '1 day',
    '91111111-1111-1111-1111-111111111111'
),
(
    'a1111111-1111-1111-1111-111111111111',
    'd94643df-bac3-4be0-a8f4-ab9a9f333557',
    'Hi! Thank you for your interest. Can you tell me about your previous experience?',
    true,
    NOW() - INTERVAL '23 hours',
    '91111111-1111-1111-1111-111111111111'
),
(
    'd94643df-bac3-4be0-a8f4-ab9a9f333557',
    'a1111111-1111-1111-1111-111111111111',
    'I have 2 years experience working at a resort in Nusa Dua.',
    true,
    NOW() - INTERVAL '22 hours',
    '91111111-1111-1111-1111-111111111111'
),
(
    'a1111111-1111-1111-1111-111111111111',
    'd94643df-bac3-4be0-a8f4-ab9a9f333557',
    'Thank you for your application! We will review and get back to you soon.',
    false,
    NOW() - INTERVAL '1 hour',
    '91111111-1111-1111-1111-111111111111'
)
ON CONFLICT DO NOTHING;

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
SELECT 'Categories', COUNT(*)::text FROM categories
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
