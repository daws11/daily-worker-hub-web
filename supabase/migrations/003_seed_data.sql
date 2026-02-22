-- ============================================================================
-- Daily Worker Hub - Seed Data Migration
-- ============================================================================
-- This migration creates seed data for development and testing purposes.
-- Version: 003
-- Date: 2026-02-22
-- ============================================================================

-- ============================================================================
-- NOTE: This seed data is for development/testing only.
-- Users table entries reference auth.users which must exist first.
-- For local development, you may need to create test users via:
-- 1. Supabase Studio > Authentication > Add User
-- 2. Or disable RLS temporarily during seeding
-- ============================================================================

-- ============================================================================
-- CATEGORIES (Job Categories)
-- ============================================================================

INSERT INTO categories (id, name, slug) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Construction', 'construction'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Cleaning', 'cleaning'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Moving & Delivery', 'moving-delivery'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Landscaping', 'landscaping'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Electrical', 'electrical'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Plumbing', 'plumbing'),
  ('550e8400-e29b-41d4-a716-446655440007', 'Painting', 'painting'),
  ('550e8400-e29b-41d4-a716-446655440008', 'General Labor', 'general-labor'),
  ('550e8400-e29b-41d4-a716-446655440009', 'Carpentry', 'carpentry'),
  ('550e8400-e29b-41d4-a716-446655440010', 'Event Setup', 'event-setup')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SKILLS (Worker Skills)
-- ============================================================================

INSERT INTO skills (id, name, slug) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', 'Heavy Lifting', 'heavy-lifting'),
  ('650e8400-e29b-41d4-a716-446655440002', 'Power Tools', 'power-tools'),
  ('650e8400-e29b-41d4-a716-446655440003', 'Forklift Operation', 'forklift-operation'),
  ('650e8400-e29b-41d4-a716-446655440004', 'Welding', 'welding'),
  ('650e8400-e29b-41d4-a716-446655440005', 'Electrical Wiring', 'electrical-wiring'),
  ('650e8400-e29b-41d4-a716-446655440006', 'Pipe Fitting', 'pipe-fitting'),
  ('650e8400-e29b-41d4-a716-446655440007', 'Drywall Installation', 'drywall-installation'),
  ('650e8400-e29b-41d4-a716-446655440008', 'Flooring Installation', 'flooring-installation'),
  ('650e8400-e29b-41d4-a716-446655440009', 'Painting', 'painting'),
  ('650e8400-e29b-41d4-a716-446655440010', 'Landscaping', 'landscaping'),
  ('650e8400-e29b-41d4-a716-446655440011', 'Tree Trimming', 'tree-trimming'),
  ('650e8400-e29b-41d4-a716-446655440012', 'Driving', 'driving'),
  ('650e8400-e29b-41d4-a716-446655440013', 'Customer Service', 'customer-service'),
  ('650e8400-e29b-41d4-a716-446655440014', 'Time Management', 'time-management'),
  ('650e8400-e29b-41d4-a716-446655440015', 'Team Collaboration', 'team-collaboration')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- USERS (Development Test Users)
-- ============================================================================
-- NOTE: These users reference auth.users. For local development:
-- 1. Create auth users first via Studio or API
-- 2. Or use a service role key to bypass RLS during seeding
-- The UUIDs below match common test user IDs

-- Business Users
INSERT INTO users (id, email, full_name, avatar_url, role, phone) VALUES
  ('11111111-1111-1111-1111-111111111111', 'business@acme-construction.com', 'ACME Construction Inc.', '', 'business', '+62-21-5555-0001'),
  ('11111111-1111-1111-1111-111111111112', 'hr@techstartup.io', 'TechStart Solutions', '', 'business', '+62-21-5555-0002'),
  ('11111111-1111-1111-1111-111111111113', 'contact@eventpro.com', 'EventPro Productions', '', 'business', '+62-21-5555-0003'),
  ('11111111-1111-1111-1111-111111111114', 'office@greencleaning.co.id', 'Green Cleaning Services', '', 'business', '+62-21-5555-0004'),
  ('11111111-1111-1111-1111-111111111115', 'logistics@fastmove.id', 'FastMove Logistics', '', 'business', '+62-21-5555-0005')
