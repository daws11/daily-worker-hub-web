-- Seed Data for Daily Worker Hub E2E Testing
-- This creates test users for both worker and business roles
-- Password for all users: Test123! (hashed)

-- =============================================
-- CLEAN EXISTING TEST DATA
-- =============================================
-- Delete existing test data first
DELETE FROM public.wallets WHERE user_id IN (
    SELECT id FROM public.users WHERE email LIKE '%@test.com'
);

DELETE FROM public.workers WHERE user_id IN (
    SELECT id FROM public.users WHERE email LIKE '%@test.com'
);

DELETE FROM public.businesses WHERE user_id IN (
    SELECT id FROM public.users WHERE email LIKE '%@test.com'
);

DELETE FROM public.users WHERE email LIKE '%@test.com';

-- Delete auth users (cascade will handle related data)
DELETE FROM auth.users WHERE email LIKE '%@test.com';

-- =============================================
-- WORKER USERS
-- =============================================

-- Auth User 1: Worker Full Profile
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    raw_user_meta_data,
    email_confirmed_at,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'budi.worker@test.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyz123456', -- Test123! (placeholder hash)
    '{"full_name": "Budi Santoso", "role": "worker"}'::jsonb,
    NOW() - INTERVAL '7 days',
    NOW()
);

INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    phone,
    avatar_url,
    language_preference,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'budi.worker@test.com',
    'Budi Santoso',
    'worker',
    '+6281234567801',
    'https://ui-avatars.com/api/?name=Budi+Santoso&background=0D8ABC&color=fff',
    'id',
    NOW() - INTERVAL '7 days',
    NOW()
);

INSERT INTO public.wallets (
    user_id,
    pending_balance,
    available_balance,
    balance,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    0.00,
    1500000.00,
    1500000.00,
    NOW() - INTERVAL '7 days',
    NOW()
);

INSERT INTO public.workers (
    user_id,
    bio,
    experience_years,
    is_available,
    rating,
    total_jobs,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Worker berpengalaman 3 tahun di hospitality industry. Terbiasa bekerja di hotel bintang 5 dan resort mewah di area Bali. Terampil dalam housekeeping, front desk, dan concierge.',
    3,
    true,
    4.8,
    42,
    NOW() - INTERVAL '7 days',
    NOW()
);

-- Auth User 2: Worker Basic Profile
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    raw_user_meta_data,
    email_confirmed_at,
    created_at,
    updated_at
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'made.worker@test.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyz123456', -- Test123! (placeholder hash)
    '{"full_name": "Made Bagus", "role": "worker"}'::jsonb,
    NOW() - INTERVAL '5 days',
    NOW()
);

INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    phone,
    avatar_url,
    language_preference,
    created_at,
    updated_at
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'made.worker@test.com',
    'Made Bagus',
    'worker',
    '+628987654321',
    'https://ui-avatars.com/api/?name=Made+Bagus&background=6A5ACD&color=fff',
    'id',
    NOW() - INTERVAL '5 days',
    NOW()
);

INSERT INTO public.wallets (
    user_id,
    pending_balance,
    available_balance,
    balance,
    created_at,
    updated_at
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    0.00,
    500000.00,
    500000.00,
    NOW() - INTERVAL '5 days',
    NOW()
);

INSERT INTO public.workers (
    user_id,
    bio,
    experience_years,
    is_available,
    rating,
    total_jobs,
    created_at,
    updated_at
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Saya adalah pekerja harian yang fleksibel dan siap bekerja kapan saja. Memiliki pengalaman di berbagai sektor hospitality.',
    2,
    true,
    4.5,
    15,
    NOW() - INTERVAL '5 days',
    NOW()
);

-- =============================================
-- BUSINESS USERS
-- =============================================

-- Auth User 3: Business Full Profile
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    raw_user_meta_data,
    email_confirmed_at,
    created_at,
    updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    'villa.ubud@test.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyz123456', -- Test123! (placeholder hash)
    '{"full_name": "Villa Ubud Retreat", "role": "business"}'::jsonb,
    NOW() - INTERVAL '10 days',
    NOW()
);

INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    phone,
    avatar_url,
    language_preference,
    created_at,
    updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    'villa.ubud@test.com',
    'Villa Ubud Retreat',
    'business',
    '+628111222333',
    'https://ui-avatars.com/api/?name=Villa+Ubud+Retreat&background=F59E0B&color=fff',
    'en',
    NOW() - INTERVAL '10 days',
    NOW()
);

