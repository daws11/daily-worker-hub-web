-- ============================================================================
-- CREATE DEMO ACCOUNTS FOR TESTING
-- ============================================================================

-- Create demo business user
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'business@demo.com',
  crypt('demo123456', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"role":"business","full_name":"Demo Business"}'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- Create demo worker user
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES (
  'b1ffcd00-0d1c-5f90-cc7e-7cca0e491b22',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'worker@demo.com',
  crypt('demo123456', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"role":"worker","full_name":"Demo Worker"}'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- Create public.users records
INSERT INTO users (id, email, full_name, role, phone, created_at, updated_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'business@demo.com', 'Demo Business', 'business', '+6281234567890',
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, full_name, role, phone, created_at, updated_at)
VALUES (
  'b1ffcd00-0d1c-5f90-cc7e-7cca0e491b22',
  'worker@demo.com', 'Demo Worker', 'worker', '+6281234567891',
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create business profile
INSERT INTO businesses (user_id, name, description, address, phone, created_at, updated_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Demo Business', 'Demo business for testing', 'Jl. Demo No. 123, Bali', '+6281234567890',
  NOW(), NOW()
) ON CONFLICT (user_id) DO NOTHING;

-- Create worker profile
INSERT INTO workers (user_id, full_name, phone, address, created_at, updated_at)
VALUES (
  'b1ffcd00-0d1c-5f90-cc7e-7cca0e491b22',
  'Demo Worker', '+6281234567891', 'Jl. Worker No. 456, Bali',
  NOW(), NOW()
) ON CONFLICT (user_id) DO NOTHING;

-- Create wallets
INSERT INTO wallets (user_id, balance, currency, is_active, created_at, updated_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  1000000, 'IDR', true, NOW(), NOW()
) ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance, updated_at = NOW();

INSERT INTO wallets (user_id, balance, currency, is_active, created_at, updated_at)
VALUES (
  'b1ffcd00-0d1c-5f90-cc7e-7cca0e491b22',
  500000, 'IDR', true, NOW(), NOW()
) ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance, updated_at = NOW();

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
