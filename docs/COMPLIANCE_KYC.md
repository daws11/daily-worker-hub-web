# Worker Compliance & KYC System

> Documentation for Daily Worker Hub's Know Your Customer (KYC) verification and compliance workflow

---

## Overview

Daily Worker Hub implements a tiered worker verification system with KYC (Know Your Customer) compliance. Workers must verify their identity before they can accept jobs, with requirements varying by tier level.

---

## Worker Tiers

| Tier | Badge Color | Interview Required | KYC Required | Benefits |
|------|-------------|-------------------|--------------|----------|
| **Classic** | Gray | ✅ Chat + Voice | Basic ID | Access to basic jobs |
| **Pro** | Blue | ✅ Chat only | Basic ID | Higher pay rates, priority matching |
| **Elite** | Gold | ❌ None | Full KYC + Selfie | Premium jobs, instant dispatch |
| **Champion** | Purple | ❌ None | Full KYC + References | Top-tier jobs, exclusive access |

### Tier Progression

```
New Worker → Classic → Pro → Elite → Champion
    │           │        │       │        │
    └───────────┴────────┴───────┴────────┘
         Complete more jobs + earn positive reviews
```

---

## KYC Verification Process

### Status Flow

```
pending → in_review → approved
                   ↘ rejected → resubmit → pending
```

### KYC Status Definitions

| Status | Description | Next Step |
|--------|-------------|-----------|
| `pending` | Documents submitted, awaiting review | Admin reviews documents |
| `in_review` | Admin is reviewing documents | Decision pending |
| `approved` | Verification complete | Worker can accept jobs |
| `rejected` | Documents rejected | Worker must resubmit |

### Required Documents

#### Basic KYC (All Tiers)
- **Document Type:** KTP (Indonesian ID Card) or Passport
- **Document URL:** Photo/scan of ID document
- **Validation:** Must be valid, not expired, readable

#### Enhanced KYC (Elite/Champion)
- **Selfie URL:** Selfie holding ID document
- **Validation:** Face must match ID photo
- **Additional:** May require references or work history

---

## Database Schema

### kyc_verifications Table

```sql
CREATE TABLE kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
    -- 'pending' | 'in_review' | 'approved' | 'rejected'
  document_type VARCHAR(50) NOT NULL,
  document_url TEXT NOT NULL,
  selfie_url TEXT,
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### workers.kyc_status Field

```sql
-- In workers table
kyc_status VARCHAR(20)
  -- 'pending' | 'in_review' | 'approved' | 'rejected' | NULL
```

---

## Interview System

### Interview Requirements by Tier

| Tier | Interview Type | Chat Required | Voice Required | Duration |
|------|---------------|---------------|----------------|----------|
| Classic | `chat_and_voice` | ✅ Yes | ✅ Yes | 10-30 min |
| Pro | `chat` | ✅ Yes | ❌ No | 5-15 min |
| Elite | `none` | ❌ No | ❌ No | 0 min |
| Champion | `none` | ❌ No | ❌ No | 0 min |

### Interview Flow

```
1. Business reviews applicant
2. Business accepts application
3. Interview starts (if required)
   ├── Chat phase (messages exchanged)
   └── Voice phase (if Classic tier)
4. Interview completed/skipped
5. Booking confirmed
```

### Interview Status

| Status | Description |
|--------|-------------|
| `pending` | Interview not started |
| `in_progress` | Interview ongoing |
| `completed` | Successfully finished |
| `skipped` | Not required (Elite/Champion) |
| `failed` | Interview declined/failed |

---

## Admin Review Workflow

### KYC Review Process

1. **Dashboard Access:** Admin → `/admin/kycs`
2. **Filter Options:**
   - Status (pending, in_review, approved, rejected)
   - Search by worker name/email
   - Sort by submission date
3. **Review Actions:**
   - View document image
   - View selfie (if provided)
   - Approve → Status changes to `approved`
   - Reject → Must provide rejection reason

### Rejection Reasons (Common)

- Document blurry or unreadable
- Document expired
- Face doesn't match ID
- Invalid document type
- Suspected fraud

---

## API Endpoints

### Worker Endpoints

```
POST /api/kyc/submit
  - Submit KYC documents
  - Body: { documentType, documentUrl, selfieUrl? }

GET /api/kyc/status
  - Get current KYC status
  - Returns: { status, rejectionReason?, reviewedAt? }
```

### Admin Endpoints

```
GET /api/admin/kycs
  - List all KYC submissions with pagination
  - Query: page, limit, status, search, sortBy

POST /api/admin/kycs/:id/approve
  - Approve KYC submission

POST /api/admin/kycs/:id/reject
  - Reject KYC submission
  - Body: { rejectionReason }
```

---

## Compliance Rules

### Worker Eligibility

```typescript
function canAcceptJobs(worker: Worker): boolean {
  // Must have approved KYC
  if (worker.kyc_status !== 'approved') return false

  // Must have complete profile
  if (!worker.profile_complete) return false

  // Must be active
  if (worker.status !== 'active') return false

  return true
}
```

### Tier Requirements

```typescript
const TIER_REQUIREMENTS = {
  classic: {
    minJobs: 0,
    minRating: 0,
    kycRequired: 'basic',
    interviewType: 'chat_and_voice'
  },
  pro: {
    minJobs: 10,
    minRating: 4.0,
    kycRequired: 'basic',
    interviewType: 'chat'
  },
  elite: {
    minJobs: 50,
    minRating: 4.5,
    kycRequired: 'enhanced',
    interviewType: 'none'
  },
  champion: {
    minJobs: 100,
    minRating: 4.8,
    kycRequired: 'enhanced',
    interviewType: 'none'
  }
}
```

---

## Security Considerations

### Document Storage
- Documents stored in Supabase Storage (private bucket)
- Signed URLs with expiration for secure access
- No direct public URLs

### Data Privacy
- KYC data only accessible to:
  - Worker (own data)
  - Admin (review purposes)
  - System (automated checks)
- GDPR-compliant data retention
- Automatic deletion after account closure (30 days)

### Fraud Prevention
- Selfie matching for enhanced KYC
- Document validation checks
- Admin review for suspicious submissions
- Audit trail for all KYC actions

---

## UI Components

### Worker KYC Submission
- `app/(dashboard)/worker/settings/page.tsx` - KYC upload form
- `components/worker/kyc-upload.tsx` - Document upload component

### Admin KYC Review
- `app/admin/kycs/page.tsx` - KYC management dashboard
- `components/admin/kyc-review-dialog.tsx` - Review modal

### Status Badges
- `components/worker/tier-badge.tsx` - Tier display
- Status badges: pending (yellow), in_review (blue), approved (green), rejected (red)

---

## Testing Checklist

### KYC Flow Testing
- [ ] Submit basic KYC (ID document only)
- [ ] Submit enhanced KYC (ID + selfie)
- [ ] Admin approve flow
- [ ] Admin reject flow with reason
- [ ] Worker resubmit after rejection
- [ ] Status badge updates correctly

### Tier Progression Testing
- [ ] Classic worker interview flow
- [ ] Pro worker interview flow
- [ ] Elite worker (no interview)
- [ ] Champion worker (no interview)

---

## References

- **Database Types:** `lib/supabase/types.ts`
- **Interview Types:** `lib/types/interview.ts`
- **Admin Queries:** `lib/supabase/queries/admin.ts`
- **Admin KYC Page:** `app/admin/kycs/page.tsx`

---

_Last updated: 2026-03-17_
