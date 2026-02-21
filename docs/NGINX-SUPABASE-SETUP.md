# Supabase Dev Nginx Configuration

## Problem
VPS Supabase dev hanya mengekspos `/rest/v1/` (PostgREST), tapi tidak mengekspos endpoint lain seperti `/auth/v1/` untuk login/register.

## Solution
Deploy konfigurasi nginx yang proper untuk mengekspos semua Supabase endpoints.

## Quick Deploy (Copy-Paste)

Jalankan perintah ini di VPS:

```bash
# 1. SSH ke VPS
ssh root@supabase-dev.dailyworkerhub.com

# 2. Copy deployment script
# (Upload deploy-nginx-supabase.sh dari workspace ke VPS)

# 3. Run deployment
chmod +x deploy-nginx-supabase.sh
sudo ./deploy-nginx-supabase.sh
```

## What This Configuration Does

Mengekspos semua Supabase endpoints:

| Service | Internal Port | Public URL |
|---------|---------------|-------------|
| Auth (GOTRUE) | 9999 | `http://supabase-dev.dailyworkerhub.com/auth/v1/` |
| REST (PostgREST) | 3000 | `http://supabase-dev.dailyworkerhub.com/rest/v1/` |
| Storage | 5000 | `http://supabase-dev.dailyworkerhub.com/storage/v1/` |
| Functions | 9111 | `http://supabase-dev.dailyworkerhub.com/functions/v1/` |
| Realtime (WebSocket) | 4000 | `http://supabase-dev.dailyworkerhub.com/realtime/v1/` |
| Studio | 54323 | `http://supabase-dev.dailyworkerhub.com/studio/` |

## Features

- ✅ **Auth API** - Login/Register endpoint sekarang accessible
- ✅ **WebSocket Support** - Untuk Supabase Realtime
- ✅ **Large File Uploads** - Support upload hingga 100MB
- ✅ **Logging** - Debug logs di `/var/log/nginx/supabase-dev-*.log`
- ✅ **Timeout Handling** - 300s timeout untuk API calls

## Test Endpoints

Setelah deploy, test dengan:

```bash
# Run test script
chmod +x test-supabase-endpoints.sh
./test-supabase-endpoints.sh

# Or manual test
curl http://supabase-dev.dailyworkerhub.com/auth/v1/
curl http://supabase-dev.dailyworkerhub.com/rest/v1/
curl http://supabase-dev.dailyworkerhub.com/storage/v1/
```

## Troubleshooting

### Supabase tidak berjalan?
```bash
supabase status
supabase start
```

### Firewall memblock ports?
```bash
sudo ufw allow 80/tcp
sudo ufw status
```

### Check nginx logs?
```bash
tail -f /var/log/nginx/supabase-dev-error.log
tail -f /var/log/nginx/supabase-dev-access.log
```

### Port berbeda dari default?
Update konfigurasi nginx dengan port yang benar:
```bash
# Cek port Supabase yang sedang berjalan
supabase status
```

## Update Android App

Setelah nginx configuration berhasil deployed:

```bash
# Switch kembali ke dev config
cd daily-worker-hub/DWhubfix
./switch-supabase-env.sh local

# Rebuild APK
./gradlew assembleDebug

# Upload APK
cp app/build/outputs/apk/debug/app-debug.apk \
   /home/dev/apks/daily-worker-hub-v1.0.5-debug.apk
```

## File Location

- Konfigurasi: `nginx-supabase-dev.conf`
- Deployment script: `deploy-nginx-supabase.sh`
- Test script: `test-supabase-endpoints.sh`
