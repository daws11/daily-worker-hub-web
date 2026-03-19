-- Add Test Data Profiles and Wallets (CORRECTED)
-- Matches actual database schema

-- =============================================
-- UPDATE USER PROFILES
-- =============================================

-- Update Budi Worker profile
UPDATE public.users 
SET 
    phone = '+6281234567801',
    avatar_url = 'https://ui-avatars.com/api/?name=Budi+Santoso&background=0D8ABC&color=fff',
    updated_at = NOW()
WHERE email = 'budi.santoso@test.com';

-- Insert Budi Worker extended profile
INSERT INTO public.workers (user_id, full_name, bio, experience_years, phone, avatar_url, jobs_completed, created_at, updated_at)
VALUES (
    (SELECT id FROM public.users WHERE email = 'budi.santoso@test.com'),
    'Budi Santoso',
    'Worker berpengalaman 3 tahun di hospitality industry. Terbiasa bekerja di hotel bintang 5 dan resort mewah di area Bali.',
    3,
    '+6281234567801',
    'https://ui-avatars.com/api/?name=Budi+Santoso&background=0D8ABC&color=fff',
    42,
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    bio = EXCLUDED.bio,
    experience_years = EXCLUDED.experience_years,
    updated_at = NOW();

-- Insert Budi Worker wallet
INSERT INTO public.wallets (user_id, pending_balance, available_balance, balance, created_at, updated_at)
VALUES (
    (SELECT id FROM public.users WHERE email = 'budi.santoso@test.com'),
    0.00,
    1500000.00,
    1500000.00,
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    balance = EXCLUDED.balance,
    available_balance = EXCLUDED.available_balance,
    updated_at = NOW();

-- Update Made Worker profile
UPDATE public.users 
SET 
    full_name = 'Made Bagus',
    phone = '+628987654321',
    avatar_url = 'https://ui-avatars.com/api/?name=Made+Bagus&background=6A5ACD&color=fff',
    updated_at = NOW()
WHERE email = 'worker@test.com';

-- Insert Made Worker extended profile
INSERT INTO public.workers (user_id, full_name, bio, experience_years, phone, avatar_url, jobs_completed, created_at, updated_at)
VALUES (
    (SELECT id FROM public.users WHERE email = 'worker@test.com'),
    'Made Bagus',
    'Saya adalah pekerja harian yang fleksibel dan siap bekerja kapan saja.',
    2,
    '+628987654321',
    'https://ui-avatars.com/api/?name=Made+Bagus&background=6A5ACD&color=fff',
    15,
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    bio = EXCLUDED.bio,
    experience_years = EXCLUDED.experience_years,
    updated_at = NOW();

-- Insert Made Worker wallet
INSERT INTO public.wallets (user_id, pending_balance, available_balance, balance, created_at, updated_at)
VALUES (
    (SELECT id FROM public.users WHERE email = 'worker@test.com'),
    0.00,
    500000.00,
    500000.00,
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    balance = EXCLUDED.balance,
    available_balance = EXCLUDED.available_balance,
    updated_at = NOW();

-- Update Villa Ubud business profile
UPDATE public.users 
SET 
    phone = '+628111222333',
    avatar_url = 'https://ui-avatars.com/api/?name=Villa+Ubud+Retreat&background=F59E0B&color=fff',
    updated_at = NOW()
WHERE email = 'villa.ubud@test.com';

-- Insert Villa Ubud business extended profile
INSERT INTO public.businesses (
    user_id,
    name,
    description,
    business_type,
    address,
    area,
    lat,
    lng,
    phone,
    email,
    website,
    avatar_url,
    is_verified,
    verification_status,
    created_at,
    updated_at
)
VALUES (
    (SELECT id FROM public.users WHERE email = 'villa.ubud@test.com'),
    'Villa Ubud Retreat',
    'Villa Ubud Retreat adalah akomodasi mewah di jantung Ubud dengan pemandangan sawah yang indah dan kolam renang infinity.',
    'hotel',
    'Jl. Raya Ubud No. 123, Gianyar, Bali',
    'Gianyar',
    -8.5069,
    115.2625,
    '+628111222333',
    'villa.ubud@test.com',
    'https://villaubudretreat.com',
    'https://ui-avatars.com/api/?name=Villa+Ubud+Retreat&background=F59E0B&color=fff',
    true,
    'verified',
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Insert Villa Ubud wallet
INSERT INTO public.wallets (user_id, pending_balance, available_balance, balance, created_at, updated_at)
VALUES (
    (SELECT id FROM public.users WHERE email = 'villa.ubud@test.com'),
    250000.00,
    10000000.00,
    10250000.00,
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    balance = EXCLUDED.balance,
    available_balance = EXCLUDED.available_balance,
    updated_at = NOW();

-- Update Test Business 2 profile
UPDATE public.users 
SET 
    full_name = 'Warung Dewata',
    phone = '+62876543210',
    avatar_url = 'https://ui-avatars.com/api/?name=Warung+Dewata&background=FF6B6B&color=fff',
    updated_at = NOW()
WHERE email = 'test21772337461017@test.com';

-- Insert Warung Dewata business extended profile
INSERT INTO public.businesses (
    user_id,
    name,
    description,
    business_type,
    address,
    area,
    lat,
    lng,
    phone,
    email,
    website,
    avatar_url,
    is_verified,
    verification_status,
    created_at,
    updated_at
)
VALUES (
    (SELECT id FROM public.users WHERE email = 'test21772337461017@test.com'),
    'Warung Dewata',
    'Warung Dewata adalah restoran lokal legendaris di Ubud yang menyajikan masakan Bali autentik.',
    'restaurant',
    'Jl. Raya Sanggingan No. 88, Ubud, Bali',
    'Gianyar',
    -8.4976,
    115.2676,
    '+62876543210',
    'test21772337461017@test.com',
    'https://warungdewata.com',
    'https://ui-avatars.com/api/?name=Warung+Dewata&background=FF6B6B&color=fff',
    true,
    'verified',
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Insert Warung Dewata wallet
INSERT INTO public.wallets (user_id, pending_balance, available_balance, balance, created_at, updated_at)
VALUES (
    (SELECT id FROM public.users WHERE email = 'test21772337461017@test.com'),
    50000.00,
    3000000.00,
    3050000.00,
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    balance = EXCLUDED.balance,
    available_balance = EXCLUDED.available_balance,
    updated_at = NOW();

-- =============================================
-- SUMMARY
-- =============================================
-- Now we have 2 worker users and 2 business users with:
-- - Complete profiles in public.users
-- - Extended profiles in workers/businesses tables
-- - Wallets with initial balances
-- - All can login with password: Test123!
