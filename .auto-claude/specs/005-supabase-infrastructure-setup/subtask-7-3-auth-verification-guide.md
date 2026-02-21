# Auth Service Verification Guide
**Subtask:** 7-3 - Verify auth service is working with test registration
**Date:** 2026-02-22

## Overview

This guide provides step-by-step instructions for verifying that the Supabase authentication service is correctly integrated with the Next.js application.

## Prerequisites

1. **Supabase Local is running:**
   ```bash
   npx supabase@latest start
   # or
   ./scripts/start-supabase.sh
   ```

2. **Next.js dev server is running:**
   ```bash
   npm run dev
   ```

3. **Environment variables are configured:**
   - `.env.local` should contain:
     - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-dev-key>`
     - `SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>`

## Test Scenarios

### Test 1: User Registration (Worker Account)

**Steps:**

1. Navigate to: http://localhost:3000/register
2. Fill in the registration form:
   - **Nama Lengkap:** Test Worker
   - **Email:** test-worker@example.com
   - **Password:** Test123456!
   - **Tipe Akun:** Worker
3. Click "Daftar" button
4. Verify success toast message appears: "Registrasi berhasil! Silakan login."
5. Verify redirect to /login page

**Verification (via Supabase Studio):**

1. Open Studio UI: http://localhost:54323
2. Navigate to **Authentication** → **Users**
3. Verify user exists:
   - Email: test-worker@example.com
   - ID: (UUID)
   - Created at: (timestamp)
   - User metadata contains: `full_name: "Test Worker"`

4. Navigate to **Table Editor** → **users**
5. Verify user profile exists:
   ```sql
   SELECT id, email, full_name, role, phone, avatar_url, created_at
   FROM users
   WHERE email = 'test-worker@example.com';
   ```
   Expected:
   - id: (same as auth.users.id)
   - email: test-worker@example.com
   - full_name: Test Worker
   - role: worker
   - phone: (empty string)
   - avatar_url: (empty string)

### Test 2: User Registration (Business Account)

**Steps:**

1. Navigate to: http://localhost:3000/register
2. Fill in the registration form:
   - **Nama Lengkap:** Test Business
   - **Email:** test-business@example.com
   - **Password:** Test123456!
   - **Tipe Akun:** Business
3. Click "Daftar" button
4. Verify success toast message appears
5. Verify redirect to /login page

**Verification (via SQL):**

```sql
-- Verify auth user
SELECT id, email, raw_user_meta_data->>'full_name' as full_name
FROM auth.users
WHERE email = 'test-business@example.com';

-- Verify public user profile
SELECT id, email, full_name, role
FROM users
WHERE email = 'test-business@example.com';
```

### Test 3: Login Flow (Worker)

**Steps:**

1. Navigate to: http://localhost:3000/login
2. Fill in the login form:
   - **Email:** test-worker@example.com
   - **Password:** Test123456!
   - **Tipe Akun:** Worker
3. Click "Masuk" button
4. Verify success toast message: "Login berhasil!"
5. Verify redirect to: http://localhost:3000/dashboard-worker-jobs

**Verification (Browser DevTools):**

1. Open DevTools → Application → Local Storage
2. Verify `sb-<project-id>-auth-token` exists
3. Open DevTools → Console
4. Run: `localStorage.getItem('sb-<project-id>-auth-token')`
5. Verify token contains valid JWT

**Verification (via SQL):**

```sql
-- Check session was created
SELECT *
FROM auth.sessions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test-worker@example.com')
ORDER BY created_at DESC
LIMIT 1;
```

### Test 4: Login Flow (Business)

**Steps:**

1. Navigate to: http://localhost:3000/login
2. Fill in the login form:
   - **Email:** test-business@example.com
   - **Password:** Test123456!
   - **Tipe Akun:** Business
3. Click "Masuk" button
4. Verify success toast message
5. Verify redirect to: http://localhost:3000/dashboard-business-jobs

### Test 5: Logout Flow

**Steps:**

1. While logged in, click logout (if available) or manually navigate to root
2. Verify auth state is cleared
3. Verify local storage auth token is removed
4. Verify redirect to home page

## SQL Verification Queries

Run these queries in Supabase Studio → SQL Editor to verify data integrity:

```sql
-- ============================================
-- TEST 1: Count auth.users vs public.users
-- ============================================
SELECT
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count;

-- Should be equal after all registrations

-- ============================================
-- TEST 2: Verify user profile linkage
-- ============================================
SELECT
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name' as auth_full_name,
  pu.full_name as public_full_name,
  pu.role,
  pu.phone,
  pu.avatar_url
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC;

-- All auth users should have matching public.users records

-- ============================================
-- TEST 3: Check for orphaned records
-- ============================================
-- Auth users without public profiles
SELECT id, email
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users);