ON CONFLICT (email) DO NOTHING;

-- Worker Users
INSERT INTO users (id, email, full_name, avatar_url, role, phone) VALUES
  ('22222222-2222-2222-2222-222222222201', 'worker1.budi@gmail.com', 'Budi Santoso', '', 'worker', '+62-812-3456-7801'),
  ('22222222-2222-2222-2222-222222222202', 'worker2.siti@yahoo.com', 'Siti Rahayu', '', 'worker', '+62-812-3456-7802'),
  ('22222222-2222-2222-2222-222222222203', 'worker3.agus@gmail.com', 'Agus Wijaya', '', 'worker', '+62-812-3456-7803'),
  ('22222222-2222-2222-2222-222222222204', 'worker4.dewi@hotmail.com', 'Dewi Lestari', '', 'worker', '+62-812-3456-7804'),
  ('22222222-2222-2222-2222-222222222205', 'worker5.reza@gmail.com', 'Reza Pratama', '', 'worker', '+62-812-3456-7805'),
  ('22222222-2222-2222-2222-222222222206', 'worker6.rina@yahoo.com', 'Rina Kusuma', '', 'worker', '+62-812-3456-7806'),
  ('22222222-2222-2222-2222-222222222207', 'worker7.hendra@gmail.com', 'Hendra Setiawan', '', 'worker', '+62-812-3456-7807'),
  ('22222222-2222-2222-2222-222222222208', 'worker8.putri@hotmail.com', 'Putri Ayu', '', 'worker', '+62-812-3456-7808'),
  ('22222222-2222-2222-2222-222222222209', 'worker9.fajar@gmail.com', 'Fajar Nugroho', '', 'worker', '+62-812-3456-7809'),
  ('22222222-2222-2222-2222-222222222210', 'worker10.linda@yahoo.com', 'Linda Wati', '', 'worker', '+62-812-3456-7810')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- BUSINESSES (Business Profiles)
-- ============================================================================

