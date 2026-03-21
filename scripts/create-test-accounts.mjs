#!/usr/bin/env node
/**
 * Script to create test accounts for manual testing
 * Uses raw SQL via psql to bypass RLS completely
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create admin client with service role
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Database connection
const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

function runSql(sql) {
  try {
    const result = execSync(`psql "${DB_URL}" -t -A -c "${sql.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result.trim();
  } catch (error) {
    console.error('SQL Error:', error.message);
    return null;
  }
}

function runSqlJson(sql) {
  try {
    const result = execSync(`psql "${DB_URL}" -t -A -c "${sql.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const trimmed = result.trim();
    return trimmed ? JSON.parse(trimmed) : null;
  } catch (error) {
    console.error('SQL Error:', error.message);
    return null;
  }
}

async function getFirstCategoryId() {
  const result = runSql("SELECT id FROM categories LIMIT 1;");
  return result || null;
}

async function createAuthUser(email, password, fullName, role) {
  console.log(`\n👤 Creating auth user: ${email}...`);

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(u => u.email === email);

  if (existing) {
    console.log(`⚠️  User ${email} already exists with ID: ${existing.id}`);
    return existing;
  }

  // Create auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      },
      emailRedirectTo: undefined,
    },
  });

  if (error) {
    console.error('❌ Error creating auth user:', error);
    return null;
  }

  console.log(`✅ Auth user created: ${data?.user?.id}`);
  return data?.user;
}

async function createUserProfile(userId, email, fullName, role) {
  console.log(`\n📝 Creating profile for ${email}...`);

  // Use raw SQL to bypass RLS
  const sql = `
    INSERT INTO users (id, email, full_name, role, phone, avatar_url, language_preference)
    VALUES ('${userId}', '${email}', '${fullName}', '${role}', '', '', 'en')
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role
    RETURNING id;
  `;

  const result = runSql(sql);
  if (result) {
    console.log('✅ Profile created/updated');
    return true;
  }
  return false;
}

async function createWallet(userId) {
  console.log(`\n💰 Creating wallet for user ${userId}...`);

  // Use raw SQL to bypass RLS
  const sql = `
    INSERT INTO wallets (user_id, balance, pending_balance, available_balance)
    VALUES ('${userId}', 0, 0, 0)
    ON CONFLICT (user_id) DO UPDATE SET
      balance = EXCLUDED.balance,
      pending_balance = EXCLUDED.pending_balance,
      available_balance = EXCLUDED.available_balance
    RETURNING id;
  `;

  const result = runSql(sql);
  if (result) {
    console.log('✅ Wallet created/updated');
    return true;
  }
  return false;
}

async function completeWorkerOnboarding(userId, categoryId) {
  console.log('\n🔧 Completing worker onboarding...');

  // Use raw SQL with correct column names
  const sql = `
    INSERT INTO workers (
      user_id, full_name, phone, dob, address, bio,
      kyc_status, reliability_score, jobs_completed, tier,
      avatar_url, location_name
    )
    VALUES (
      '${userId}',
      'Demo Worker',
      '+6281234567890',
      '1990-01-15',
      'Jl. Seminyak No. 123, Seminyak, Bali',
      'Experienced hospitality worker with 3 years in Bali',
      'unverified',
      0.00,
      0,
      'classic',
      '',
      'Seminyak, Bali'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      dob = EXCLUDED.dob,
      address = EXCLUDED.address,
      bio = EXCLUDED.bio
    RETURNING id;
  `;

  const result = runSql(sql);
  if (result) {
    console.log('✅ Worker onboarding completed');
    return true;
  }
  return false;
}

async function completeBusinessOnboarding(userId) {
  console.log('\n🏢 Completing business onboarding...');

  // Use raw SQL with correct column names
  const sql = `
    INSERT INTO businesses (
      user_id, name, phone, email, address, area, business_type,
      description, is_verified, verification_status
    )
    VALUES (
      '${userId}',
      'Grand Bali Hotel',
      '+6281234567891',
      'contact@grandbalihotel.com',
      'Jl. Petitenget No. 456, Seminyak, Bali',
      'Seminyak',
      'hotel',
      'Luxury hotel in Seminyak',
      false,
      'pending'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      address = EXCLUDED.address,
      area = EXCLUDED.area,
      business_type = EXCLUDED.business_type,
      description = EXCLUDED.description
    RETURNING id;
  `;

  const result = runSql(sql);
  if (result) {
    console.log('✅ Business onboarding completed');
    return true;
  }
  return false;
}

async function verifySetup(workerId, businessId) {
  console.log('\n🔍 Verifying setup...');

  // Check profiles
  const profilesSql = `SELECT json_agg(id) as ids FROM users WHERE id IN ('${workerId}', '${businessId}');`;
  const profileIds = runSqlJson(profilesSql);
  if (profileIds && profileIds.length === 2) {
    console.log('✅ 2 profiles verified');
  } else {
    console.log('⚠️  Profile verification issue');
  }

  // Check wallets
  const walletsSql = `SELECT json_agg(user_id) as ids FROM wallets WHERE user_id IN ('${workerId}', '${businessId}');`;
  const walletIds = runSqlJson(walletsSql);
  if (walletIds && walletIds.length === 2) {
    console.log('✅ 2 wallets verified');
  } else {
    console.log('⚠️  Wallet verification issue');
  }

  // Check worker
  const workerSql = `SELECT id FROM workers WHERE user_id = '${workerId}';`;
  const workerResult = runSql(workerSql);
  if (workerResult) {
    console.log('✅ Worker onboarding verified');
  } else {
    console.log('⚠️  Worker not found');
  }

  // Check business
  const businessSql = `SELECT id FROM businesses WHERE user_id = '${businessId}';`;
  const businessResult = runSql(businessSql);
  if (businessResult) {
    console.log('✅ Business onboarding verified');
  } else {
    console.log('⚠️  Business not found');
  }

  return profileIds?.length === 2 && walletIds?.length === 2 && workerResult && businessResult;
}

async function main() {
  console.log('🚀 Creating test accounts for manual testing...');
  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('📍 Database URL:', DB_URL);

  // Get first category ID
  const categoryId = await getFirstCategoryId();
  if (!categoryId) {
    console.error('❌ No category found. Please ensure categories exist.');
    process.exit(1);
  }
  console.log('📌 Using category ID:', categoryId);

  // Create worker account
  const workerUser = await createAuthUser('worker@demo.com', 'demo123456', 'Demo Worker', 'worker');
  if (!workerUser) {
    console.error('❌ Failed to create worker account');
    process.exit(1);
  }

  // Create business account
  const businessUser = await createAuthUser('business@demo.com', 'demo123456', 'Demo Business', 'business');
  if (!businessUser) {
    console.error('❌ Failed to create business account');
    process.exit(1);
  }

  // Create profiles using raw SQL
  await createUserProfile(workerUser.id, 'worker@demo.com', 'Demo Worker', 'worker');
  await createUserProfile(businessUser.id, 'business@demo.com', 'Demo Business', 'business');

  // Create wallets
  await createWallet(workerUser.id);
  await createWallet(businessUser.id);

  // Complete onboarding
  await completeWorkerOnboarding(workerUser.id, categoryId);
  await completeBusinessOnboarding(businessUser.id);

  // Verify setup
  const success = await verifySetup(workerUser.id, businessUser.id);

  if (success) {
    console.log('\n✅ Test accounts created successfully!');
    console.log('\n📋 Test Account Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Worker Account:');
    console.log('   Email: worker@demo.com');
    console.log('   Password: demo123456');
    console.log('');
    console.log('🏢 Business Account:');
    console.log('   Email: business@demo.com');
    console.log('   Password: demo123456');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    console.log('\n⚠️  Setup completed with some errors. Please check the logs above.');
  }
}

main().catch(console.error);
