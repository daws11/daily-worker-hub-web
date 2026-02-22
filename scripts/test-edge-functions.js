#!/usr/bin/env node

/**
 * ============================================================================
 * Edge Functions Test Script
 * ============================================================================
 * Tests Supabase Edge Functions deployment and invocation.
 * Specifically tests the reliability-score function.
 *
 * Usage:
 *   node scripts/test-edge-functions.js
 *
 * Prerequisites:
 *   - Supabase Local running (npx supabase start)
 *   - Database migrations applied
 *   - Seed data loaded
 * ============================================================================
 */

const https = require('https');
const http = require('http');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Test configuration
const CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  testWorkerId: 'w0022222-2222-2222-2222-222222222201', // From seed data
  timeout: 10000, // 10 seconds
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: [],
};

/**
 * Colorful console output helpers
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
  results.passed++;
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
  results.failed++;
  results.errors.push(message);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, colors.cyan);
  console.log('='.repeat(60));
}

/**
 * Make HTTP request to Edge Function
 */
function invokeFunction(workerId, timeout = CONFIG.timeout) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${CONFIG.supabaseUrl}/functions/v1/reliability-score`);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const postData = JSON.stringify({ worker_id: workerId });

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.supabaseAnonKey}`,
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const timer = setTimeout(() => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);

    const req = httpModule.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        clearTimeout(timer);
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Test: Edge Functions service is reachable
 */
