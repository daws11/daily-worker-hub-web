# Storage Service Verification Guide
**Subtask:** 7-4 - Verify storage service accepts file uploads
**Date:** 2026-02-22

---

## Overview

This guide provides comprehensive steps to verify that the Supabase Storage service is correctly configured and accepting file uploads across all three buckets: **avatars**, **documents**, and **images**.

---

## Storage Configuration Summary

### Buckets Created

| Bucket | Public | Size Limit | Allowed MIME Types | Purpose |
|--------|--------|------------|-------------------|---------|
| avatars | Yes | 5MB | image/jpeg, image/png, image/webp, image/gif | User profile pictures |
| documents | No | 10MB | application/pdf, image/jpeg, image/png | KYC documents, contracts |
| images | Yes | 5MB | image/jpeg, image/png, image/webp, image/gif | Job photos, portfolio |

### Folder Structure

All buckets use user-specific folders for RLS (Row Level Security):

```
avatars/
  └── {user_id}/
      └── avatar.jpg

documents/
  └── {user_id}/
      ├── ktp.pdf
      ├── selfie.jpg
      └── ...

images/
  └── {user_id}/
      └── job-001/
          ├── photo1.jpg
          └── ...
```

---

## Prerequisites

1. **Supabase Local Running:**
   ```bash
   npx supabase@latest start
   ```

2. **Test User Account:**
   - Create a test user (or use existing seed data user)
   - Note the user ID (UUID) for folder path verification

3. **Test Files:**
   - Small image file (JPG/PNG, < 5MB) for avatars/images
   - Small PDF or image (< 10MB) for documents

---

## Verification Steps

### Step 1: Verify Storage Service is Running

**Method 1: Check Supabase Status**
```bash
supabase status
```

**Expected Output:**
```
service status:
  API URL: http://localhost:54321
  DB URL: postgresql://postgres:postgres@localhost:54322/postgres
  studio URL: http://localhost:54323
  inbucket URL: http://localhost:54324

service status on Docker:
  supabase_storage ... [running]
```

**Method 2: Check Storage API Endpoint**
```bash
curl -s http://localhost:54321/storage/v1/bucket
```

**Expected Output:** JSON array of bucket names: `["avatars", "documents", "images"]`

---

### Step 2: Verify Buckets Exist in Studio UI

1. **Open Studio UI:**
   - Navigate to http://localhost:54323
   - Sign in with your credentials

2. **Access Storage Section:**
   - Click "Storage" in the left sidebar
   - Verify three buckets are visible:
     - ✅ avatars
     - ✅ documents
     - ✅ images

3. **Verify Bucket Properties:**

   For **avatars** bucket:
   - Public: ✅ Yes
   - File size limit: 5MB
   - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

   For **documents** bucket:
   - Public: ❌ No (private)
   - File size limit: 10MB
   - Allowed MIME types: application/pdf, image/jpeg, image/png

   For **images** bucket:
   - Public: ✅ Yes
   - File size limit: 5MB
   - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

---

### Step 3: Upload Test File via Studio UI

**Test Scenario: Upload Avatar Image**

1. **In Studio UI Storage section:**
   - Click on "avatars" bucket
   - Click "Upload" button

2. **Upload a test image:**
   - Select a small image file (< 5MB)
   - **Important:** The file path MUST follow the pattern: `{user_id}/filename.jpg`
   - Example: If your user ID is `abc123-def456`, enter the folder name as `abc123-def456`
   - Upload the file as `avatar.jpg` in that folder

3. **Expected Result:**
   - File uploads successfully
   - File appears in the bucket browser
   - Public URL is generated (visible in file details)

**What If Upload Fails?**

| Error | Cause | Solution |
|-------|-------|----------|
| "Policy not found" | RLS policies not applied | Run `supabase db reset` to reapply migrations |
| "File size exceeds limit" | File too large | Use smaller file (check bucket limits) |
| "MIME type not allowed" | Wrong file type | Use allowed MIME types (JPG, PNG, etc.) |
| "Permission denied" | Not authenticated | Sign in to Studio UI with proper credentials |

