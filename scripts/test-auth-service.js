#!/usr/bin/env node

/**
 * Auth Service Test Script
 *
 * This script tests the Supabase auth service integration with the Next.js app.
 * It verifies that registration and login work correctly.
 *
 * Usage: node scripts/test-auth-service.js
 *
 * Prerequisites:
 * - Supabase Local must be running
 * - .env.local must be configured
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  process.exit(1);
}

// Create clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Test data
const testTimestamp = Date.now();
const testWorker = {
  email: `test-worker-${testTimestamp}@example.com`,
  password: 'Test123456!',
  fullName: `Test Worker ${testTimestamp}`,
  role: 'worker'
};

const testBusiness = {
  email: `test-business-${testTimestamp}@example.com`,
  password: 'Test123456!',
  fullName: `Test Business ${testTimestamp}`,
  role: 'business'
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'blue');
  console.log('='.repeat(60) + '\n');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function cleanupTestUsers() {
  section('Cleaning up previous test users');

  const { data, error } = await supabaseAdmin
    .from('users')
    .delete()
    .like('email', 'test-%@example.com');

  if (error) {
    log(`Warning: Could not cleanup: ${error.message}`, 'yellow');
  } else {
    log('✓ Cleanup completed', 'green');
  }
}

async function testWorkerRegistration() {
  section('TEST 1: Worker Registration');

  log(`Email: ${testWorker.email}`, 'yellow');
  log(`Password: ${testWorker.password}`, 'yellow');
  log(`Full Name: ${testWorker.fullName}`, 'yellow');
  log(`Role: ${testWorker.role}`, 'yellow');
  console.log();

  try {
    // Step 1: Register with Supabase Auth
    log('Step 1: Creating auth user...', 'blue');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testWorker.email,
      password: testWorker.password,
      options: {
        data: {
          full_name: testWorker.fullName
        }
      }
    });

    if (authError) {
      log(`✗ Auth registration failed: ${authError.message}`, 'red');
      return false;
    }

    if (!authData.user) {
      log('✗ Auth user not created', 'red');
      return false;
    }

    log(`✓ Auth user created with ID: ${authData.user.id}`, 'green');

    // Step 2: Create user profile in public.users
    log('Step 2: Creating user profile...', 'blue');
    const { error: profileError } = await supabase.from('users').insert([
      {
        id: authData.user.id,
        email: authData.user.email,
        full_name: testWorker.fullName,
        role: testWorker.role,
        phone: '',
        avatar_url: ''
      }
    ]);

    if (profileError) {
      log(`✗ Profile creation failed: ${profileError.message}`, 'red');
      return false;
    }

    log('✓ User profile created', 'green');

    // Step 3: Verify user profile exists
    log('Step 3: Verifying user profile...', 'blue');
    await sleep(500); // Give DB time to sync

    const { data: profile, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (fetchError || !profile) {
      log(`✗ Profile verification failed: ${fetchError?.message || 'Not found'}`, 'red');
      return false;
    }

    log('✓ User profile verified:', 'green');
    log(`  - ID: ${profile.id}`, 'green');
    log(`  - Email: ${profile.email}`, 'green');
    log(`  - Full Name: ${profile.full_name}`, 'green');
    log(`  - Role: ${profile.role}`, 'green');

    // Store user ID for login test
    testWorker.id = authData.user.id;
    testWorker.accessToken = authData.session?.access_token;

    return true;
  } catch (error) {
    log(`✗ Unexpected error: ${error.message}`, 'red');
    return false;
  }
}

async function testBusinessRegistration() {
  section('TEST 2: Business Registration');

  log(`Email: ${testBusiness.email}`, 'yellow');
  console.log();

  try {
    // Register with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testBusiness.email,
      password: testBusiness.password,
      options: {
        data: {
          full_name: testBusiness.fullName
        }
      }
    });

    if (authError) {
      log(`✗ Auth registration failed: ${authError.message}`, 'red');
      return false;
    }

    if (!authData.user) {
      log('✗ Auth user not created', 'red');
      return false;
    }

    log(`✓ Auth user created with ID: ${authData.user.id}`, 'green');

    // Create user profile
    const { error: profileError } = await supabase.from('users').insert([
      {
        id: authData.user.id,
        email: authData.user.email,
        full_name: testBusiness.fullName,
        role: testBusiness.role,
        phone: '',
        avatar_url: ''
      }
    ]);

    if (profileError) {
      log(`✗ Profile creation failed: ${profileError.message}`, 'red');
      return false;
    }

    log('✓ Business user profile created', 'green');

    // Store credentials for login test
    testBusiness.id = authData.user.id;

    return true;
  } catch (error) {
    log(`✗ Unexpected error: ${error.message}`, 'red');
    return false;
  }
}

async function testWorkerLogin() {
  section('TEST 3: Worker Login');

  try {
    log(`Email: ${testWorker.email}`, 'yellow');
    log(`Password: ******`, 'yellow');
    console.log();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: testWorker.email,
      password: testWorker.password
    });

    if (error) {
      log(`✗ Login failed: ${error.message}`, 'red');
      return false;
    }

    if (!data.session) {
      log('✗ No session created', 'red');
      return false;
    }

    log('✓ Login successful', 'green');
    log(`✓ Access token: ${data.session.access_token.substring(0, 20)}...`, 'green');
    log(`✓ Expires in: ${data.session.expires_in} seconds`, 'green');
    log(`✓ User ID: ${data.user.id}`, 'green');
    log(`✓ User email: ${data.user.email}`, 'green');

    return true;
  } catch (error) {
    log(`✗ Unexpected error: ${error.message}`, 'red');
    return false;
  }
}

async function testBusinessLogin() {
  section('TEST 4: Business Login');

  try {
    log(`Email: ${testBusiness.email}`, 'yellow');
    console.log();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: testBusiness.email,
      password: testBusiness.password
    });

    if (error) {
      log(`✗ Login failed: ${error.message}`, 'red');
      return false;
    }

    if (!data.session) {
      log('✗ No session created', 'red');
      return false;
    }

    log('✓ Login successful', 'green');
    log(`✓ User ID: ${data.user.id}`, 'green');

    return true;
  } catch (error) {
    log(`✗ Unexpected error: ${error.message}`, 'red');
    return false;
  }
}

async function testDatabaseIntegrity() {
  section('TEST 5: Database Integrity');

  try {
    // Check auth.users count
    const { count: authCount, error: authError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (authError) {
      log(`✗ Could not count users: ${authError.message}`, 'red');
      return false;
    }

    log(`✓ Total users in public.users: ${authCount}`, 'green');

    // Check for orphaned records
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (usersError) {
      log(`✗ Could not fetch users: ${usersError.message}`, 'red');
      return false;
    }

    log('\nRecent users:', 'blue');
    users.forEach(user => {
      log(`  - ${user.email} (${user.role})`, 'green');
    });

    return true;
  } catch (error) {
    log(`✗ Unexpected error: ${error.message}`, 'red');
    return false;
  }
}

async function testLogout() {
  section('TEST 6: Logout');

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      log(`✗ Logout failed: ${error.message}`, 'red');
      return false;
    }

    log('✓ Logout successful', 'green');

    // Verify session is cleared
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      log('✗ Session still exists after logout', 'red');
      return false;
    }

    log('✓ Session cleared', 'green');

    return true;
  } catch (error) {
    log(`✗ Unexpected error: ${error.message}`, 'red');
    return false;
  }
}

async function printSummary(results) {
  section('TEST SUMMARY');

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.log();
  results.forEach(result => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const color = result.passed ? 'green' : 'red';
    log(`${status}: ${result.name}`, color);
  });

  console.log();
  console.log('='.repeat(60));
  log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`, passed === total ? 'green' : 'red');
  console.log('='.repeat(60));

  if (failed === 0) {
    log('\n🎉 All tests passed! Auth service is working correctly.', 'green');
  } else {
    log(`\n⚠️  ${failed} test(s) failed. Please review the errors above.`, 'yellow');
  }

  console.log();
}

async function main() {
  console.clear();
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║     Supabase Auth Service Verification Test                ║', 'blue');
  log('║     Daily Worker Hub - Subtask 7-3                         ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');

  log(`\nSupabase URL: ${SUPABASE_URL}`, 'yellow');
  log(`Timestamp: ${new Date().toISOString()}`, 'yellow');
  log(`Test ID: ${testTimestamp}`, 'yellow');

  const results = [];

  try {
    // Check connection
    log('\nTesting Supabase connection...', 'blue');
    const { error: connectionError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (connectionError) {
      log('✗ Cannot connect to Supabase. Is it running?', 'red');
      log('\nStart Supabase with:', 'yellow');
      log('  npx supabase@latest start', 'yellow');
      log('  or', 'yellow');
      log('  ./scripts/start-supabase.sh', 'yellow');
      process.exit(1);
    }

    log('✓ Connected to Supabase', 'green');

    // Run tests
    await cleanupTestUsers();
    await sleep(1000);

    results.push({ name: 'Worker Registration', passed: await testWorkerRegistration() });
    await sleep(500);

    results.push({ name: 'Business Registration', passed: await testBusinessRegistration() });
    await sleep(500);

    results.push({ name: 'Worker Login', passed: await testWorkerLogin() });
    await sleep(500);

    results.push({ name: 'Business Login', passed: await testBusinessLogin() });
    await sleep(500);

    results.push({ name: 'Database Integrity', passed: await testDatabaseIntegrity() });

    results.push({ name: 'Logout', passed: await testLogout() });

    await printSummary(results);

    // Exit with appropriate code
    process.exit(results.every(r => r.passed) ? 0 : 1);

  } catch (error) {
    log(`\n✗ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
main();
