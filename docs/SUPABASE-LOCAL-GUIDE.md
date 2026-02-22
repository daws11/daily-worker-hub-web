# Supabase Local Development Guide

## ✅ Panduan Lengkap Pengembangan Lokal dengan Supabase

Panduan ini untuk setup dan penggunaan Supabase Local (Self-Hosted) menggunakan Docker dan Supabase CLI untuk pengembangan aplikasi Daily Worker Hub.

---

## 📋 Prerequisites

Sebelum memulai, pastikan sistem Anda memiliki:

### Software Wajib

| Software | Versi Minimum | Cara Install |
|----------|---------------|--------------|
| **Docker** | 20.10+ | `curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh` |
| **Docker Compose** | 2.0+ | Biasanya bundled dengan Docker |
| **Node.js** | 20+ | `nvm install 20` |
| **Supabase CLI** | Latest | `npm install -g supabase` |

### Verify Prerequisites

```bash
# Cek Docker
docker --version
docker ps

# Cek Node.js
node --version
npm --version

# Cek Supabase CLI
supabase --version
```

---

## 🚀 Quick Start

### Opsi 1: Gunakan Helper Script (Recommended)

```bash
# Jalankan script helper
./scripts/start-supabase.sh
```

Script ini akan:
- Mengecek ketersediaan Docker
- Verifikasi Supabase CLI
- Validasi konfigurasi
- Menjalankan semua service Supabase
- Menampilkan URL service yang aktif

### Opsi 2: Manual Start

```bash
# Start Supabase Local
supabase start

# Output akan menampilkan:
# - Studio URL: http://localhost:54323
# - API URL: http://localhost:54321
# - DB URL: postgresql://postgres:postgres@localhost:54322/postgres
```

---

## 🔧 Konfigurasi Lokal

### 1. Environment Variables (.env.local)

File `.env.local` sudah dikonfigurasi untuk development lokal:

```bash
# Supabase Local Configuration
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Service Role Key (Server-side only!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

### 2. Supabase Config (config.toml)

File konfigurasi ada di `supabase/config.toml`:

| Service | Port | URL |
|---------|------|-----|
| **API** | 54321 | http://127.0.0.1:54321 |
| **Database** | 54322 | postgresql://postgres:postgres@localhost:54322/postgres |
| **Studio** | 54323 | http://localhost:54323 |
| **Inbucket** (Email) | 54324 | http://localhost:54324 |
| **Analytics** | 54327 | http://localhost:54327 |

---

## 📦 Database Migrations

### Apply Migrations

```bash
# Reset database dan apply semua migrations
supabase db reset

# Atau apply migration tertentu
supabase db push
```

### Migrations yang Sudah Dibuat

| File | Deskripsi |
|------|-----------|
| `001_initial_schema.sql` | Tabel core: users, workers, businesses, jobs, bookings, dll |
| `002_rls_policies.sql` | Row Level Security policies untuk semua tabel |
| `003_seed_data.sql` | Data test untuk development |
| `004_storage_buckets.sql` | Storage buckets: avatars, documents, images |

### Verifikasi Migrations

```bash
# Cek status migrations
supabase migration list

# Atau lewat Studio UI
# Buka http://localhost:54323 → Database → Migrations
```

---

## 🎯 Service URLs dan Usage

### 1. Supabase Studio (Database UI)

**URL:** http://localhost:54323

**Features:**
- **Table Editor:** View/edit data di semua tabel
- **SQL Editor:** Jalankan query SQL manual
- **Database:** Cek database info, migrations, triggers
- **Storage:** Manage file storage buckets
- **API Docs:** Dokumentasi API otomatis

### 2. Supabase API

**URL:** http://127.0.0.1:54321

**Usage di Next.js:**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Query example
const { data, error } = await supabase
  .from('workers')
  .select('*, users(*)')
```

### 3. PostgreSQL Direct Connection

**Connection String:**
```
postgresql://postgres:postgres@localhost:54322/postgres
```

**Connect via psql:**
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres
```

**Usage di Prisma (opsional):**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

### 4. Inbucket (Email Testing)

**URL:** http://localhost:54324

**Features:**
- Lihat semua email yang "terkirim" selama development
- Tidak ada email yang benar-benar dikirim (hanya simulasi)
- Berguna untuk testing auth, notifications, dll

### 5. Edge Functions

**Deploy function:**
```bash
# Deploy semua functions
supabase functions deploy

# Deploy specific function
supabase functions deploy reliability-score
```

**Invoke function:**
```bash
# Via curl
curl -X POST http://localhost:54321/functions/v1/reliability-score \
  -H "Authorization: Bearer $(supabase status | grep anon_key | awk '{print $3}')" \
  -H "Content-Type: application/json" \
  -d '{"worker_id": "uuid-here"}'