---

### Step 4: Verify File is Accessible via API

**Method 1: Test with Node.js Script**

Run the automated test script:
```bash
node scripts/test-storage-service.js
```

**Method 2: Manual API Testing**

**A. First, authenticate to get a session:**
```bash
# Get your session token from Studio UI or browser DevTools
# Or sign up/login via API:
curl -X POST http://localhost:54321/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "options": {
      "data": {
        "role": "worker"
      }
    }
  }'
```

**B. List files in bucket:**
```bash
curl http://localhost:54321/storage/v1/object/list/avatars \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**C. Access a public file (avatars/images):**
```bash
# Using public URL (no auth needed for public buckets)
curl http://localhost:54321/storage/v1/object/public/avatars/{user_id}/avatar.jpg \
  --output downloaded-avatar.jpg

# Verify file downloaded
file downloaded-avatar.jpg
# Should output: downloaded-avatar.jpg: JPEG image data
```

**D. Access a private file (documents):**
```bash
# Requires auth token
curl http://localhost:54321/storage/v1/object/documents/{user_id}/ktp.pdf \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --output downloaded-document.pdf
```

---

## SQL Verification Queries

Run these queries in Studio UI SQL Editor to verify storage configuration:

### Check Buckets Exist
```sql
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
ORDER BY id;
```

**Expected Result:**
| id | name | public | file_size_limit | allowed_mime_types |
|----|------|--------|-----------------|-------------------|
| avatars | avatars | true | 5242880 | {image/jpeg,image/png,image/webp,image/gif} |
| documents | documents | false | 10485760 | {application/pdf,image/jpeg,image/png} |
| images | images | true | 5242880 | {image/jpeg,image/png,image/webp,image/gif} |

### Check RLS Policies
```sql
SELECT
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;
```

**Expected:** 12 policies total (4 for each bucket: SELECT, INSERT, UPDATE, DELETE)

### Check Helper Functions
```sql
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE 'get_user_%';
```

**Expected Result:**
| routine_name | routine_type |
|--------------|--------------|
| get_user_avatar_path | FUNCTION |
| get_user_document_path | FUNCTION |
| get_user_image_path | FUNCTION |

### Check Triggers
```sql
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%avatar%';
```

**Expected Result:**
| trigger_name | event_object_table | action_statement |
|--------------|-------------------|-----------------|
| on_avatar_upload | objects | EXECUTE FUNCTION handle_new_avatar() |

### Check Uploaded Files
```sql
SELECT
  id,
  bucket_id,
  name,
  size,
  content_type,
  created_at
FROM storage.objects
ORDER BY created_at DESC
LIMIT 10;
```

---

## Common Issues and Solutions

### Issue 1: "Bucket not found" Error

**Symptoms:**
- API returns 404 when accessing storage
- Studio UI shows no buckets

**Solution:**
```bash
# Reset database to apply storage migration
supabase db reset

# Verify migration was applied
supabase migration list
```

### Issue 2: "Permission denied" on File Upload

**Symptoms:**
- Cannot upload files via API
- Studio UI upload fails with permission error

**Solution:**
```sql
-- Verify RLS policies exist
SELECT * FROM pg_policies WHERE schemaname = 'storage';

-- If missing, reapply migration manually
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -f supabase/migrations/004_storage_buckets.sql
```

### Issue 3: Cannot Access Public Files

**Symptoms:**
- Public bucket files return 403/404
- URLs don't work

**Solution:**
```bash
# Check if storage service is running
docker ps | grep supabase_storage

# Restart storage service if needed
supabase stop && supabase start
```

### Issue 4: Avatar URL Not Auto-Updating

**Symptoms:**
- After uploading avatar, users.avatar_url is NULL
- Trigger not firing

**Solution:**
```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_avatar_upload';

