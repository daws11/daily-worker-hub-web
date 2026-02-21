# Security & Compliance - Daily Worker Hub Web MVP

**Project:** Daily Worker Hub - Web MVP
**Platform:** Next.js + Supabase Local (Self-Hosted)
**Version:** 1.0
**Last Updated:** February 21, 2026

---

## 🔐 Authentication & Authorization

### JWT-Based Authentication (Supabase Auth)

**Implementation:**
- Supabase Auth generates JWT tokens with user role claims
- Access tokens: Short-lived (1 hour)
- Refresh tokens: Long-lived (30 days)
- Secure token storage in HTTP-only cookies

**Token Lifecycle:**
```
Login → Generate JWT → Store in HTTP-only Cookie → Auto-renew via Refresh Token → Logout
```

**Security Features:**
- ✅ Secure cookie flags: `httpOnly`, `secure`, `sameSite=strict`
- ✅ Token rotation on refresh
- ✅ Revoked tokens blacklist (for immediate logout)
- ✅ IP-based token validation (optional)

### Role-Based Access Control (RBAC)

**User Roles:**
| Role | Permissions |
|------|-------------|
| **worker** | View jobs, apply for jobs, manage profile, view wallet, withdraw earnings |
| **business** | Post jobs, manage bookings, manage workers, view analytics, manage wallet |
| **admin** | Full access, user management, system settings, audit logs, dispute resolution |
| **super_admin** | Full access + infrastructure management (founders only) |

**RBAC Implementation:**
```typescript
// Middleware for role-based access
export function requireRole(roles: string[]) {
  return async (req: NextRequest) => {
    const user = await getUser(req)
    if (!user || !roles.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    return NextResponse.next()
  }
}

// Example usage: Protect admin routes
export const config = {
  middleware: requireRole(['admin', 'super_admin'])
}
```

### Two-Factor Authentication (2FA) for Admins

**Implementation:**
- TOTP (Time-based One-Time Password) via Google Authenticator
- Backup codes (10 codes, stored securely encrypted)
- SMS fallback (via Twilio) for emergency recovery

**2FA Flow:**
```
Login → Enter Username/Password → Verify 2FA (if admin) → Access Granted
```

### Session Management

**Features:**
- Auto-renew session via refresh tokens
- Secure token storage (HTTP-only cookies)
- Session timeout (30 minutes of inactivity)
- Multiple device management (view/revoke sessions)

**Session Storage Options:**
1. **Production:** HTTP-only cookies (most secure)
2. **Development:** LocalStorage (for testing)

### OAuth Integration

**Providers:**
- Google OAuth (primary)
- Facebook OAuth (secondary, optional)

**OAuth Flow:**
```
User clicks "Login with Google" → Redirect to Google Auth → User grants permission → Redirect back → JWT token generated
```

**Security Measures:**
- Validate OAuth state parameter (prevent CSRF)
- Use PKCE (Proof Key for Code Exchange) for mobile
- Limit OAuth scopes to minimum required

---

## 🛡️ Data Protection

### Encryption at Rest (Supabase PostgreSQL)

**Implementation:**
- AES-256 encryption for PostgreSQL data files
- Automatic encryption by Supabase (managed)
- No manual key management required

**Encrypted Data:**
- Passwords (bcrypt hashed)
- KTP numbers (encrypted)
- Phone numbers (masked in logs)
- Payment information (never stored, tokenized via payment gateway)

### Encryption in Transit (HTTPS/TLS)

**Implementation:**
- TLS 1.3 for all HTTPS connections
- Let's Encrypt SSL certificates (auto-renewed)
- HSTS (HTTP Strict Transport Security) header
- Secure cipher suites only

**Nginx Configuration:**
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
```

### Secure Password Hashing

**Algorithm:** bcrypt (industry standard)

**Implementation:**
```typescript
import bcrypt from 'bcryptjs'

