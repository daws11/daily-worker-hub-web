-- ============================================================================
-- CREATE DEMO ACCOUNTS FOR TESTING
-- ============================================================================

-- Create demo business user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'business@demo.com',
  crypt('demo123456', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"business","full_name":"Demo Business"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Create demo worker user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'worker@demo.com',
  crypt('demo123456', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"worker","full_name":"Demo Worker"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Get user IDs
DO $$
DECLARE
  business_user_id UUID;
  worker_user_id UUID;
BEGIN
  SELECT id INTO business_user_id FROM auth.users WHERE email = 'business@demo.com';
  SELECT id INTO worker_user_id FROM auth.users WHERE email = 'worker@demo.com';

  -- Create public.users records
  INSERT INTO public.users (id, email, role, full_name, created_at, updated_at)
  VALUES (business_user_id, 'business@demo.com', 'business', 'Demo Business', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.users (id, email, role, full_name, created_at, updated_at)
  VALUES (worker_user_id, 'worker@demo.com', 'worker', 'Demo Worker', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- Create business profile
  INSERT INTO public.businesses (id, user_id, name, description, address, phone, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    business_user_id,
    'Demo Business',
    'Demo business for testing',
    'Jl. Demo No. 123, Bali',
    '+6281234567890',
    NOW(),
    NOW()
  ) ON CONFLICT DO NOTHING;

  -- Create worker profile
  INSERT INTO public.workers (id, user_id, full_name, phone, address, tier, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    worker_user_id,
    'Demo Worker',
    '+6281234567891',
    'Jl. Worker No. 456, Bali',
    'classic',
    NOW(),
    NOW()
  ) ON CONFLICT DO NOTHING;

  -- Create wallets
  INSERT INTO public.wallets (user_id, balance, currency, is_active, created_at, updated_at)
  VALUES (business_user_id, 1000000, 'IDR', true, NOW(), NOW())
  ON CONFLICT DO NOTHING;

  INSERT INTO public.wallets (user_id, balance, currency, is_active, created_at, updated_at)
  VALUES (worker_user_id, 500000, 'IDR', true, NOW(), NOW())
  ON CONFLICT DO NOTHING;

END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