# Via Supabase client
const { data, error } = await supabase.functions.invoke('reliability-score', {
  body: { worker_id: 'uuid-here' }
})
```

---

## 💾 Storage Service

### Buckets yang Tersedia

| Bucket | Public | Max Size | MIME Types |
|--------|--------|----------|------------|
| `avatars` | Yes | 5MB | image/jpeg, image/png, image/webp, image/gif |
| `documents` | No | 10MB | application/pdf, image/jpeg, image/png |
| `images` | Yes | 5MB | image/jpeg, image/png, image/webp, image/gif |

### Upload File (via Client)

```typescript
// Upload avatar
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/${fileName}`, file)

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/${fileName}`)
```

### Upload File (via Studio)

1. Buka http://localhost:54323
2. Klik **Storage**
3. Pilih bucket (avatars/documents/images)
4. Klik **Upload** → Pilih file

---

## 🧪 Testing dengan Seed Data

Seed data menyediakan data test untuk development:

### Data yang Tersedia

| Entity | Jumlah | Deskripsi |
|--------|--------|-----------|
| **Users** | 15 | 5 business users + 10 worker users |
| **Businesses** | 5 | Complete business profiles |
| **Workers** | 10 | Complete worker profiles |
| **Jobs** | 10 | Various categories dan statuses |
| **Skills** | 15 | Technical skills untuk workers |
| **Categories** | 10 | Job categories (Construction, Cleaning, dll) |
| **Bookings** | 8 | Various statuses |
| **Transactions** | 2 | Payment transactions |
| **Messages** | 7 | User communications |
| **Reviews** | 2 | Worker reviews |
| **Notifications** | 6 | User notifications |
| **Reports** | 3 | Various report types |

### Reset ke Seed Data

```bash
# Reset dan seed data otomatis diload
supabase db reset
```

---

## 🔒 Security Best Practices

### 1. JANGAN Commit Service Role Key

Service role key punya akses penuh ke database. Pastikan `.env.local` ada di `.gitignore`:

```gitignore
# .gitignore
.env.local
.env*.local
```

### 2. Gunakan Anon Key untuk Client-side

```typescript
// ✅ CORRECT - Client-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // Anon key
)

// ❌ WRONG - JANGAN gunakan service role key di client!
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // DANGER!
)
```

### 3. RLS Policies Selalu Aktif

RLS policies di `002_rls_policies.sql` memastikan:
- Users hanya bisa akses data mereka sendiri
- Admins bisa akses semua data
- Public users hanya bisa lihat data verified workers/businesses

**JANGAN disable RLS di production!**

---

## 🐛 Troubleshooting

### Docker Issues

**Error: Docker daemon not running**
```bash
# Start Docker
sudo systemctl start docker
# Atau di Docker Desktop (Mac/Windows)
# Buka aplikasi Docker Desktop
```

**Error: Port already in use**
```bash
# Cek apa yang menggunakan port
lsof -i :54322
# Atau stop Supabase dan restart
supabase stop
supabase start
```

### Migration Issues

**Error: Migration failed**
```bash
# Cek log
supabase db reset --debug

# Atau manual apply via psql
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/migrations/001_initial_schema.sql
```

**Error: Permission denied**
```bash
# Pastikan Anda punya akses ke Docker
sudo usermod -aG docker $USER
# Logout dan login kembali
```

### Auth Issues

**Error: Invalid JWT**
- Pastikan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `.env.local` benar
- Cek Supabase status: `supabase status`
- Copy anon key dari output `supabase status`

### Storage Issues

**Error: Bucket not found**
- Pastikan migration `004_storage_buckets.sql` sudah di-apply
- Cek via Studio: http://localhost:54323 → Storage

**Error: Upload failed**
- Cek file size (max limit tergantung bucket)
- Cek MIME type (harus sesuai dengan bucket config)
- Cek RLS policies untuk storage

---

## 📝 Useful Commands

### Supabase Lifecycle

```bash
# Start Supabase
supabase start

# Stop Supabase
supabase stop

# Check status
supabase status

# Reset database
supabase db reset

# Stop dan hapus semua data (nuclear option)
supabase db reset --db-url "postgresql://postgres:postgres@localhost:54322/postgres"
```

### Database Operations

```bash
# Generate types dari database
supabase gen types typescript --local > lib/supabase/database.types.ts

# Open psql shell
supabase db shell

# Link ke remote Supabase project
supabase link --project-ref your-project-ref
```

### Edge Functions

```bash
# List semua functions
supabase functions list

# Deploy function
supabase functions deploy <function-name>

# Serve function locally (dengan hot reload)
supabase functions serve <function-name>

# Invoke function
curl -X POST http://localhost:54321/functions/v1/<function-name> \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

### Logs dan Debugging

```bash
# Cek logs semua services
supabase logs

# Stream logs real-time
supabase logs -f

# Cek logs untuk service tertentu
docker logs -f $(docker ps -q --filter "name=supabase_db")
docker logs -f $(docker ps -q --filter "name=supabase_api")
```

---

## 🚀 Next Steps

Setelah Supabase Local berjalan:

1. **Buka Studio UI:** http://localhost:54323
2. **Cek Tabel:** Verify semua tabel ada di Table Editor
3. **Test Auth:** Create test user via registration form
4. **Test Storage:** Upload file via Studio atau API
5. **Test Edge Functions:** Invoke reliability-score function
6. **Start Next.js Dev Server:**
   ```bash
   npm run dev
   # Buka http://localhost:3000
   ```

---

## 📚 Additional Resources

- **Supabase Docs:** https://supabase.com/docs
- **Supabase CLI Reference:** https://supabase.com/docs/guides/cli
- **Docker Docs:** https://docs.docker.com
- **PostgreSQL Docs:** https://www.postgresql.org/docs

---

*Last Updated: February 22, 2026*
*Dokumentasi ini akan di-update seiring progress development.*