const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12) // 12 rounds
}

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash)
}
```

**Why bcrypt?**
- Adaptive work factor (12 rounds = ~250ms per hash)
- Built-in salt (no separate salt storage)
- GPU-resistant (unlike SHA-256)

### Sensitive Data Masking in Logs

**Implementation:**
```typescript
// Mask sensitive data in logs
const maskEmail = (email: string) => email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
const maskPhone = (phone: string) => phone.replace(/(.{3})(.*)(.{4})/, '$1****$3')
const maskKTP = (ktp: string) => ktp.replace(/(.{6})(.*)(.{4})/, '$1******$3')

// Example: Input: david@example.com → Output: da***@example.com
```

**Masking Rules:**
- Email: Show first 2 chars + domain
- Phone: Show first 3 + last 4 digits
- KTP: Show first 6 + last 4 digits
- Payment tokens: Never log

### Regular Security Audits

**Audit Schedule:**
- Weekly: Automated security scans (OWASP ZAP)
- Monthly: Manual security review (founders + external auditor)
- Quarterly: Penetration testing (external security firm)
- Annually: Full security audit + compliance check

**Audit Checklist:**
- [ ] SSL certificates valid
- [ ] Dependencies up to date (no CVEs)
- [ ] Authentication flow tested
- [ ] Authorization tested (all roles)
- [ ] SQL injection tested
- [ ] XSS tested
- [ ] CSRF tested
- [ ] Payment security tested
- [ ] Data retention verified
- [ ] Backup integrity verified

---

## 🔒 API Security

### Rate Limiting (Prevent Abuse)

**Implementation:**
- Nginx rate limiting (infrastructure level)
- Next.js middleware rate limiting (application level)

**Rate Limits:**
| Endpoint | Limit | Window |
|----------|-------|--------|
| Authentication | 10 requests | 1 minute |
| Job Posting | 5 requests | 1 minute |
| Job Application | 20 requests | 1 minute |
| API (general) | 100 requests | 1 minute |
| Public endpoints | 1000 requests | 1 minute |

**Nginx Configuration:**
```nginx
# Rate limiting for API
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

# Apply rate limiting
limit_req zone=api burst=20 nodelay;
limit_req zone=auth burst=5 nodelay;
```

### CORS Configuration (Restrict Domains)

**Allowed Origins:**
- Production: `https://dailyworkerhub.com`
- Development: `http://localhost:3000`
- Testing: `https://test.dailyworkerhub.com`

**Next.js CORS Configuration:**
```typescript
// next.config.mjs
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGINS },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ]
  },
}
```

### Input Validation & Sanitization

**Validation Library:** Zod (schema validation)

**Example: Job Posting Validation**
```typescript
import { z } from 'zod'

export const jobPostingSchema = z.object({
  title: z.string().min(10).max(100),
  position_type: z.enum(['housekeeping', 'steward', 'cook', 'kitchen_helper', 'server', 'bartender', 'driver', 'other']),
  description: z.string().min(50).max(2000),
  date: z.coerce.date(),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  wage_rate: z.number().min(0),
  workers_needed: z.number().int().min(1).max(50),
  requirements: z.array(z.string()).max(10),
})

// Usage: Validate input before processing
const validated = jobPostingSchema.parse(input)
```

**Sanitization:**
- Strip HTML tags (XSS prevention)
- Trim whitespace
- Escape special characters
- Validate URLs (prevent XSS via href)

### SQL Injection Prevention (Parameterized Queries)

**Implementation:**
- Supabase PostgREST automatically parameterizes queries
- Never use raw SQL concatenation

**Safe Query Example:**
```typescript
// ✅ SAFE: Parameterized query
const { data } = await supabase
  .from('jobs')
  .select('*')
  .eq('id', jobId)
  .single()

// ❌ UNSAFE: Raw SQL concatenation (never do this!)
const query = `SELECT * FROM jobs WHERE id = '${jobId}'`
```

### XSS Protection