async function testServiceReachable() {
  results.total++;
  logInfo('Testing Edge Functions service reachability...');

  try {
    const url = new URL(CONFIG.supabaseUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    await new Promise((resolve, reject) => {
      const req = httpModule.get(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: '/functions/v1/',
          timeout: 5000,
        },
        (res) => {
          if (res.statusCode === 404 || res.statusCode === 200) {
            logSuccess('Edge Functions service is reachable');
            resolve();
          } else {
            reject(new Error(`Unexpected status: ${res.statusCode}`));
          }
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  } catch (error) {
    logError(`Edge Functions service is not reachable: ${error.message}`);
    logWarning('Make sure Supabase Local is running: npx supabase start');
  }
}

/**
 * Test: Invoke function with valid worker_id
 */
async function testValidWorkerId() {
  results.total++;
  logInfo(`Testing function with valid worker_id: ${CONFIG.testWorkerId}`);

  try {
    const response = await invokeFunction(CONFIG.testWorkerId);

    if (response.status === 200 && response.data.success === true) {
      const { reliability_score, metrics } = response.data;

      logSuccess(`Function returned valid response`);
      logInfo(`  - Reliability Score: ${reliability_score} / 5.0`);
      logInfo(`  - Total Bookings: ${metrics.total_bookings}`);
      logInfo(`  - Completed Bookings: ${metrics.completed_bookings}`);
      logInfo(`  - Completion Rate: ${metrics.completion_rate}%`);
      logInfo(`  - Total Reviews: ${metrics.total_reviews}`);
      logInfo(`  - Average Rating: ${metrics.avg_rating}`);

      // Validate score is in valid range
      if (reliability_score >= 1 && reliability_score <= 5) {
        logSuccess('Score is in valid range (1-5)');
      } else {
        logError(`Score ${reliability_score} is out of valid range (1-5)`);
      }

      // Validate metrics
      if (metrics.completion_rate >= 0 && metrics.completion_rate <= 100) {
        logSuccess('Completion rate is in valid range (0-100%)');
      } else {
        logError(`Completion rate ${metrics.completion_rate} is out of valid range (0-100)`);
      }

      if (metrics.avg_rating >= 1 && metrics.avg_rating <= 5) {
        logSuccess('Average rating is in valid range (1-5)');
      } else {
        logError(`Average rating ${metrics.avg_rating} is out of valid range (1-5)`);
      }
    } else {
      logError(`Function returned unexpected response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logError(`Function invocation failed: ${error.message}`);
  }
}

/**
 * Test: Invoke function with missing worker_id (error case)
 */
async function testMissingWorkerId() {
  results.total++;
  logInfo('Testing function with missing worker_id (should return 400)');

  try {
    const url = new URL(CONFIG.supabaseUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const response = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({});

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: '/functions/v1/reliability-score',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.supabaseAnonKey}`,
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = httpModule.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    if (response.status === 400 && response.data.error === 'worker_id is required') {
      logSuccess('Function correctly returns 400 error for missing worker_id');
    } else {
      logError(`Function returned unexpected response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logError(`Function invocation failed: ${error.message}`);
  }
}

/**
 * Test: Invoke function with invalid worker_id (should not error, just return defaults)
 */
async function testInvalidWorkerId() {
  results.total++;
  logInfo('Testing function with invalid worker_id (should return default score)');

  try {
    const invalidWorkerId = '00000000-0000-0000-0000-000000000000';
    const response = await invokeFunction(invalidWorkerId);

    if (response.status === 200 && response.data.success === true) {
      const { reliability_score, metrics } = response.data;

      // With invalid worker, there should be no bookings or reviews
      if (metrics.total_bookings === 0 && metrics.total_reviews === 0) {
        logSuccess('Function returns defaults for non-existent worker');
        logInfo(`  - Default Score: ${reliability_score} (no data)`);
      } else {
        logWarning(`Expected zero bookings/reviews for invalid worker, got: ${JSON.stringify(metrics)}`);
      }
    } else {
      logError(`Function returned unexpected response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logError(`Function invocation failed: ${error.message}`);
  }
}

/**
 * Test: CORS preflight request
 */
async function testCORS() {
  results.total++;
  logInfo('Testing CORS preflight request...');

  try {
    const url = new URL(CONFIG.supabaseUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: '/functions/v1/reliability-score',
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
        },
      };

      const req = httpModule.request(options, (res) => {
        const headers = res.headers;
        resolve({
          status: res.statusCode,
          corsHeaders: {
            'Access-Control-Allow-Origin': headers['access-control-allow-origin'],
            'Access-Control-Allow-Headers': headers['access-control-allow-headers'],
          },
        });
      });

      req.on('error', reject);
      req.end();
    });

    if (response.status === 200) {
      const { corsHeaders } = response;

      if (corsHeaders['Access-Control-Allow-Origin'] === '*') {
        logSuccess('CORS allows all origins (*)');
      } else {
        logWarning(`CORS origin: ${corsHeaders['Access-Control-Allow-Origin']}`);
      }

      if (corsHeaders['Access-Control-Allow-Headers']) {
        logSuccess('CORS headers present');
        logInfo(`  - Allowed headers: ${corsHeaders['Access-Control-Allow-Headers']}`);
      } else {
        logError('CORS headers missing');
      }
    } else {
      logError(`CORS preflight returned status ${response.status}`);
    }
  } catch (error) {
    logError(`CORS test failed: ${error.message}`);
  }
}

/**
 * Test: Response time is acceptable
 */
async function testResponseTime() {
  results.total++;
  logInfo('Testing function response time...');

  const startTime = Date.now();

  try {
    await invokeFunction(CONFIG.testWorkerId);
    const duration = Date.now() - startTime;

    if (duration < 2000) {
      logSuccess(`Response time is acceptable: ${duration}ms`);
    } else if (duration < 5000) {
      logWarning(`Response time is slow: ${duration}ms (expected < 2000ms)`);
    } else {
      logError(`Response time is very slow: ${duration}ms`);
    }
  } catch (error) {
    logError(`Response time test failed: ${error.message}`);
  }
}

/**
 * Print test summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  log('  TEST SUMMARY', colors.cyan);
  console.log('='.repeat(60));

  log(`Total Tests: ${results.total}`, colors.blue);
  log(`Passed: ${results.passed}`, colors.green);
  log(`Failed: ${results.failed}`, colors.red);

  if (results.errors.length > 0) {
    console.log('\n' + '-'.repeat(60));
    log('Errors:', colors.red);
    results.errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
  }

  console.log('='.repeat(60));

  if (results.failed === 0) {
    log('\n🎉 All tests passed!', colors.green);
    process.exit(0);
  } else {
    log(`\n❌ ${results.failed} test(s) failed`, colors.red);
    process.exit(1);
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('\n' + '█'.repeat(60));
  log('  SUPABASE EDGE FUNCTIONS TEST SUITE', colors.cyan);
  console.log('█'.repeat(60));
  log(`  Target: ${CONFIG.supabaseUrl}`, colors.blue);
  log(`  Test Worker: ${CONFIG.testWorkerId}`, colors.blue);
  console.log('█'.repeat(60) + '\n');

  // Run all tests
  await testServiceReachable();
  await testValidWorkerId();
  await testMissingWorkerId();
  await testInvalidWorkerId();
  await testCORS();
  await testResponseTime();

  // Print summary
  printSummary();
}

// Run the tests
main().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