-- Public profiles without auth users (should be empty)
SELECT id, email
FROM public.users
WHERE id NOT IN (SELECT id FROM auth.users);

-- ============================================
-- TEST 4: Verify session data
-- ============================================
SELECT
  s.id,
  s.user_id,
  au.email,
  s.created_at,
  s.expires_at,
  s.user_agent
FROM auth.sessions s
JOIN auth.users au ON s.user_id = au.id
ORDER BY s.created_at DESC
LIMIT 10;

-- ============================================
-- TEST 5: Test user role lookup
-- ============================================
SELECT
  u.id,
  u.email,
  u.full_name,
  u.role,
  CASE
    WHEN u.role = 'worker' THEN (SELECT id FROM workers WHERE user_id = u.id)
    WHEN u.role = 'business' THEN (SELECT id FROM businesses WHERE user_id = u.id)
    ELSE NULL
  END as profile_id
FROM users u
ORDER BY u.created_at DESC;
```

## API Endpoint Testing

### Test Registration via API

```bash
# This simulates what the frontend does
curl -X POST http://localhost:54321/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d '{
    "email": "api-test@example.com",
    "password": "Test123456!",
    "options": {
      "data": {
        "full_name": "API Test User"
      }
    }
  }'
```

Expected response:
```json
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "...",
    "email": "api-test@example.com",
    "user_metadata": {...}
  }
}
```

### Test Login via API

```bash
curl -X POST http://localhost:54321/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d '{
    "email": "test-worker@example.com",
    "password": "Test123456!"
  }'
```

## Known Issues & Limitations

### Issue 1: No Automatic Profile Creation Trigger
**Status:** Expected behavior (manual creation in frontend)

The current implementation manually creates user profiles in the `public.users` table after Supabase Auth registration. This is handled in `app/providers/auth-provider.tsx` in the `signUp` function.

**Alternative approach:** Create a database trigger/function for automatic profile creation:
```sql
-- Example trigger (not implemented)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, phone, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'worker', -- default role
    '',
    ''
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Pros of trigger approach:**
- Automatic - no manual profile creation needed
- More reliable - can't forget to create profile
- Works for all auth sources (admin API, magic links, etc.)

**Cons of trigger approach:**
- Need a way to set role (currently from UI selection)
- More complex database logic

### Issue 2: Role Validation During Login
**Status:** Potential improvement

The login flow accepts a `role` parameter but doesn't verify the user actually has that role in the database before redirecting.

**Current flow:**
1. User logs in
2. Frontend redirects based on selected role radio button
3. Role is fetched separately via useEffect

**Recommended improvement:**
- Fetch user role from database during login
- Validate selected role matches actual role
- Show error if mismatch

### Issue 3: console.log Statements
**Status:** Code quality issue

There are several `console.error()` statements in the auth provider that should be replaced with proper error handling or removed before production:

```typescript
// Line 64: console.error('Error fetching user role:', error)
// Line 111: console.error('Error creating user profile:', profileError)
// Line 119: console.error('Sign up error:', error)
// Line 153: console.error('Sign in error:', error)
// Line 170: console.error('Sign out error:', error)
```

**Recommendation:** Replace with proper error logging service or remove.

## Verification Checklist

Before marking this subtask as complete, verify:

- [ ] Supabase Local is running (`supabase status` shows all services)
- [ ] Next.js dev server is running (accessible at http://localhost:3000)
- [ ] Registration page loads without errors
- [ ] Worker account can be registered
- [ ] Business account can be registered
- [ ] User appears in auth.users table
- [ ] User profile appears in public.users table
- [ ] Login page loads without errors
- [ ] Worker user can login
- [ ] Business user can login
- [ ] Login redirects to correct dashboard based on role
- [ ] Auth token is stored in browser local storage
- [ ] Session appears in auth.sessions table
- [ ] Logout clears auth state
- [ ] No console errors during auth flow

## Troubleshooting

### Problem: Registration succeeds but profile not created

**Check:**
1. Browser console for error messages
2. Supabase logs: `supabase logs auth`
3. Network tab for failed API calls

**Common causes:**
- RLS policy preventing INSERT to public.users
- Network timeout
- Auth provider code error

### Problem: Login redirects but dashboard shows unauthorized

**Check:**
1. User role in public.users table
2. Dashboard RLS policies
3. Auth token validity in local storage

### Problem: Email already exists error during registration

**Solution:**
Use a different email address or delete the existing user:
```sql
-- Delete from auth (will cascade to public.users)
DELETE FROM auth.users WHERE email = 'test@example.com';
```

## Next Steps

After successful verification:
1. Document any issues found
2. Create GitHub issues for improvements
3. Update implementation plan status
4. Proceed to subtask-7-4 (Storage verification)