**Prevention Measures:**
1. **Input Sanitization:** Strip HTML tags from user input
2. **Output Escaping:** React automatically escapes JSX
3. **CSP Headers:** Content Security Policy headers
4. **XSS Protection Header:** `X-XSS-Protection: 1; mode=block`

**CSP Header Configuration:**
```typescript
// next.config.mjs
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  block-all-mixed-content;
  upgrade-insecure-requests;
`
```

---

## 💳 Payment Security

### PCI DSS Compliance (via Midtrans/Xendit)

**Compliance Level:** Level 1 (highest)

**Implementation:**
- Never store credit card data (PCI DSS requirement)
- Use payment gateway's tokenization (Midtrans/Xendit)
- PCI DSS audit passed by payment gateway

**Payment Flow:**
```
User enters payment info → Tokenized by Midtrans/Xendit → Token stored securely → Payment processed via token
```

### Secure Card Tokenization

**Implementation:**
- Payment gateway (Midtrans/Xendit) handles tokenization
- Tokens stored in database (encrypted)
- Tokens never exposed in logs or error messages

**Token Storage:**
```typescript
// Store payment token (encrypted)
await supabase.from('transactions').insert({
  payment_method: 'card',
  external_id: paymentToken, // Token from Midtrans/Xendit
  metadata: {
    last_4_digits: '****',
    card_type: 'visa',
    expiry_month: '**',
    expiry_year: '**',
  },
})
```

### Fraud Detection (Transaction Monitoring)

**Fraud Indicators:**
- Multiple failed payment attempts
- Suspicious IP addresses (blacklisted)
- Unusual transaction patterns
- Velocity checks (too many transactions too fast)

**Fraud Detection Logic:**
```typescript
const detectFraud = async (transaction: Transaction): Promise<boolean> => {
  // Check 1: Multiple failed attempts (same user, last 5 minutes)
  const recentFailed = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', transaction.user_id)
    .eq('status', 'failed')
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())

  if (recentFailed.length > 3) return true

  // Check 2: Suspicious IP (blacklisted)
  const isBlacklisted = await checkBlacklistedIP(transaction.ip_address)
  if (isBlacklisted) return true

  // Check 3: Unusual amount (too high for user)
  const averageAmount = await getUserAverageAmount(transaction.user_id)
  if (transaction.amount > averageAmount * 10) return true

  return false
}
```

### Reconciliation & Audit Trails

**Daily Reconciliation:**
- Match transactions with payment gateway
- Identify discrepancies (failed payments, double charges)
- Generate daily reconciliation report

**Audit Trail:**
```sql
-- Every payment transaction logged
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'payment', 'payout', 'fee', 'community_fund')),
  amount INTEGER NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  external_id TEXT, -- Payment gateway transaction ID
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for reconciliation
CREATE INDEX idx_transactions_external_id ON transactions(external_id);
CREATE INDEX idx_transactions_status_created ON transactions(status, created_at DESC);
```

---

## 📋 Compliance

### Indonesian Labor Law (PKHL - PP 35/2021)

#### 21 Days Rule Enforcement

**Requirement:** Maximum 21 consecutive days for same worker-business pair

**Implementation:**
- Automatic tracking of days worked per pair
- Warning at day 15-18 (inform business)
- Blocking at day 21 (prevent non-compliant job)

**Compliance Guard Logic:**
```typescript
const checkCompliance = async (business_id: string, worker_id: string): Promise<ComplianceStatus> => {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  // Get compliance record for this month
  const { data: record } = await supabase
    .from('compliance_records')
    .select('*')
    .eq('business_id', business_id)
    .eq('worker_id', worker_id)
    .eq('month', month)
    .eq('year', year)
    .single()

  if (!record) {
    // Create new record
    await supabase.from('compliance_records').insert({
      business_id,
      worker_id,
      month,
      year,
      days_worked: 1
    })
    return { compliant: true, days_worked: 1 }
  }

  // Check if already blocked
  if (record.blocked) {
    return { compliant: false, reason: 'BLOCKED', days_worked: record.days_worked }
  }

  // Increment days worked
  const newDaysWorked = record.days_worked + 1

  if (newDaysWorked >= 21) {
    // Block this pairing
    await supabase.from('compliance_records').update({ blocked: true }).eq('id', record.id)
    return { compliant: false, reason: '21_DAYS_LIMIT', days_worked: newDaysWorked }
  } else if (newDaysWorked >= 15 && newDaysWorked < 21 && !record.warning_sent) {
    // Send warning at day 15
    await supabase.from('compliance_records').update({ warning_sent: true }).eq('id', record.id)
    // Send notification to business
    await sendNotification(business_id, {
      type: 'compliance_warning',
      title: 'Peringatan: Batas 21 Hari',
      body: `Anda sudah bekerja dengan pekerja ini selama ${newDaysWorked} hari. Sisa ${21 - newDaysWorked} hari sebelum diblokir.`,
    })
    return { compliant: true, warning: true, days_worked: newDaysWorked }
  }

  // Normal increment
  await supabase.from('compliance_records').update({ days_worked: newDaysWorked }).eq('id', record.id)
  return { compliant: true, days_worked: newDaysWorked }
}
```

**Compliance Status Badges:**
- ✅ **Compliant** (0-14 days worked this month)
- ⚠️ **Warning** (15-20 days worked this month)
- 🚫 **Non-Compliant** (21+ days worked this month, blocked)

#### Compliance Audit Logs

**Audit Trail:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for compliance audits
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

**Compliance Audit Query:**
```sql
-- Get all compliance-related actions
SELECT * FROM audit_logs
WHERE entity_type IN ('compliance_records', 'jobs', 'bookings')
  AND user_id = :user_id
