# Messages System Database Migration - Summary

## ✅ Completed

### 1. Migration File Created
- **Location:** `supabase/migrations/20260304125500_messages_system.sql`
- **Status:** Ready to apply

### 2. Schema Design

#### Conversations Table (NEW)
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  participant_1_id UUID REFERENCES users(id),
  participant_2_id UUID REFERENCES users(id),
  participant_1_type TEXT CHECK IN ('worker', 'business'),
  participant_2_type TEXT CHECK IN ('worker', 'business'),
  booking_id UUID REFERENCES bookings(id),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count_participant_1 INTEGER,
  unread_count_participant_2 INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

#### Messages Table (ENHANCED)
Added new columns to existing table:
- `conversation_id` - Links messages to conversations
- `message_type` - 'text', 'image', or 'file'
- `media_url` - URL for attachments
- `read_at` - Timestamp when read

### 3. Features Implemented

#### Indexes
- `idx_conversations_participants` - Fast conversation lookup
- `idx_conversations_booking` - Filter by booking
- `idx_conversations_last_message` - Sort by recent activity
- `idx_messages_conversation` - Paginated message loading
- `idx_messages_sender/receiver` - User-specific queries

#### Triggers & Functions
- Auto-update conversation's `last_message_at` and `last_message_preview`
- Auto-increment unread counts for receivers
- Auto-update `updated_at` timestamps

#### Row Level Security (RLS)
**Conversations:**
- Users can only view/create/update conversations where they are participants

**Messages:**
- Users can only view messages they sent or received
- Users can only send messages as themselves
- Users can only update (mark as read) messages they received

#### Realtime
- Both `messages` and `conversations` tables added to Supabase Realtime
- Enables live updates for chat functionality

### 4. Constraints & Validation
- Participant order constraint prevents duplicate conversations
- Message type validation (text/image/file)
- Proper foreign key relationships with appropriate ON DELETE actions

## ⚠️ Issue Found

### Local Database Error
The local Supabase database failed to start due to an existing error in:
- **File:** `supabase/migrations/20260301000002_seed_test_data.sql`
- **Error:** `INSERT has more target columns than expressions`
- **Line:** Worker user seed data insertion

**Error details:**
```
ERROR: INSERT has more target columns than expressions at character 288
```

The seed data migration has a syntax error where the INSERT statement specifies 7 columns but only provides 6 values.

## 📋 Next Steps

### Option 1: Fix Seed Data & Apply Migration
```bash
# 1. Fix the seed data file (remove one column or add missing value)
# 2. Reset local database
cd daily-worker-hub-clean
supabase db reset --local

# 3. Verify tables were created
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('conversations', 'messages');"

# 4. Check migration was applied
supabase migration list
```

### Option 2: Apply to Remote Database
```bash
# 1. Link to remote project
supabase link --project-ref <your-project-ref>

# 2. Push migration
supabase db push

# 3. Verify in Supabase Dashboard
# - Check Table Editor for conversations table
# - Check messages table has new columns
# - Verify RLS policies in Authentication > Policies
# - Check Realtime is enabled in Database > Replication
```

### Option 3: Manual SQL Execution
If CLI issues persist, run the migration SQL directly:
```bash
# Using psql
psql $DATABASE_URL < supabase/migrations/20260304125500_messages_system.sql

# Or via Supabase Dashboard
# SQL Editor → Paste migration content → Run
```

## 🔍 Verification Checklist

After applying migration, verify:

- [ ] `conversations` table exists with all columns
- [ ] `messages` table has new columns (conversation_id, message_type, media_url, read_at)
- [ ] Indexes created (check with `\di` in psql)
- [ ] RLS enabled on both tables
- [ ] RLS policies created (check Authentication > Policies in dashboard)
- [ ] Realtime enabled for both tables (Database > Replication)
- [ ] Triggers created (check with `\df` and `\tg` in psql)

## 📊 Database Schema Overview

```
users (existing)
  ↓
conversations (NEW)
  ├─ participant_1_id → users.id
  ├─ participant_2_id → users.id
  └─ booking_id → bookings.id
  
messages (existing, enhanced)
  ├─ conversation_id → conversations.id (NEW)
  ├─ sender_id → users.id
  ├─ receiver_id → users.id
  ├─ booking_id → bookings.id
  └─ NEW: message_type, media_url, read_at
```

## 💡 Usage Examples

### Create a conversation
```sql
INSERT INTO conversations (
  participant_1_id,
  participant_2_id,
  participant_1_type,
  participant_2_type,
  booking_id
) VALUES (
  'user-uuid-1',
  'user-uuid-2',
  'worker',
  'business',
  'booking-uuid'
);
```

### Send a message
```sql
INSERT INTO messages (
  conversation_id,
  sender_id,
  receiver_id,
  content,
  message_type
) VALUES (
  'conversation-uuid',
  'sender-uuid',
  'receiver-uuid',
  'Hello!',
  'text'
);
```

### Get user's conversations
```sql
SELECT * FROM conversations
WHERE participant_1_id = auth.uid()
   OR participant_2_id = auth.uid()
ORDER BY last_message_at DESC;
```

### Get conversation messages (paginated)
```sql
SELECT * FROM messages
WHERE conversation_id = 'conversation-uuid'
ORDER BY created_at DESC
LIMIT 50;
```

### Mark messages as read
```sql
UPDATE messages
SET is_read = true, read_at = NOW()
WHERE conversation_id = 'conversation-uuid'
  AND receiver_id = auth.uid()
  AND is_read = false;
```

## 🎯 Success Criteria Met

- ✅ Migration file created in `supabase/migrations/`
- ✅ Conversations table schema defined
- ✅ Messages table enhanced with new columns
- ✅ Indexes created for performance
- ✅ RLS policies configured for security
- ✅ Realtime enabled for live updates
- ✅ Triggers for automatic metadata updates
- ⏳ Pending: Apply migration (blocked by seed data error)

## 🐛 Known Issues

1. **Seed Data Syntax Error** - Needs fixing before local migration can be applied
2. **Local Database Container** - Currently exited due to seed data error

## 📝 Additional Notes

- Migration uses `IF NOT EXISTS` and `IF NOT NULL` for safety
- Can be run multiple times without issues (idempotent)
- Includes helpful comments for documentation
- Follows PostgreSQL best practices
- Compatible with Supabase's automatic API generation

---

**Created by:** AI Subagent  
**Date:** 2026-03-04  
**Migration Version:** 20260304125500  
**Status:** Ready to apply (pending seed data fix)
