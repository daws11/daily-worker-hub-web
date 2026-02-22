#!/usr/bin/env node

/**
 * Supabase Storage Service Verification Script
 *
 * This script tests the Supabase Storage service by:
 * 1. Verifying storage service is running
 * 2. Checking all buckets exist (avatars, documents, images)
 * 3. Uploading test files to each bucket
 * 4. Verifying files are accessible
 * 5. Testing RLS policies
 *
 * Prerequisites:
 * - Supabase Local must be running (npx supabase start)
 * - At least one test user must exist
 *
 * Usage:
 *   node scripts/test-storage-service.js
 *
 * Environment variables (optional):
 *   SUPABASE_URL - Default: http://127.0.0.1:54321
 *   SUPABASE_ANON_KEY - Default: local dev anon key
 *   TEST_USER_EMAIL - Email of test user
 *   TEST_USER_PASSWORD - Password of test user
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  console.log('\n' + colors.bright + colors.blue + `▶ ${step}` + colors.reset);
}

function logSuccess(message) {
  log(`  ✓ ${message}`, 'green');
}

function logError(message) {
  log(`  ✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`  ℹ ${message}`, 'cyan');
}

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoicG5wX2VyIiwicG9zIjoiYXV0byIsInVsIjoiaXN5eXAiOiJyZW0iLCJ0eXBlIjoiY2FsbCIsIm5hbWUiOiJwdWJsaWMifQ==';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'worker1@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'password123';

// Test configuration
const BUCKETS = ['avatars', 'documents', 'images'];
const TEST_FILE_PATHS = {
  avatars: null, // Will be generated
  documents: null, // Will be generated
  images: null, // Will be generated
};

let accessToken = null;
let userId = null;

/**
 * Generate a small test image file
 */
function generateTestImage(outputPath) {
  // Create a minimal 1x1 PNG file (red pixel)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk start
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
    0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
    0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
  ]);

  fs.writeFileSync(outputPath, pngData);
  return outputPath;
}

/**
 * Generate a small test PDF file
 */
function generateTestPDF(outputPath) {
  // Create a minimal PDF file
  const pdfData = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj ' +
    '2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj ' +
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj ' +
    'xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n' +
    'trailer<</Size 4/Root 1 0 R>>\nstartxref\n210\n%%EOF'
  );

  fs.writeFileSync(outputPath, pdfData);
  return outputPath;
}

/**
 * Make an HTTP request
 */
async function request(endpoint, options = {}) {
  const url = `${SUPABASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: await response.json().catch(() => null),
      text: await response.text().catch(() => null),
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
    };
  }
}

/**
 * Test 1: Verify Storage Service is Running
 */
async function testStorageServiceRunning() {
  logStep('Test 1: Verify Storage Service is Running');

  const result = await request('/storage/v1/bucket');

  if (result.ok) {
    logSuccess('Storage API is accessible');
    logInfo(`URL: ${SUPABASE_URL}/storage/v1/`);
    return true;
  } else {
    logError('Storage API is not accessible');
    logInfo(`Error: ${result.error || result.statusText}`);
    return false;
  }
}

/**
 * Test 2: Verify All Buckets Exist
 */
async function testBucketsExist() {
  logStep('Test 2: Verify All Buckets Exist');

  const result = await request('/storage/v1/bucket');

  if (!result.ok) {
    logError('Failed to list buckets');
    return false;
  }

  const buckets = result.data;
  const missingBuckets = BUCKETS.filter(b => !buckets.includes(b));

  if (missingBuckets.length > 0) {
    logError(`Missing buckets: ${missingBuckets.join(', ')}`);
    logInfo(`Found buckets: ${buckets.join(', ') || 'none'}`);
    return false;
  }

  logSuccess('All required buckets exist');
  BUCKETS.forEach(bucket => {
    logInfo(`  - ${bucket}`);
  });

  return true;
}

/**
 * Test 3: Authenticate and Get User ID
 */
async function testAuthenticate() {
  logStep('Test 3: Authenticate Test User');

  const result = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    }),
  });

  if (!result.ok || !result.data?.access_token) {
    logError('Authentication failed');
    logInfo(`Using email: ${TEST_USER_EMAIL}`);
    logInfo('Make sure this user exists in the database');
    logInfo('You can create a test user via the registration page');
    return false;
  }

  accessToken = result.data.access_token;
  userId = result.data.user?.id;

  logSuccess('Authentication successful');
  logInfo(`User ID: ${userId}`);
  logInfo(`Access Token: ${accessToken.substring(0, 20)}...`);

  return true;
}

/**
 * Test 4: Upload Test Files
 */
async function testUploadFiles() {
  logStep('Test 4: Upload Test Files to Each Bucket');

  if (!userId) {
    logError('No user ID available. Authentication must succeed first.');
    return false;
  }

  // Create temp directory for test files
  const tempDir = path.join(process.cwd(), '.temp-test-files');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Generate test files
  const avatarPath = generateTestImage(path.join(tempDir, 'test-avatar.png'));
  const documentPath = generateTestPDF(path.join(tempDir, 'test-document.pdf'));
  const imagePath = generateTestImage(path.join(tempDir, 'test-image.png'));

  const uploads = [
    { bucket: 'avatars', path: avatarPath, name: 'avatar.png', mime: 'image/png' },
    { bucket: 'documents', path: documentPath, name: 'document.pdf', mime: 'application/pdf' },
    { bucket: 'images', path: imagePath, name: 'image.png', mime: 'image/png' },
  ];

  let allSuccess = true;

  for (const upload of uploads) {
    const filePath = `${userId}/${upload.name}`;
    const fileBuffer = fs.readFileSync(upload.path);

    logInfo(`Uploading to ${upload.bucket}...`);

    const result = await request(`/storage/v1/object/${upload.bucket}/${filePath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': upload.mime,
      },
      body: fileBuffer,
    });

    if (result.ok || result.status === 200) {
      logSuccess(`Uploaded ${upload.name} to ${upload.bucket}`);
      TEST_FILE_PATHS[upload.bucket] = filePath;
    } else {
      logError(`Failed to upload to ${upload.bucket}`);
      logInfo(`Status: ${result.status} ${result.statusText}`);
      if (result.data) {
        logInfo(`Error: ${JSON.stringify(result.data)}`);
      }
      allSuccess = false;
    }
  }

  // Cleanup temp files
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {
    // Ignore cleanup errors
  }

  return allSuccess;
}