ORDER BY created_at DESC
LIMIT 100;
```

### Minimum Wage Compliance (UMK Bali 2025)

#### Rate Bali System (Auto-Calculate Based on UMK)

**UMK 2025 Data:**

| Region | Monthly Wage | Daily Wage (22 days) | Hourly Wage (8 hours) |
|--------|--------------|---------------------|----------------------|
| Badung | Rp 3,534,339 | Rp 160,652 | Rp 20,081 |
| Denpasar | Rp 3,298,117 | Rp 149,914 | Rp 18,739 |
| Gianyar | Rp 3,119,080 | Rp 141,776 | Rp 17,722 |
| Tabanan | Rp 3,055,909 | Rp 138,905 | Rp 17,363 |
| Other | Rp 3,000,000 | Rp 136,364 | Rp 17,045 |

**Wage Calculation Logic:**
```typescript
const UMK_BALI_2025 = {
  badung: { monthly: 3534339, daily: 160652, hourly: 20081 },
  denpasar: { monthly: 3298117, daily: 149914, hourly: 18739 },
  gianyar: { monthly: 3119080, daily: 141776, hourly: 17722 },
  tabanan: { monthly: 3055909, daily: 138905, hourly: 17363 },
  other: { monthly: 3000000, daily: 136364, hourly: 17045 },
}

const calculateMinimumWage = (area: string, hours: number): number => {
  const umk = UMK_BALI_2025[area] || UMK_BALI_2025.other
  return Math.ceil(umk.hourly * hours)
}

