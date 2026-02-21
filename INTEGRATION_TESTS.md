# Integration Tests & Auth Flow Documentation

## Overview

This document describes the integration testing infrastructure and authentication flow implementation for Daily Worker Hub.

## Integration Tests

### Location
`DWhubfix/app/src/test/java/com/example/dwhubfix/data/repository/integration/`

### Test Coverage

| Test Class | Tests | Status |
|------------|-------|--------|
| `AuthRepositoryIntegrationTest.kt` | 15 | ⚠️ Needs JVM Environment Fix |
| `JobRepositoryIntegrationTest.kt` | - | Pending |
| `MatchingRepositoryIntegrationTest.kt` | - | Pending |

### Auth Repository Tests (15 tests)

**Login Tests (5):**
- Valid credentials returns success with user ID
- Invalid password returns failure
- Non-existent email returns failure
- Access token saved to SharedPreferences
- User ID saved to SharedPreferences

**Registration Tests (3):**
- Register new worker creates user that can login
- Register with duplicate email returns failure
- Register new business creates user

**Logout Tests (3):**
- Clears session from Supabase
- Clears access token from SharedPreferences
- Clears user ID from SharedPreferences

**Session Persistence Tests (3):**
- Access token persists across operations
- getAccessToken returns token after login
- getUserId returns correct user ID after login

**Cross-User Tests (1):**
- Worker and business can both authenticate with different IDs

### Test Infrastructure

**Files:**
- `BaseIntegrationTest.kt` - Common setup/teardown with authentication helpers
- `TestDataManager.kt` - Configuration loading and Supabase client creation
- `TestSharedPreferencesProvider.kt` - In-memory SharedPreferences for testing
- `InMemorySessionManager.kt` - Session management for JVM tests

**Configuration:**
`DWhubfix/app/src/test/resources/test-config.properties`
```properties
supabase.test.url=https://airhufmbwqxmojnkknan.supabase.co
supabase.test.key=<anon_key>
test.user.worker.email=integration-test-worker@example.com
test.user.worker.password=TestWorker123!
test.user.business.email=integration-test-business@example.com
test.user.business.password=TestBusiness123!
```

## Current Issues

### Issue 1: JVM Testing Environment ⚠️

**Problem:** Integration tests fail when running in JVM environment due to Supabase Auth library's dependency on Android platform infrastructure (`SettingsUtil`).

**Error:**
```
java.lang.IllegalStateException at SettingsUtil.kt:11
```

**Root Cause:** Supabase Auth library for Kotlin/Android requires Android Context and Settings which are not available in JVM test environment.

**Current Status:** Tests compile but fail at runtime.

**Possible Solutions:**
1. Use Android instrumented tests instead of JVM unit tests
2. Mock Supabase Auth layer entirely
3. Use Robolectric for Android context simulation

### Issue 2: Auth Schema Triggers 🔐

**Problem:** Cannot deploy triggers to `auth.users` table due to permission restrictions.

**Error:**
```
ERROR: permission denied for schema auth (SQLSTATE 42501)
```

**Root Cause:**
- Supabase Dashboard SQL Editor uses `authenticated` role
- Auth schema triggers require `service_role` database access
- Direct database connection has network/IPv6 limitations

**Current Status:** Auth triggers NOT deployed

**Workaround:** Application must manually create profile records after user registration using `public.create_missing_profile()` function.

## Database Schema

### Tables Related to Auth

| Table | Purpose | Auto-creation |
|-------|---------|---------------|
| `profiles` | Main user profile | ❌ Manual needed |
| `worker_profiles` | Worker-specific data | ❌ Manual needed |
| `business_profiles` | Business-specific data | ❌ Manual needed |
| `wallets` | User wallet | ✅ Via trigger on profiles |

### Helper Functions Available

**`public.create_missing_profile(user_id, user_role, user_full_name)`**
- Creates profile record for existing auth user
- Returns JSONB with success status
- Can be called by authenticated users

**`public.check_profile_exists(user_id)`**
- Checks if profile exists for a user
- Returns JSONB with existence status

## Test Data Cleanup

### Cleanup Function
`cleanup_integration_test(test_id TEXT)` - Deletes all test data tagged with `test_id`

**Tables cleaned (in order):**
1. `wallet_transactions`
2. `transactions`
3. `verification_codes`
4. `business_facilities`
5. `worker_skills`
6. `bookings`
7. `shifts`
8. `job_applications`
9. `jobs`
10. `wallets`
11. `worker_profiles`
12. `business_profiles`
13. `profiles`

### Test Tracking Columns

All tables include:
- `test_id TEXT` - Test identifier for data isolation
- `is_test_data BOOLEAN` - Flag for test data

## Running Integration Tests

### Prerequisites

1. Configure test users in Supabase:
   ```sql
   -- Create test users (run in Supabase SQL Editor)
   INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
   VALUES
     ('<worker-uuid>', 'integration-test-worker@example.com', '<hashed>', NOW()),
     ('<business-uuid>', 'integration-test-business@example.com', '<hashed>', NOW());
   ```

2. Configure `test-config.properties` with actual credentials

3. For Android tests:
   ```bash
   ./gradlew connectedAndroidTest
   ```

### JVM Tests (Currently Blocked)

```bash
./gradlew testDebugUnitTest --tests "com.example.dwhubfix.data.repository.integration"
```

**Note:** These tests currently fail due to JVM environment limitations.

## Recommendations

### High Priority

1. **Fix JVM Testing Issue**
   - Implement proper mocking for Supabase Auth
   - OR switch to Android instrumented tests
   - OR configure Robolectric for Android context

2. **Implement Profile Auto-Creation in App**
   - Call `public.create_missing_profile()` after successful registration
   - Ensure this happens in a transactional manner

3. **Create Migration Scripts**
   - Add profile creation to application startup for existing users
   - Use `public.create_missing_profile()` for backfilling

### Medium Priority

4. **Set Up Auth Triggers via Alternative Method**
   - Contact Supabase support for auth schema access
   - OR use Supabase CLI with proper IPv6 configuration
   - OR implement Edge Functions for auth event handling

5. **Add More Integration Tests**
   - Job repository tests
   - Matching repository tests
   - Wallet transaction tests

## Files Structure

```
DWhubfix/app/src/test/java/com/example/dwhubfix/data/repository/integration/
├── AuthRepositoryIntegrationTest.kt      # 15 auth tests
├── BaseIntegrationTest.kt                # Base test class
├── TestDataManager.kt                    # Config & client
├── TestSharedPreferencesProvider.kt       # In-memory prefs
└── InMemorySessionManager.kt             # Session management

DWhubfix/app/src/test/resources/
└── test-config.properties                 # Test configuration
```

## Notes

- Integration tests are configured but currently blocked by JVM environment issues
- Auth triggers require special deployment method (not yet completed)
- Helper functions are available in public schema as workarounds
- Test infrastructure is well-designed and ready to use once environment issues are resolved
