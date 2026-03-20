# Daily Worker Hub - Backup & Restore Guide

This guide explains how to backup and restore the Daily Worker Hub Supabase database.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Running Backups](#running-backups)
- [Restoring from Backup](#restoring-from-backup)
- [Automated Backups](#automated-backups)
- [Monitoring & Alerts](#monitoring--alerts)
- [Best Practices](#best-practices)

## Overview

The backup system provides:

- **Full database backups** (schema + data)
- **Schema-only backups** (structure without data)
- **Data-only backups** (INSERT statements)
- **Storage metadata backups** (bucket information)
- **Automatic retention** (delete old backups after N days)
- **Failure notifications** (webhook support)

All backups are compressed using gzip and stored with timestamps.

## Prerequisites

### Required Tools

- **PostgreSQL client tools** (`pg_dump`, `psql`)

  ```bash
  # Ubuntu/Debian
  sudo apt-get install postgresql-client

  # macOS
  brew install postgresql
  ```

- **Supabase CLI** (optional, for storage metadata)
  ```bash
  npm install -g supabase
  ```

### Database Access

1. Get your Supabase database credentials:
   - Go to Supabase Dashboard > Settings > Database
   - Note your **Project Reference** (e.g., `abcdefghijklmnop`)
   - Note or reset your **Database Password**
   - Copy the **Connection String**

2. Ensure your IP is whitelisted:
   - Go to Settings > Database > Connection Pooling
   - Enable "Allow all IPs" or add your server's IP

## Configuration

### 1. Copy Example Config

```bash
cd daily-worker-hub-clean/scripts
cp backup-config.env.example backup-config.env
```

### 2. Edit Configuration

```bash
nano backup-config.env
```

Fill in these required values:

```bash
# Your Supabase project reference
SUPABASE_PROJECT_REF=your-project-ref

# Database connection URL
SUPABASE_DB_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres
```

Optional settings:

```bash
# Backup directory (default: ./backups)
BACKUP_DIR=./backups

# Retention days (default: 7)
RETENTION_DAYS=7

# Webhook for notifications (optional)
NOTIFICATION_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK
```

### 3. Test Configuration

```bash
# Make script executable (already done)
chmod +x scripts/backup-supabase.sh

# Test connection
psql "$SUPABASE_DB_URL" -c "SELECT version();"
```

## Running Backups

### Manual Backup

**Full backup (schema + data):**

```bash
./scripts/backup-supabase.sh --full
```

**Schema-only backup:**

```bash
./scripts/backup-supabase.sh --schema-only
```

**Data-only backup:**

```bash
./scripts/backup-supabase.sh --data-only
```

### Backup Output

Backups are stored in `./backups/` with this naming convention:

```
daily-worker-hub-full-20260318_054130.sql.gz      # Full backup
daily-worker-hub-schema-20260318_054130.sql.gz    # Schema only
daily-worker-hub-data-20260318_054130.sql.gz      # Data only
daily-worker-hub-storage-20260318_054130.json     # Storage metadata
```

### Check Backup Status

```bash
# List all backups
ls -lh backups/

# Check backup logs
tail -f logs/backup.log

# Check for failures
cat logs/backup-failures.log
```

## Restoring from Backup

### ⚠️ WARNING

**Restoring will OVERWRITE existing data!** Always test on a staging environment first.

### Restore Steps

1. **Stop your application** to prevent conflicts:

   ```bash
   # Stop any services using the database
   pm2 stop all  # if using PM2
   ```

2. **Extract the backup:**

   ```bash
   cd backups
   gunzip -k daily-worker-hub-full-YYYYMMDD_HHMMSS.sql.gz
   ```

3. **Review the backup (optional):**

   ```bash
   head -n 50 daily-worker-hub-full-YYYYMMDD_HHMMSS.sql
   ```

4. **Restore the database:**

   ```bash
   # Full restore (drops existing tables and recreates)
   psql "$SUPABASE_DB_URL" < daily-worker-hub-full-YYYYMMDD_HHMMSS.sql

   # Or restore specific tables only
   psql "$SUPABASE_DB_URL" -c "DROP TABLE IF EXISTS your_table CASCADE;"
   psql "$SUPABASE_DB_URL" < daily-worker-hub-full-YYYYMMDD_HHMMSS.sql
   ```

5. **Verify restoration:**

   ```bash
   psql "$SUPABASE_DB_URL" -c "SELECT count(*) FROM users;"
   psql "$SUPABASE_DB_URL" -c "SELECT count(*) FROM jobs;"
   ```

6. **Restart your application:**
   ```bash
   pm2 start all
   ```

### Partial Restore

To restore specific tables:

1. Extract the backup:

   ```bash
   gunzip -c daily-worker-hub-data-YYYYMMDD_HHMMSS.sql.gz > temp.sql
   ```

2. Extract specific table data:

   ```bash
   # Find the table section
   grep -n "COPY.*your_table" temp.sql

   # Extract that section manually
   sed -n 'start_line,end_linep' temp.sql > your_table.sql
   ```

3. Restore:
   ```bash
   psql "$SUPABASE_DB_URL" < your_table.sql
   ```

## Automated Backups

### Using Cron (Linux/macOS)

1. **Open crontab:**

   ```bash
   crontab -e
   ```

2. **Add backup schedule:**

   **Daily full backup at 2 AM:**

   ```cron
   0 2 * * * cd /path/to/daily-worker-hub-clean && ./scripts/backup-supabase.sh --full >> logs/cron.log 2>&1
   ```

   **Twice daily (every 12 hours):**

   ```cron
   0 */12 * * * cd /path/to/daily-worker-hub-clean && ./scripts/backup-supabase.sh --full >> logs/cron.log 2>&1
   ```

   **Weekly full + daily data-only:**

   ```cron
   # Full backup every Sunday at 2 AM
   0 2 * * 0 cd /path/to/daily-worker-hub-clean && ./scripts/backup-supabase.sh --full >> logs/cron.log 2>&1

   # Data-only backup daily at 2 AM
   0 2 * * 1-6 cd /path/to/daily-worker-hub-clean && ./scripts/backup-supabase.sh --data-only >> logs/cron.log 2>&1
   ```

3. **Save and exit**

4. **Verify cron is running:**
   ```bash
   crontab -l
   tail -f logs/cron.log
   ```

### Using Systemd Timer (Linux)

1. **Create service file:**

   ```bash
   sudo nano /etc/systemd/system/dwh-backup.service
   ```

   ```ini
   [Unit]
   Description=Daily Worker Hub Backup
   After=network.target

   [Service]
   Type=oneshot
   User=your-user
   WorkingDirectory=/path/to/daily-worker-hub-clean
   ExecStart=/path/to/daily-worker-hub-clean/scripts/backup-supabase.sh --full

   [Install]
   WantedBy=multi-user.target
   ```

2. **Create timer file:**

   ```bash
   sudo nano /etc/systemd/system/dwh-backup.timer
   ```

   ```ini
   [Unit]
   Description=Daily Worker Hub Backup Timer

   [Timer]
   OnCalendar=daily
   Persistent=true

   [Install]
   WantedBy=timers.target
   ```

3. **Enable and start:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable dwh-backup.timer
   sudo systemctl start dwh-backup.timer
   ```

## Monitoring & Alerts

### Check Backup Health

```bash
# Last backup timestamp
ls -lt backups/ | head -5

# Backup size trends
du -sh backups/*

# Recent failures
grep "ERROR" logs/backup.log | tail -20
```

### Webhook Notifications

Configure webhook in `backup-config.env`:

```bash
# Slack
NOTIFICATION_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK

# Discord
NOTIFICATION_WEBHOOK=https://discord.com/api/webhooks/YOUR_WEBHOOK
```

### Monitoring Script

Create a simple monitoring script:

```bash
#!/bin/bash
# scripts/check-backup-health.sh

LAST_BACKUP=$(find backups/ -name "*.sql.gz" -type f -mtime -1 | wc -l)

if [ $LAST_BACKUP -eq 0 ]; then
    echo "⚠️  WARNING: No backups in the last 24 hours!"
    exit 1
else
    echo "✅ Backup healthy: $LAST_BACKUP backup(s) in last 24h"
    exit 0
fi
```

## Best Practices

### 1. Backup Strategy

- **Daily full backups** (minimum)
- **Multiple daily backups** for critical production systems
- **Test restores** monthly
- **Keep offsite copies** (S3, Google Cloud Storage, etc.)

### 2. Retention Policy

- **7 days** for development
- **14-30 days** for production
- **Longer retention** for compliance requirements

### 3. Security

- **Never commit** `backup-config.env` to version control
- **Use environment variables** in production
- **Encrypt backups** containing sensitive data
- **Restrict backup file permissions** (chmod 600)

### 4. Storage

- **Monitor disk space** - backups grow over time
- **Compress backups** (already using gzip)
- **Consider cloud storage** for long-term retention
- **Separate backup disk** from database disk

### 5. Testing

```bash
# Test restore to a separate database
psql "postgresql://postgres:password@localhost:5432/test_restore" < backup.sql

# Verify data integrity
psql "$SUPABASE_DB_URL" -c "SELECT count(*) FROM each_table;"
```

### 6. Disaster Recovery

1. **Document restore procedure** (this file!)
2. **Test restore process** regularly
3. **Keep backup of this backup guide** offsite
4. **Monitor backup logs** daily
5. **Have a rollback plan** if restore fails

## Troubleshooting

### Backup Fails

**Error: Connection refused**

- Check database URL format
- Verify password is correct
- Ensure IP is whitelisted

**Error: pg_dump not found**

```bash
sudo apt-get install postgresql-client
```

**Error: Permission denied**

```bash
chmod +x scripts/backup-supabase.sh
chmod 755 backups/ logs/
```

### Restore Fails

**Error: Database exists**

- The backup includes `DROP IF EXISTS` commands
- If still failing, manually drop tables first

**Error: Foreign key violations**

- Tables are ordered correctly in full backups
- For partial restores, respect table dependencies

**Error: Out of disk space**

- Check available space: `df -h`
- Clean old backups: adjust `RETENTION_DAYS`
- Compress backup before restore

### Contact

For backup-related issues:

- Check logs: `logs/backup.log`
- Review failures: `logs/backup-failures.log`
- Contact: [Your support channel]
