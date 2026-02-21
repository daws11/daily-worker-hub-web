# Supabase Database Setup Guide

## ✅ Environment Files Sudah Dikonfigurasi

### 1. Admin Dashboard (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://airhufmbwqxmojnkknan.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Android App (local.properties)
```bash
supabase.url=https://airhufmbwqxmojnkknan.supabase.co
supabase.anonKey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🚀 Import Database Schema

### Opsi 1: Manual Import (Recommended - Paling Cepat)

1. **Buka Supabase Dashboard:**
   - Pergi ke: https://supabase.com/dashboard/project/airhufmbwqxmojnkknan
   - Klik: **SQL Editor**

2. **Import Schema:**
   - Buka file: `supabase/schema.sql`
   - Copy seluruh konten SQL
   - Paste ke SQL Editor
   - Klik: **Run** (atau CMD/Ctrl+Enter)

3. **Verify Import:**
   - Cek Tables: `Database` → `Tables`
   - Seharusnya ada tabel: profiles, workers, businesses, jobs, job_assignments, wallets, wallet_transactions, audit_logs

---

### Opsi 2: Gunakan Database Connection String

Jika ingin import via PostgreSQL client:

1. **Dapatkan Database Connection String:**
   - Buka Supabase Dashboard
   - Pergi ke: Settings → Database
   - Connection string akan terlihat seperti:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.airhufmbwqxmojnkknan.supabase.co:5432/postgres
     ```

2. **Import via psql:**
   ```bash
   psql $CONNECTION_STRING -f supabase/schema.sql
   ```

---

### Opsi 3: Gunakan Supabase CLI

Jika ingin menggunakan Supabase CLI:

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Login & Link Project:**
   ```bash
   supabase login
   supabase link --project-ref airhufmbwqxmojnkknan
   ```

3. **Push Schema:**
   ```bash
   supabase db push
   ```

---

## 📋 Schema Verification Setelah Import

Setelah import berhasil, verifikasi dengan query ini di SQL Editor:

```sql
-- Cek semua tabel
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Cek RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';

-- Cek indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public';
```

---

## 🎯 Tabel yang Dibuat

| Tabel | Deskripsi |
|--------|-----------|
| `profiles` | User profiles & roles (worker, business, admin) |
| `workers` | Worker-specific data (skills, ratings, KYC) |
| `businesses` | Business-specific data |
| `jobs` | Job postings dari businesses |
| `job_assignments` | Job-worker matching |
| `wallets` | Closed-loop wallet system |
| `wallet_transactions` | Transaction history |
| `audit_logs` | System audit trail |

---

## 🔒 Security Notes

### Service Role Key
Service role key telah digunakan untuk environment configuration.
**PENTING:** JANGAN share service role key di public!
- Hanya gunakan untuk server-side operations
- Gunakan anon key untuk client-side (mobile, web)

### Row Level Security (RLS)
RLS policies sudah dikonfigurasi dalam schema:
- Users hanya bisa akses data mereka sendiri
- Admins bisa akses semua data
- Public users hanya bisa lihat data verified workers/businesses

---

## 🐛 Troubleshooting

### Schema Import Gagal

**Error: Table already exists**
- Drop tabel manual di SQL Editor:
  ```sql
  DROP TABLE IF EXISTS wallet_transactions CASCADE;
  DROP TABLE IF EXISTS wallets CASCADE;
  DROP TABLE IF EXISTS audit_logs CASCADE;
  DROP TABLE IF EXISTS job_assignments CASCADE;
  DROP TABLE IF EXISTS jobs CASCADE;
  DROP TABLE IF EXISTS businesses CASCADE;
  DROP TABLE IF EXISTS workers CASCADE;
  DROP TABLE IF EXISTS profiles CASCADE;
  ```

**Error: Permission denied**
- Pastikan login sebagai admin/owner di Supabase
- Gunakan service role key untuk full access

**Error: Connection failed**
- Cek project URL: harus diakhiri dengan `.co`
- Cek database status: Dashboard → Database

---

## 📝 Next Steps

Setelah schema berhasil di-import:

1. **Test Connection:**
   ```bash
   cd daily-worker-admin
   npm install
   npm run dev
   ```

2. **Create First User:**
   - Buka http://localhost:3000
   - Register worker/business account
   - Verify di Supabase Dashboard

3. **Implement Features:**
   - Payment Gateway (Midtrans)
   - Matching Algorithm
   - KYC Flow

---

*Dokumentasi ini akan di-update seiring progress.*