INSERT INTO public.wallets (
    user_id,
    pending_balance,
    available_balance,
    balance,
    created_at,
    updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    250000.00,
    10000000.00,
    10250000.00,
    NOW() - INTERVAL '10 days',
    NOW()
);

INSERT INTO public.businesses (
    user_id,
    business_name,
    description,
    category,
    address,
    city,
    latitude,
    longitude,
    phone,
    email,
    website,
    logo_url,
    cover_url,
    rating,
    total_jobs_posted,
    is_verified,
    created_at,
    updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    'Villa Ubud Retreat',
    'Villa Ubud Retreat adalah akomodasi mewah di jantung Ubud dengan pemandangan sawah yang indah dan kolam renang infinity. Kami menawarkan 10 vila pribadi dengan desain modern dan fasilitas lengkap. Lokasi strategis dekat Monkey Forest dan Museum Puri Lukisan.',
    'hotel',
    'Jl. Raya Ubud No. 123, Gianyar, Bali',
    'Ubud',
    -8.5069,
    115.2625,
    '+628111222333',
    'villa.ubud@test.com',
    'https://villaubudretreat.com',
    'https://ui-avatars.com/api/?name=Villa+Ubud&background=F59E0B&color=fff',
    'https://ui-avatars.com/api/?name=Villa+Cover&background=F59E0B&color=fff&font-size=128',
    4.9,
    156,
    true,
    NOW() - INTERVAL '10 days',
    NOW()
);

-- Auth User 4: Restaurant Business
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    raw_user_meta_data,
    email_confirmed_at,
    created_at,
    updated_at
) VALUES (
    '44444444-4444-4444-4444-444444444444',
    'warung.dewata@test.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyz123456', -- Test123! (placeholder hash)
    '{"full_name": "Warung Dewata", "role": "business"}'::jsonb,
    NOW() - INTERVAL '3 days',
    NOW()
);

INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    phone,
    avatar_url,
    language_preference,
    created_at,
    updated_at
) VALUES (
    '44444444-4444-4444-4444-444444444444',
    'warung.dewata@test.com',
    'Warung Dewata',
    'business',
    '+62876543210',
    'https://ui-avatars.com/api/?name=Warung+Dewata&background=FF6B6B&color=fff',
    'id',
    NOW() - INTERVAL '3 days',
    NOW()
);

INSERT INTO public.wallets (
    user_id,
    pending_balance,
    available_balance,
    balance,
    created_at,
    updated_at
) VALUES (
    '44444444-4444-4444-4444-444444444444',
    50000.00,
    3000000.00,
    3050000.00,
    NOW() - INTERVAL '3 days',
    NOW()
);

INSERT INTO public.businesses (
    user_id,
    business_name,
    description,
    category,
    address,
    city,
    latitude,
    longitude,
    phone,
    email,
    website,
    logo_url,
    cover_url,
    rating,
    total_jobs_posted,
    is_verified,
    created_at,
    updated_at
) VALUES (
    '44444444-4444-4444-4444-444444444444',
    'Warung Dewata',
    'Warung Dewata adalah restoran lokal legendaris di Ubud yang menyajikan masakan Bali autentik. Berdiri sejak 2010, kami terkenal dengan nasi campur, sate lilit, dan bebek betutu yang lezat. Cocok untuk makan siang dan malam.',
    'restaurant',
    'Jl. Raya Sanggingan No. 88, Ubud, Bali',
    'Ubud',
    -8.4976,
    115.2676,
    '+62876543210',
    'warung.dewata@test.com',
    'https://warungdewata.com',
    'https://ui-avatars.com/api/?name=Warung&background=FF6B6B&color=fff',
    'https://ui-avatars.com/api/?name=Warung+Cover&background=FF6B6B&color=fff&font-size=128',
    4.7,
    89,
    true,
    NOW() - INTERVAL '3 days',
    NOW()
);

-- =============================================
-- SUMMARY
-- =============================================
-- Total Users: 4 (2 workers, 2 businesses)
-- Password for all users: Test123! (Note: This is a placeholder hash, real auth may fail)
-- Note: The password hashes are placeholders. For real testing, you may need to:
-- 1. Register users through the app to get real hashes, OR
-- 2. Use Supabase admin API to create users with real authentication, OR
-- 3. Update the password hashes with real bcrypt hashes of 'Test123!'
