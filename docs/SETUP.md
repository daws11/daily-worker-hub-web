# Development Setup Guide - Daily Worker Hub

## 📋 Prerequisites Checklist

Sebelum memulai development, pastikan sudah menyiapkan:

### 1. Supabase Project Setup
- [ ] Buat account di https://supabase.com
- [ ] Buat project baru (Free tier bisa untuk start)
- [ ] Catat:
  - Project URL (format: https://xxx.supabase.co)
  - Anon Public Key (dari Settings → API)
  - Service Role Key (untuk admin operations)

### 2. Android Development Environment
- [ ] Android Studio Ladybug atau versi terbaru
- [ ] JDK 17 atau 21
- [ ] Android SDK sudah terinstall
- [ ] Emulator atau device Android siap

### 3. Web Development Environment
- [ ] Node.js 20+ (cek dengan `node --version`)
- [ ] npm atau pnpm

---

## 🔧 Environment Configuration

### 1. Admin Dashboard (Next.js)

```bash
cd daily-worker-admin

# Copy environment template
cp .env.local.example .env.local

# Edit file .env.local dengan:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Android App (DWhubfix)

Di Android Studio atau secara manual:

```bash
cd DWhubfix

# Copy local properties template
cp local.properties.example local.properties

# Edit file local.properties dengan:
supabase.url=https://your-project.supabase.co
supabase.anonKey=your-anon-key-here
```

---

## 🗄️ Database Schema Setup

Setelah Supabase project siap, buat tabel-tabel berikut:

### Core Tables

#### 1. profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('worker', 'business')),
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. workers
```sql
CREATE TABLE workers (
  id UUID PRIMARY KEY REFERENCES profiles(id),
  skill_categories TEXT[],
  experience_level TEXT,
  portfolio_urls TEXT[],
  address_verified BOOLEAN DEFAULT FALSE,
  face_verified BOOLEAN DEFAULT FALSE,
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. businesses
```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY REFERENCES profiles(id),
  company_name TEXT NOT NULL,
  business_type TEXT,
  business_address TEXT,
  business_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. jobs
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  required_skills TEXT[],
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  wage_amount NUMERIC(10,2) NOT NULL,
  workers_needed INTEGER NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'filled', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. job_assignments
```sql
CREATE TABLE job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  worker_id UUID REFERENCES workers(id),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  worker_rating INTEGER,
  business_rating INTEGER,
  wage_amount NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 6. wallets
```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  balance NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 7. wallet_transactions
```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id),
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Enable Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies (example for profiles)
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```

---

## 🚀 Starting Development

### 1. Admin Dashboard

```bash
cd daily-worker-admin

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

Buka http://localhost:3000

### 2. Android App

1. Buka folder `DWhubfix` di Android Studio
2. Sync Gradle
3. Build dan run di emulator/device

---

## 📝 Next Steps

Setelah setup selesai, development priorities:

1. **Testing Authentication Flow**
   - Sign up untuk worker dan business
   - Verify email
   - Test login/logout

2. **Testing Onboarding Flow**
   - Worker: Profile setup, skill selection, KYC
   - Business: Company info upload, verification

3. **Implement Payment Gateway**
   - Midtrans integration
   - Closed-loop wallet system

4. **Implement Matching Algorithm**
   - Greedy algorithm untuk real-time
   - Hungarian untuk batch matching

---

## 🔍 Troubleshooting

### Supabase Connection Issues
- Cek URL dan Anon Key sudah benar
- Pastikan Supabase project sudah di-start
- Cek RLS policies tidak memblokir akses

### Android Build Issues
- Pastikan `local.properties` sudah terisi
- Clear cache: `Build → Clean Project`
- Sync Gradle: `File → Sync Project with Gradle Files`

### Next.js Issues
- Hapus `.next` folder dan `npm install` ulang
- Cek environment variables di `.env.local`

---

*Dokumentasi ini akan terus di-update seiring progress development.*