-- Recreate trigger if missing
-- See migration file: supabase/migrations/004_storage_buckets.sql
-- Lines 234-257
```

---

## Testing Checklist

Use this checklist to verify storage is fully functional:

### Infrastructure ✅
- [ ] Supabase Local is running (`supabase status`)
- [ ] Storage container is healthy (`docker ps | grep storage`)
- [ ] Storage API responds (`curl /storage/v1/bucket`)

### Buckets ✅
- [ ] 3 buckets exist (avatars, documents, images)
- [ ] Bucket properties correct (public status, size limits, MIME types)
- [ ] RLS policies applied (12 policies total)
- [ ] Helper functions created (3 functions)
- [ ] Avatar trigger created

### Upload Test ✅
- [ ] Can upload to avatars bucket
- [ ] Can upload to documents bucket
- [ ] Can upload to images bucket
- [ ] Folder structure enforced ({user_id}/filename)
- [ ] File size limits enforced
- [ ] MIME type validation works

### Access Test ✅
- [ ] Public files accessible without auth
- [ ] Private files require authentication
- [ ] Users can only access their own files
- [ ] Public URLs work for avatars/images
- [ ] Direct download works

### Integration ✅
- [ ] Avatar upload updates users.avatar_url
- [ ] RLS policies prevent cross-user access
- [ ] Storage integrates with auth system

---

## Performance Considerations

### File Size Recommendations

| Use Case | Recommended Max Size | Reason |
|----------|---------------------|--------|
| Avatar | 500KB - 1MB | Fast loading, optimal UX |
| Document (KYC) | 2-3MB | Balance quality vs speed |
| Job Photos | 1-2MB | Multiple photos per job |

### CDN Configuration

For production, consider:
1. Enable Supabase CDN for public files
2. Use image optimization (imgproxy is included)
3. Implement lazy loading for images

---

## Security Best Practices

### For Private Documents (documents bucket)
- ✅ Always verify user authentication
- ✅ Use signed URLs for temporary access
- ✅ Never expose document URLs publicly
- ✅ Log all document access

### For Public Files (avatars, images)
- ✅ Validate MIME types on upload
- ✅ Sanitize filenames (prevent path traversal)
- ✅ Use virus scanning for production
- ✅ Implement rate limiting

---

## Next Steps

After verifying storage:

1. **Add Storage Utilities to Frontend:**
   ```typescript
   // lib/supabase/storage.ts
   import { supabase } from './client'

   export async function uploadAvatar(userId: string, file: File) {
     const fileExt = file.name.split('.').pop()
     const fileName = `${userId}/avatar.${fileExt}`
     const { data, error } = await supabase.storage
       .from('avatars')
       .upload(fileName, file)
     return { data, error }
   }
   ```

2. **Add Upload UI Components:**
   - Avatar upload in profile settings
   - Document upload for KYC verification
   - Job photo upload in job creation flow

3. **Implement Error Handling:**
   - Show user-friendly error messages
   - Retry failed uploads automatically
   - Display upload progress

---

## Additional Resources

- **Supabase Storage Docs:** https://supabase.com/docs/guides/storage
- **RLS Policies:** https://supabase.com/docs/guides/storage/security/access-control
- **Storage API:** https://supabase.com/docs/reference/javascript/storage-upload

---

## Appendix: Test File Generation

If you need test files:

```bash
# Create a small test image (1x1 red pixel PNG)
# Using ImageMagick:
convert -size 100x100 xc:red test-avatar.png

# Create a test PDF
echo "Test Document" | enscript -p - | ps2pdf - test-document.pdf

# Check file sizes
ls -lh test-*
```

---

**Verification Status:** ⏳ PENDING (requires Docker in main project)
**Created:** 2026-02-22
**Last Updated:** 2026-02-22