INSERT INTO businesses (id, user_id, name, description, phone, email, website, is_verified, address, lat, lng) VALUES
  ('b0011111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'ACME Construction Inc.', 'Leading construction company specializing in residential and commercial projects', '+62-21-5555-0001', 'info@acme-construction.com', 'https://acme-construction.com', TRUE, 'Jl. Sudirman No. 123, Jakarta Pusat', -6.200000, 106.816666),
  ('b0011111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111112', 'TechStart Solutions', 'Innovative tech company seeking flexible labor for office setup and events', '+62-21-5555-0002', 'hr@techstartup.io', 'https://techstartup.io', TRUE, 'Jl. Gatot Subroto No. 45, Jakarta Selatan', -6.225000, 106.800000),
  ('b0011111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111113', 'EventPro Productions', 'Professional event production company', '+62-21-5555-0003', 'contact@eventpro.com', 'https://eventpro.com', TRUE, 'Jl. Senopati No. 89, Jakarta Selatan', -6.230000, 106.820000),
  ('b0011111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111114', 'Green Cleaning Services', 'Eco-friendly cleaning solutions for homes and offices', '+62-21-5555-0004', 'office@greencleaning.co.id', 'https://greencleaning.co.id', FALSE, 'Jl. Fatmawati No. 67, Jakarta Selatan', -6.260000, 106.780000),
  ('b0011111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111115', 'FastMove Logistics', 'Reliable moving and delivery services', '+62-21-5555-0005', 'logistics@fastmove.id', 'https://fastmove.id', TRUE, 'Jl. Pemuda No. 123, Jakarta Timur', -6.190000, 106.890000)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- WORKERS (Worker Profiles)
-- ============================================================================

INSERT INTO workers (id, user_id, full_name, bio, phone, address, location_name, lat, lng) VALUES
  ('w0022222-2222-2222-2222-222222222201', '22222222-2222-2222-2222-222222222201', 'Budi Santoso', 'Experienced construction worker with 5+ years in residential projects. Skilled in tiling, painting, and general labor.', '+62-812-3456-7801', 'Jl. Merdeka No. 45, Jakarta Pusat', 'Jakarta Pusat', -6.175000, 106.827000),
  ('w0022222-2222-2222-2222-222222222202', '22222222-2222-2222-2222-222222222202', 'Siti Rahayu', 'Professional cleaner specializing in residential and office cleaning. Detail-oriented and reliable.', '+62-812-3456-7802', 'Jl. Thamrin No. 78, Jakarta Pusat', 'Jakarta Pusat', -6.190000, 106.823000),
  ('w0022222-2222-2222-2222-222222222203', '22222222-2222-2222-2222-222222222203', 'Agus Wijaya', 'Skilled electrician with 7 years of experience. Licensed and insured.', '+62-812-3456-7803', 'Jl. Sudirman No. 156, Jakarta Pusat', 'Jakarta Pusat', -6.200000, 106.816000),
  ('w0022222-2222-2222-2222-222222222204', '22222222-2222-2222-2222-222222222204', 'Dewi Lestari', 'Landscaping expert. Experience in garden design, lawn care, and tree trimming.', '+62-812-3456-7804', 'Jl. Gatot Subroto No. 234, Jakarta Selatan', 'Jakarta Selatan', -6.230000, 106.800000),
  ('w0022222-2222-2222-2222-222222222205', '22222222-2222-2222-2222-222222222205', 'Reza Pratama', 'Moving and delivery specialist. Can drive small trucks and handle heavy lifting.', '+62-812-3456-7805', 'Jl. Kebayoran Baru No. 12, Jakarta Selatan', 'Jakarta Selatan', -6.255000, 106.780000),
  ('w0022222-2222-2222-2222-222222222206', '22222222-2222-2222-2222-222222222206', 'Rina Kusuma', 'Professional painter for interior and exterior. Fast and clean work.', '+62-812-3456-7806', 'Jl. Fatmawati No. 89, Jakarta Selatan', 'Jakarta Selatan', -6.265000, 106.785000),
  ('w0022222-2222-2222-2222-222222222207', '22222222-2222-2222-2222-222222222207', 'Hendra Setiawan', 'Plumber with 10 years experience. All plumbing repairs and installations.', '+62-812-3456-7807', 'Jl. Pancoran No. 56, Jakarta Selatan', 'Jakarta Selatan', -6.250000, 106.850000),
  ('w0022222-2222-2222-2222-222222222208', '22222222-2222-2222-2222-222222222208', 'Putri Ayu', 'Event setup and decoration specialist. Experience with corporate events and weddings.', '+62-812-3456-7808', 'Jl. Senopati No. 34, Jakarta Selatan', 'Jakarta Selatan', -6.225000, 106.820000),
  ('w0022222-2222-2222-2222-222222222209', '22222222-2222-2222-2222-222222222209', 'Fajar Nugroho', 'Carpenter and handyman. Furniture assembly, repairs, and custom woodwork.', '+62-812-3456-7809', 'Jl. Pemuda No. 78, Jakarta Timur', 'Jakarta Timur', -6.195000, 106.880000),
  ('w0022222-2222-2222-2222-222222222210', '22222222-2222-2222-2222-222222222210', 'Linda Wati', 'General labor and event staff. Reliable, punctual, and hardworking.', '+62-812-3456-7810', 'Jl. Rawamangun No. 45, Jakarta Timur', 'Jakarta Timur', -6.185000, 106.870000)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- JOBS (Sample Job Listings)
-- ============================================================================

INSERT INTO jobs (id, business_id, category_id, title, description, requirements, budget_min, budget_max, status, deadline, address, lat, lng) VALUES
  ('j0011111-1111-1111-1111-111111111101', 'b0011111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440001', 'Construction Workers Needed for Residential Project',
   'We need 3 experienced construction workers for a 2-week residential renovation project in Central Jakarta. Work includes demolition, framing, and general labor.',
   'Minimum 2 years experience in construction. Must be able to lift 50lbs+. Own tools preferred.',
   150000, 200000, 'open', '2026-03-15', 'Jl. Merdeka No. 100, Jakarta Pusat', -6.175000, 106.827000),

  ('j0011111-1111-1111-1111-111111111102', 'b0011111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440001', 'Skilled Carpenter for Custom Built-ins',
   'Looking for an experienced carpenter to build custom shelving and cabinets for a client in South Jakarta. Project duration: 5 days.',
   '5+ years carpentry experience. Portfolio required. Must have own tools.',
   200000, 300000, 'open', '2026-03-10', 'Jl. Senopati No. 45, Jakarta Selatan', -6.225000, 106.820000),

  ('j0011111-1111-1111-1111-111111111103', 'b0011111-1111-1111-1111-111111111114', '550e8400-e29b-41d4-a716-446655440002', 'Office Deep Cleaning - Weekend',
   'Need a team of 2-3 cleaners for deep cleaning of our 500sqm office in Central Jakarta. Must be available this weekend (Saturday/Sunday).',
   'Professional cleaning experience. Attention to detail. Eco-friendly products preferred.',
   100000, 150000, 'open', '2026-03-01', 'Jl. Sudirman No. 200, Jakarta Pusat', -6.200000, 106.816000),

  ('j0011111-1111-1111-1111-111111111104', 'b0011111-1111-1111-1111-111111111115', '550e8400-e29b-41d4-a716-446655440003', 'Moving Assistants Needed - 2 Day Job',
   'Looking for 4 strong, reliable workers to help with office relocation. Heavy furniture and boxes involved. Elevator available.',
   'Must be physically fit for heavy lifting. Previous moving experience preferred.',
   120000, 180000, 'open', '2026-03-05', 'Jl. Gatot Subroto No. 100, Jakarta Selatan', -6.230000, 106.800000),

  ('j0011111-1111-1111-1111-111111111105', 'b0011111-1111-1111-1111-111111111113', '550e8400-e29b-41d4-a716-446655440010', 'Event Setup Crew - Corporate Event',
   'Need 6 workers for event setup and teardown. Corporate event at a hotel in Jakarta. Setup day before, teardown after event.',
   'Experience with event setup preferred. Must be reliable and presentable. Uniform provided.',
   150000, 200000, 'in_progress', '2026-03-08', 'Hotel Indonesia Kempinski, Jakarta', -6.190000, 106.823000),

  ('j0011111-1111-1111-1111-111111111106', 'b0011111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440005', 'Electrician for Emergency Repair',
   'URGENT: Need a licensed electrician for emergency repair at a commercial property in East Jakarta. Circuit breaker issue affecting operations.',
   'Licensed electrician. Available immediately. Commercial experience required.',
   250000, 350000, 'open', '2026-02-25', 'Jl. Pemuda No. 150, Jakarta Timur', -6.195000, 106.880000),

  ('j0011111-1111-1111-1111-111111111107', 'b0011111-1111-1111-1111-111111111114', '550e8400-e29b-41d4-a716-446655440004', 'Garden Maintenance - Weekly Service',
   'Looking for a reliable landscaper for weekly garden maintenance at a residential property in South Jakarta. Lawn mowing, trimming, and general upkeep.',
   'Experience with landscaping tools. Transportation required. Weekly availability.',
   80000, 120000, 'open', '2026-04-01', 'Jl. Fatmawati No. 123, Jakarta Selatan', -6.260000, 106.780000),

  ('j0011111-1111-1111-1111-111111111108', 'b0011111-1111-1111-1111-111111111112', '550e8400-e29b-41d4-a716-446655440007', 'Interior Painter Needed',
   'Need a skilled painter for interior painting of a 3-bedroom apartment. 2 walls need specialty finish.',
   '3+ years painting experience. Clean work. Must provide references.',
   150000, 220000, 'completed', '2026-02-20', 'Jl. Gatot Subroto No. 50, Jakarta Selatan', -6.225000, 106.800000),

  ('j0011111-1111-1111-1111-111111111109', 'b0011111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440006', 'Plumber for Bathroom Renovation',
   'Licensed plumber needed for complete bathroom renovation. Toilet, sink, and shower installation. Rough-in already complete.',
   'Licensed plumber. Bathroom renovation experience. References required.',
   200000, 280000, 'open', '2026-03-20', 'Jl. Merdeka No. 50, Jakarta Pusat', -6.175000, 106.827000),

  ('j0011111-1111-1111-1111-111111111110', 'b0011111-1111-1111-1111-111111111113', '550e8400-e29b-41d4-a716-446655440010', 'Event Staff - Wedding Reception',
   'Need 4 presentable staff for wedding reception setup and service. Greeting guests, serving, and cleanup.',
   'Customer service experience. Professional appearance. Available Saturday evening.',
   130000, 180000, 'open', '2026-03-12', 'Hotel Mulia Senayan, Jakarta', -6.225000, 106.797000);

-- ============================================================================
-- JOBS_SKILLS (Job-Skill Relationships)
-- ============================================================================

-- Construction Workers job skills
INSERT INTO jobs_skills (job_id, skill_id) VALUES
  ('j0011111-1111-1111-1111-111111111101', '650e8400-e29b-41d4-a716-446655440001'), -- Heavy Lifting
  ('j0011111-1111-1111-1111-111111111101', '650e8400-e29b-41d4-a716-446655440002'), -- Power Tools
  ('j0011111-1111-1111-1111-111111111101', '650e8400-e29b-41d4-a716-446655440015'); -- Team Collaboration

-- Carpenter job skills
INSERT INTO jobs_skills (job_id, skill_id) VALUES
  ('j0011111-1111-1111-1111-111111111102', '650e8400-e29b-41d4-a716-446655440002'), -- Power Tools
  ('j0011111-1111-1111-1111-111111111102', '650e8400-e29b-41d4-a716-446655440015'); -- Team Collaboration

-- Cleaning job skills
INSERT INTO jobs_skills (job_id, skill_id) VALUES
  ('j0011111-1111-1111-1111-111111111103', '650e8400-e29b-41d4-a716-446655440014'), -- Time Management
  ('j0011111-1111-1111-1111-111111111103', '650e8400-e29b-41d4-a716-446655440013'); -- Customer Service

-- Moving job skills
INSERT INTO jobs_skills (job_id, skill_id) VALUES
  ('j0011111-1111-1111-1111-111111111104', '650e8400-e29b-41d4-a716-446655440001'), -- Heavy Lifting
  ('j0011111-1111-1111-1111-111111111104', '650e8400-e29b-41d4-a716-446655440003'), -- Forklift Operation
  ('j0011111-1111-1111-1111-111111111104', '650e8400-e29b-41d4-a716-446655440012'); -- Driving

-- Event Setup job skills
INSERT INTO jobs_skills (job_id, skill_id) VALUES
  ('j0011111-1111-1111-1111-111111111105', '650e8400-e29b-41d4-a716-446655440001'), -- Heavy Lifting
  ('j0011111-1111-1111-1111-111111111105', '650e8400-e29b-41d4-a716-446655440013'), -- Customer Service
  ('j0011111-1111-1111-1111-111111111105', '650e8400-e29b-41d4-a716-446655440014'), -- Time Management
  ('j0011111-1111-1111-1111-111111111105', '650e8400-e29b-41d4-a716-446655440015'); -- Team Collaboration

-- Electrician job skills
INSERT INTO jobs_skills (job_id, skill_id) VALUES
  ('j0011111-1111-1111-1111-111111111106', '650e8400-e29b-41d4-a716-446655440005'), -- Electrical Wiring
  ('j0011111-1111-1111-1111-111111111106', '650e8400-e29b-41d4-a716-446655440014'); -- Time Management

-- Landscaping job skills
INSERT INTO jobs_skills (job_id, skill_id) VALUES
  ('j0011111-1111-1111-1111-111111111107', '650e8400-e29b-41d4-a716-446655440010'), -- Landscaping
  ('j0011111-1111-1111-1111-111111111107', '650e8400-e29b-41d4-a716-446655440011'), -- Tree Trimming
  ('j0011111-1111-1111-1111-111111111107', '650e8400-e29b-41d4-a716-446655440012'); -- Driving

-- Painter job skills
INSERT INTO jobs_skills (job_id, skill_id) VALUES
  ('j0011111-1111-1111-1111-111111111108', '650e8400-e29b-41d4-a716-446655440009'), -- Painting
  ('j0011111-1111-1111-1111-111111111108', '650e8400-e29b-41d4-a716-446655440014'); -- Time Management

-- Plumber job skills
INSERT INTO jobs_skills (job_id, skill_id) VALUES
  ('j0011111-1111-1111-1111-111111111109', '650e8400-e29b-41d4-a716-446655440006'), -- Pipe Fitting
  ('j0011111-1111-1111-1111-111111111109', '650e8400-e29b-41d4-a716-446655440014'); -- Time Management

-- Event Staff job skills
INSERT INTO jobs_skills (job_id, skill_id) VALUES
  ('j0011111-1111-1111-1111-111111111110', '650e8400-e29b-41d4-a716-446655440013'), -- Customer Service
  ('j0011111-1111-1111-1111-111111111110', '650e8400-e29b-41d4-a716-446655440014'), -- Time Management
  ('j0011111-1111-1111-1111-111111111110', '650e8400-e29b-41d4-a716-446655440015'); -- Team Collaboration

-- ============================================================================
-- BOOKINGS (Sample Bookings)
-- ============================================================================

INSERT INTO bookings (id, job_id, worker_id, business_id, status, start_date, end_date, final_price) VALUES
  ('b0011111-2222-3333-4444-555555555501', 'j0011111-1111-1111-1111-111111111105', 'w0022222-2222-2222-2222-222222222201', 'b0011111-1111-1111-1111-111111111113', 'in_progress', '2026-02-22', '2026-02-23', 175000),
  ('b0011111-2222-3333-4444-555555555502', 'j0011111-1111-1111-1111-111111111105', 'w0022222-2222-2222-2222-222222222202', 'b0011111-1111-1111-1111-111111111113', 'accepted', '2026-02-22', '2026-02-23', 175000),
  ('b0011111-2222-3333-4444-555555555503', 'j0011111-1111-1111-1111-111111111105', 'w0022222-2222-2222-2222-222222222209', 'b0011111-1111-1111-1111-111111111113', 'accepted', '2026-02-22', '2026-02-23', 175000),
  ('b0011111-2222-3333-4444-555555555504', 'j0011111-1111-1111-1111-111111111105', 'w0022222-2222-2222-2222-222222222210', 'b0011111-1111-1111-1111-111111111113', 'pending', '2026-02-22', '2026-02-23', 175000),
  ('b0011111-2222-3333-4444-555555555505', 'j0011111-1111-1111-1111-111111111105', 'w0022222-2222-2222-2222-222222222208', 'b0011111-1111-1111-1111-111111111113', 'pending', '2026-02-22', '2026-02-23', 175000),
  ('b0011111-2222-3333-4444-555555555506', 'j0011111-1111-1111-1111-111111111108', 'w0022222-2222-2222-2222-222222222206', 'b0011111-1111-1111-1111-111111111112', 'completed', '2026-02-18', '2026-02-20', 185000),
  ('b0011111-2222-3333-4444-555555555507', 'j0011111-1111-1111-1111-111111111101', 'w0022222-2222-2222-2222-222222222203', 'b0011111-1111-1111-1111-111111111111', 'pending', '2026-03-01', '2026-03-15', 175000),
  ('b0011111-2222-3333-4444-555555555508', 'j0011111-1111-1111-1111-111111111102', 'w0022222-2222-2222-2222-222222222209', 'b0011111-1111-1111-1111-111111111111', 'pending', '2026-03-05', '2026-03-10', 250000);

-- ============================================================================
-- TRANSACTIONS (Sample Transactions)
-- ============================================================================

INSERT INTO transactions (id, booking_id, amount, type, status, provider_transaction_id) VALUES
  ('t0011111-2222-3333-4444-555555555501', 'b0011111-2222-3333-4444-555555555506', 185000, 'payment', 'success', 'txn_provided_001'),
  ('t0011111-2222-3333-4444-555555555502', 'b0011111-2222-3333-4444-555555555501', 175000, 'payment', 'pending', 'txn_provided_002');

-- ============================================================================
-- MESSAGES (Sample Messages)
-- ============================================================================

INSERT INTO messages (id, sender_id, receiver_id, booking_id, content, is_read) VALUES
  ('m0011111-2222-3333-4444-555555555501', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111113', 'b0011111-2222-3333-4444-555555555501', 'Hi, I am available for the event setup job. I have experience with corporate events.', TRUE),
  ('m0011111-2222-3333-4444-555555555502', '11111111-1111-1111-1111-111111111113', '22222222-2222-2222-2222-222222222201', 'b0011111-2222-3333-4444-555555555501', 'Great! Please arrive at 8 AM for setup. Uniform will be provided.', TRUE),
  ('m0011111-2222-3333-4444-555555555503', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111113', 'b0011111-2222-3333-4444-555555555501', 'Confirmed, see you tomorrow at 8 AM!', FALSE),
  ('m0011111-2222-3333-4444-555555555504', '22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'b0011111-2222-3333-4444-555555555507', 'I am a licensed electrician with 7 years of experience. Available for the emergency repair.', TRUE),
  ('m0011111-2222-3333-4444-555555555505', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', 'b0011111-2222-3333-4444-555555555507', 'Perfect, can you come today at 2 PM? The address is Jl. Merdeka No. 100.', TRUE),
  ('m0011111-2222-3333-4444-555555555506', '22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111112', 'b0011111-2222-3333-4444-555555555506', 'The painting job is complete. Let me know if you need any touch-ups.', TRUE),
  ('m0011111-2222-3333-4444-555555555507', '11111111-1111-1111-1111-111111111112', '22222222-2222-2222-2222-222222222206', 'b0011111-2222-3333-4444-555555555506', 'Excellent work! Payment has been processed. Thank you!', TRUE);

-- ============================================================================
-- REVIEWS (Sample Reviews)
-- ============================================================================

INSERT INTO reviews (id, booking_id, worker_id, rating, comment) VALUES
  ('r0011111-2222-3333-4444-555555555501', 'b0011111-2222-3333-4444-555555555506', 'w0022222-2222-2222-2222-222222222206', 5, 'Rina did an excellent job painting our apartment. Very professional, clean work, and finished on time. Highly recommend!'),
  ('r0011111-2222-3333-4444-555555555502', 'b0011111-2222-3333-4444-555555555506', 'w0022222-2222-2222-2222-222222222206', 5, 'Great attention to detail. Will hire again for future projects.');

-- ============================================================================
-- NOTIFICATIONS (Sample Notifications)
-- ============================================================================

INSERT INTO notifications (id, user_id, title, body, link, is_read) VALUES
  ('n0011111-2222-3333-4444-555555555501', '22222222-2222-2222-2222-222222222201', 'Booking Accepted', 'Your booking for "Event Setup Crew" has been accepted by the business.', '/bookings/b0011111-2222-3333-4444-555555555501', TRUE),
  ('n0011111-2222-3333-4444-555555555502', '22222222-2222-2222-2222-222222222202', 'New Booking Request', 'You have a new booking request for "Event Setup Crew".', '/bookings/b0011111-2222-3333-4444-555555555502', FALSE),
  ('n0011111-2222-3333-4444-555555555503', '22222222-2222-2222-2222-222222222203', 'Payment Received', 'Payment of Rp 185,000 has been received for completed booking.', '/bookings/b0011111-2222-3333-4444-555555555506', TRUE),
  ('n0011111-2222-3333-4444-555555555504', '22222222-2222-2222-2222-222222222206', 'Review Received', 'You received a 5-star review from TechStart Solutions!', '/reviews/r0011111-2222-3333-4444-555555555501', FALSE),
  ('n0011111-2222-3333-4444-555555555505', '11111111-1111-1111-1111-111111111113', 'New Worker Application', 'Budi Santoso has applied for your event setup job.', '/jobs/j0011111-1111-1111-1111-111111111105', TRUE),
  ('n0011111-2222-3333-4444-555555555506', '11111111-1111-1111-1111-111111111113', 'Booking Completed', 'Booking b0011111-2222-3333-4444-555555555501 has been marked as completed.', '/bookings/b0011111-2222-3333-4444-555555555501', FALSE);

-- ============================================================================
-- REPORTS (Sample Reports)
-- ============================================================================

INSERT INTO reports (id, reporter_id, reported_type, reported_id, reason, status) VALUES
  ('rep00111-2222-3333-4444-555555555501', '22222222-2222-2222-2222-222222222202', 'booking', 'b0011111-2222-3333-4444-555555555502', 'Business cancelled the booking without notice 1 day before the event.', 'pending'),
  ('rep00111-2222-3333-4444-555555555502', '11111111-1111-1111-1111-111111111112', 'user', '22222222-2222-2222-2222-222222222206', 'Worker left the job incomplete and stopped responding to messages.', 'reviewing'),
  ('rep00111-2222-3333-4444-555555555503', '22222222-2222-2222-2222-222222222201', 'job', 'j0011111-1111-1111-1111-111111111106', 'Job posting is misleading. Description does not match actual work requirements.', 'resolved');

-- ============================================================================
-- WEBHOOKS (Sample Webhooks - Development)
-- ============================================================================

INSERT INTO webhooks (id, url, secret, events, is_active) VALUES
  ('wh00111-2222-3333-4444-555555555501', 'https://webhook.site/development-test-endpoint', 'dev_secret_key_change_in_prod', ARRAY['booking.created', 'booking.updated'], TRUE),
  ('wh00111-2222-3333-4444-555555555502', 'http://localhost:3000/api/webhooks/dev', 'local_dev_secret', ARRAY['job.created', 'worker.applied'], FALSE);

-- ============================================================================
-- SEEDING SUMMARY
-- ============================================================================
-- Seeded data includes:
-- - 10 job categories
-- - 15 worker skills
-- - 5 business users + 10 worker users (15 total users)
-- - 5 business profiles
-- - 10 worker profiles
-- - 10 job listings (various statuses)
-- - Job-skill relationships for all jobs
-- - 8 bookings (various statuses)
-- - 2 transactions
-- - 7 messages
-- - 2 reviews
-- - 6 notifications
-- - 3 reports
-- - 2 webhooks (development endpoints)
--
-- Total: ~67 records created for development/testing
-- ============================================================================

-- ============================================================================
-- DEVELOPMENT NOTES
-- ============================================================================
-- 1. User IDs in this seed data reference auth.users which must exist first
-- 2. For local development, create test auth users via:
--    - Supabase Studio > Authentication > Add User
--    - Or use the Supabase Auth API
-- 3. To reseed: TRUNCATE all tables and re-run this migration
-- 4. Password for test users (when creating via Studio): Test123456!
-- 5. The seed data follows Indonesian context (Jakarta-based)
-- ============================================================================