// Example: 8 hours in Badung = Rp 160,652 minimum wage
const minWage = calculateMinimumWage('badung', 8) // 160652
```

#### Wage Validation (Ensure Jobs Meet Minimum)

**Validation Logic:**
```typescript
const validateJobWage = (job: Job): ValidationResult => {
  const umk = UMK_BALI_2025[job.area] || UMK_BALI_2025.other
  const hours = calculateJobHours(job.start_time, job.end_time)
  const minWage = umk.hourly * hours

  if (job.wage_rate < minWage) {
    return {
      valid: false,
      error: `Wage rate is below UMK minimum. Minimum for ${job.area}: Rp ${minWage.toLocaleString('id-ID')}`,
      minimum_wage: minWage,
      current_wage: job.wage_rate,
    }
  }

  return { valid: true }
}
```

#### Regional Wage Enforcement

**Implementation:**
- Business must select region when posting job
- System auto-calculates minimum wage based on region
- Warning if wage is below minimum
- Cannot post job if wage is significantly below minimum (>20%)

### Data Privacy (GDPR-Inspired)

#### User Consent Management

**Consent Types:**
- Marketing emails (optional)
- SMS notifications (optional)
- Push notifications (optional)
- Data sharing with partners (optional, explicit consent)

**Consent Management UI:**
```typescript
// User consent preferences
interface UserConsent {
  email_marketing: boolean
  sms_notifications: boolean
  push_notifications: boolean
  data_sharing: boolean
  consent_updated_at: Date
}
```

#### Data Portability (Export Data)

**Implementation:**
```typescript
export const exportUserData = async (userId: string): Promise<UserDataExport> => {
  // Get all user data
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()
  const { data: bookings } = await supabase.from('bookings').select('*').eq('worker_id', userId)
  const { data: transactions } = await supabase.from('transactions').select('*').eq('wallet_id', walletId)
  const { data: reviews } = await supabase.from('reviews').select('*').eq('worker_id', userId)

  // Package as JSON (GDPR-compliant)
  return {
    profile,
    bookings,
    transactions,
    reviews,
    export_date: new Date().toISOString(),
  }
}
```

#### Right to be Forgotten (Account Deletion)

**Implementation:**
- User requests account deletion
- System anonymizes user data (keeps for compliance, but removes PII)
- Account status set to `deleted`
- All personal data removed within 30 days

**Anonymization Logic:**
```typescript
const deleteUserAccount = async (userId: string): Promise<void> => {
  // 1. Soft delete profile
  await supabase.from('profiles').update({
    email: null,
    full_name: null,
    phone: null,
    is_active: false,
    deleted_at: new Date(),
  }).eq('id', userId)

  // 2. Anonymize worker profile (keep KTP number for compliance, but remove personal data)
  await supabase.from('worker_profiles').update({
    ktp_number: 'DELETED',
    ktp_image_url: null,
    selfie_image_url: null,
    bio: null,
  }).eq('id', userId)

  // 3. Delete all notifications
  await supabase.from('notifications').delete().eq('user_id', userId)

  // 4. Keep audit logs (for compliance) but anonymize user_id
  await supabase.from('audit_logs').update({ user_id: null }).eq('user_id', userId)
}
```

#### Privacy Policy Documentation

**Required Sections:**
1. **Data Collection:** What data we collect and why
2. **Data Usage:** How we use the data
3. **Data Sharing:** Who we share data with (payment gateways, etc.)
4. **User Rights:** Your rights (access, correct, delete)
5. **Cookies:** What cookies we use and why
6. **Security:** How we protect your data
7. **Compliance:** Indonesian PDPA compliance

#### Data Retention Policies

**Retention Periods:**
| Data Type | Retention Period | Deletion Method |
|-----------|-----------------|-----------------|
| User profiles | Until account deletion (or 2 years inactive) | Soft delete → Anonymize → Delete |
| Bookings | 7 years (tax compliance) | Archive → Delete after 7 years |
| Transactions | 7 years (tax compliance) | Archive → Delete after 7 years |
| Reviews | 3 years | Anonymize → Delete |
| Audit logs | 1 year | Automatic deletion after 1 year |
| Notifications | 30 days | Automatic deletion after 30 days |
| Feedback | 1 year (resolved) or 5 years (compliance) | Anonymize → Delete |

---

**Document Owner:** Sasha (AI Co-founder)
**Last Review:** February 21, 2026
**Next Review:** Quarterly (every 3 months)