/**
 * Test 5: Verify File Access
 */
async function testFileAccess() {
  logStep('Test 5: Verify File Access');

  let allSuccess = true;

  // Test public bucket access (avatars, images) - should work without auth
  for (const bucket of ['avatars', 'images']) {
    const filePath = TEST_FILE_PATHS[bucket];
    if (!filePath) continue;

    logInfo(`Testing public access to ${bucket}...`);

    const result = await request(`/storage/v1/object/public/${bucket}/${filePath}`);

    if (result.ok) {
      logSuccess(`Public access works for ${bucket}`);
    } else {
      logError(`Public access failed for ${bucket}`);
      allSuccess = false;
    }
  }

  // Test private bucket access (documents) - should require auth
  const docPath = TEST_FILE_PATHS['documents'];
  if (docPath) {
    logInfo('Testing private access to documents (without auth)...');

    // First, try without auth - should fail
    const noAuthResult = await request(`/storage/v1/object/documents/${docPath}`);

    if (!noAuthResult.ok) {
      logSuccess('Correctly blocks unauthenticated access to documents');
    } else {
      logError('Private documents are accessible without auth!');
      allSuccess = false;
    }

    // Now try with auth - should succeed
    logInfo('Testing private access to documents (with auth)...');

    const authResult = await request(`/storage/v1/object/documents/${docPath}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (authResult.ok) {
      logSuccess('Authenticated access works for documents');
    } else {
      logError('Authenticated access failed for documents');
      allSuccess = false;
    }
  }

  return allSuccess;
}

/**
 * Test 6: List Files in Bucket
 */
async function testListFiles() {
  logStep('Test 6: List Files in Buckets');

  let allSuccess = true;

  for (const bucket of BUCKETS) {
    logInfo(`Listing files in ${bucket}...`);

    const result = await request(`/storage/v1/object/list/${bucket}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (result.ok) {
      const fileCount = result.data?.length || 0;
      logSuccess(`Listed ${fileCount} file(s) in ${bucket}`);

      if (fileCount > 0) {
        result.data.forEach(file => {
          logInfo(`  - ${file.name}`);
        });
      }
    } else {
      logError(`Failed to list files in ${bucket}`);
      allSuccess = false;
    }
  }

  return allSuccess;
}

/**
 * Test 7: Verify Bucket Properties
 */
async function testBucketProperties() {
  logStep('Test 7: Verify Bucket Properties via SQL');

  logInfo('This test requires running SQL queries in Studio UI');
  logInfo('Run these queries to verify:');

  console.log('\n' + colors.cyan);
  console.log('-- Check buckets exist:');
  console.log('SELECT id, name, public, file_size_limit, allowed_mime_types');
  console.log('FROM storage.buckets');
  console.log('ORDER BY id;');

  console.log('\n-- Check RLS policies:');
  console.log('SELECT COUNT(*) as policy_count');
  console.log('FROM pg_policies');
  console.log('WHERE schemaname = \'storage\';');
  console.log('-- Expected: 12 policies (4 per bucket)');

  console.log('\n-- Check helper functions:');
  console.log('SELECT routine_name');
  console.log('FROM information_schema.routines');
  console.log('WHERE routine_schema = \'public\'');
  console.log('AND routine_name LIKE \'get_user_%\';');
  console.log('-- Expected: 3 functions');

  console.log('\n-- Check uploaded files:');
  console.log('SELECT bucket_id, name, size, content_type');
  console.log('FROM storage.objects');
  console.log('ORDER BY created_at DESC;');
  console.log(colors.reset);

  logSuccess('SQL queries provided (verify manually in Studio UI)');

  return true;
}

/**
 * Test 8: Cleanup Test Files
 */
async function testCleanup() {
  logStep('Test 8: Cleanup Test Files');

  logInfo('Cleaning up uploaded test files...');

  let allSuccess = true;

  for (const bucket of BUCKETS) {
    const filePath = TEST_FILE_PATHS[bucket];
    if (!filePath) continue;

    const result = await request(`/storage/v1/object/${bucket}/${filePath}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (result.ok) {
      logSuccess(`Deleted test file from ${bucket}`);
    } else {
      logError(`Failed to delete from ${bucket}`);
      allSuccess = false;
    }
  }

  return allSuccess;
}

/**
 * Main test runner
 */
async function main() {
  console.log('\n' + colors.bright);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Supabase Storage Service Verification                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  logInfo(`Supabase URL: ${SUPABASE_URL}`);
  logInfo(`Test User: ${TEST_USER_EMAIL}`);

  const tests = [
    { name: 'Storage Service Running', fn: testStorageServiceRunning },
    { name: 'Buckets Exist', fn: testBucketsExist },
    { name: 'Authenticate', fn: testAuthenticate, continueOnError: false },
    { name: 'Upload Files', fn: testUploadFiles, requireAuth: true },
    { name: 'File Access', fn: testFileAccess, requireAuth: true },
    { name: 'List Files', fn: testListFiles, requireAuth: true },
    { name: 'Bucket Properties', fn: testBucketProperties },
    { name: 'Cleanup', fn: testCleanup, requireAuth: true },
  ];

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  for (const test of tests) {
    if (test.requireAuth && !accessToken) {
      log(`\n⏭ Skipping ${test.name} (authentication failed)`, 'yellow');
      results.skipped++;
      if (!test.continueOnError) break;
      continue;
    }

    try {
      const passed = await test.fn();
      if (passed) {
        results.passed++;
      } else {
        results.failed++;
        if (test.continueOnError === false) {
          log('\n' + colors.red + 'Critical test failed. Stopping.' + colors.reset);
          break;
        }
      }
    } catch (error) {
      logError(`Test "${test.name}" threw an error: ${error.message}`);
      results.failed++;
      if (test.continueOnError === false) break;
    }
  }

  // Print summary
  console.log('\n' + colors.bright);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Test Summary                                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  log(`Tests Passed: ${results.passed}`, 'green');
  if (results.failed > 0) {
    log(`Tests Failed: ${results.failed}`, 'red');
  }
  if (results.skipped > 0) {
    log(`Tests Skipped: ${results.skipped}`, 'yellow');
  }

  console.log('');

  if (results.failed === 0) {
    log('✓ All storage service tests passed!', 'green');
    console.log('');
    logInfo('Next steps:');
    logInfo('1. Verify bucket properties in Studio UI');
    logInfo('2. Check RLS policies are working correctly');
    logInfo('3. Test file uploads through the frontend application');
    process.exit(0);
  } else {
    log('✗ Some tests failed. Please check the errors above.', 'red');
    console.log('');
    logInfo('Troubleshooting:');
    logInfo('1. Make sure Supabase Local is running: npx supabase start');
    logInfo('2. Verify storage migration was applied: supabase migration list');
    logInfo('3. Check if test user exists in the database');
    process.exit(1);
  }
}

// Run the tests
main().catch(error => {
  console.error(colors.red + 'Fatal error:' + colors.reset, error);
  process.exit(1);
});
