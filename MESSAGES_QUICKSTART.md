# Messages System - Quick Start Guide

## Overview
Real-time messaging system for Daily Worker Hub enabling chat between workers and businesses.

## Architecture

### Tables
1. **conversations** - Thread containers
2. **messages** - Individual messages

### Key Features
- ✅ Real-time updates via Supabase Realtime
- ✅ Unread message counts per participant
- ✅ Message previews for conversation lists
- ✅ Support for text, images, and files
- ✅ Automatic metadata updates via triggers
- ✅ Row-level security for privacy

## API Usage

### Frontend Setup (Next.js)

```typescript
import { createClient } from '@supabase/supabase-js'
import { RealtimeChannel } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### 1. Create or Get Conversation

```typescript
async function getOrCreateConversation(
  participant1Id: string,
  participant2Id: string,
  participant1Type: 'worker' | 'business',
  participant2Type: 'worker' | 'business',
  bookingId?: string
) {
  // Ensure consistent ordering (smaller UUID first)
  const [p1Id, p2Id, p1Type, p2Type] = 
    participant1Id < participant2Id 
      ? [participant1Id, participant2Id, participant1Type, participant2Type]
      : [participant2Id, participant1Id, participant2Type, participant1Type]

  // Check if conversation exists
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('participant_1_id', p1Id)
    .eq('participant_2_id', p2Id)
    .single()

  if (existing) return existing

  // Create new conversation
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      participant_1_id: p1Id,
      participant_2_id: p2Id,
      participant_1_type: p1Type,
      participant_2_type: p2Type,
      booking_id: bookingId
    })
    .select()
    .single()

  if (error) throw error
  return data
}
```

### 2. Send a Message

```typescript
async function sendMessage(
  conversationId: string,
  senderId: string,
  receiverId: string,
  content: string,
  messageType: 'text' | 'image' | 'file' = 'text',
  mediaUrl?: string
) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      message_type: messageType,
      media_url: mediaUrl
    })
    .select()
    .single()

  if (error) throw error
  return data
}
```

### 3. Subscribe to Real-time Messages

```typescript
function subscribeToConversation(
  conversationId: string,
  onNewMessage: (message: any) => void
): RealtimeChannel {
  return supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => onNewMessage(payload.new)
    )
    .subscribe()
}

// Usage
const channel = subscribeToConversation(convId, (message) => {
  console.log('New message:', message)
  // Update UI
})

// Cleanup
channel.unsubscribe()
```

### 4. Load Conversation Messages (Paginated)

```typescript
async function loadMessages(
  conversationId: string,
  page: number = 1,
  limit: number = 50
) {
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  return data.reverse() // Reverse to show oldest first
}
```

### 5. Get User's Conversations List

```typescript
async function getUserConversations(userId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      participant1:users!conversations_participant_1_id_fkey(id, full_name, avatar_url),
      participant2:users!conversations_participant_2_id_fkey(id, full_name, avatar_url)
    `)
    .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
    .order('last_message_at', { ascending: false })

  if (error) throw error
  
  // Add computed field for "other participant"
  return data.map(conv => ({
    ...conv,
    otherParticipant: conv.participant_1_id === userId 
      ? conv.participant2 
      : conv.participant1,
    unreadCount: conv.participant_1_id === userId
      ? conv.unread_count_participant_1
      : conv.unread_count_participant_2
  }))
}
```

### 6. Mark Messages as Read

```typescript
async function markMessagesAsRead(
  conversationId: string,
  userId: string
) {
  const { error } = await supabase
    .from('messages')
    .update({ 
      is_read: true, 
      read_at: new Date().toISOString() 
    })
    .eq('conversation_id', conversationId)
    .eq('receiver_id', userId)
    .eq('is_read', false)

  if (error) throw error

  // Reset unread count in conversation
  const { data: conv } = await supabase
    .from('conversations')
    .select('participant_1_id, participant_2_id')
    .eq('id', conversationId)
    .single()

  const updateField = conv.participant_1_id === userId
    ? 'unread_count_participant_1'
    : 'unread_count_participant_2'

  await supabase
    .from('conversations')
    .update({ [updateField]: 0 })
    .eq('id', conversationId)
}
```

### 7. Upload Media (Images/Files)

```typescript
async function uploadMessageMedia(
  file: File,
  conversationId: string
): Promise<string> {
  const fileName = `${conversationId}/${Date.now()}_${file.name}`
  
  const { data, error } = await supabase.storage
    .from('message-attachments')
    .upload(fileName, file)

  if (error) throw error

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('message-attachments')
    .getPublicUrl(fileName)

  return publicUrl
}

// Usage
const mediaUrl = await uploadMessageMedia(file, conversationId)
await sendMessage(convId, senderId, receiverId, 'Sent an image', 'image', mediaUrl)
```

## React Components Example

### Conversation List Component

```typescript
import { useEffect, useState } from 'react'

export function ConversationList({ userId }: { userId: string }) {
  const [conversations, setConversations] = useState([])

  useEffect(() => {
    // Load conversations
    getUserConversations(userId).then(setConversations)

    // Subscribe to updates
    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `or(participant_1_id.eq.${userId},participant_2_id.eq.${userId})`
        },
        () => {
          getUserConversations(userId).then(setConversations)
        }
      )
      .subscribe()

    return () => channel.unsubscribe()
  }, [userId])

  return (
    <div>
      {conversations.map((conv: any) => (
        <div key={conv.id} className="conversation-item">
          <img src={conv.otherParticipant.avatar_url} />
          <div>
            <h3>{conv.otherParticipant.full_name}</h3>
            <p>{conv.last_message_preview}</p>
          </div>
          {conv.unreadCount > 0 && (
            <span className="badge">{conv.unreadCount}</span>
          )}
        </div>
      ))}
    </div>
  )
}
```

### Chat Window Component

```typescript
import { useEffect, useState, useRef } from 'react'

export function ChatWindow({ 
  conversationId, 
  currentUserId, 
  otherUserId 
}: { 
  conversationId: string
  currentUserId: string
  otherUserId: string 
}) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load initial messages
    loadMessages(conversationId).then(msgs => {
      setMessages(msgs)
      scrollToBottom()
    })

    // Mark as read
    markMessagesAsRead(conversationId, currentUserId)

    // Subscribe to new messages
    const channel = subscribeToConversation(conversationId, (message) => {
      setMessages(prev => [...prev, message])
      scrollToBottom()
      
      // Mark as read if we're the receiver
      if (message.receiver_id === currentUserId) {
        markMessagesAsRead(conversationId, currentUserId)
      }
    })

    return () => channel.unsubscribe()
  }, [conversationId, currentUserId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!input.trim()) return

    await sendMessage(conversationId, currentUserId, otherUserId, input)
    setInput('')
  }

  return (
    <div className="chat-window">
      <div className="messages">
        {messages.map((msg: any) => (
          <div 
            key={msg.id} 
            className={msg.sender_id === currentUserId ? 'sent' : 'received'}
          >
            {msg.message_type === 'text' && <p>{msg.content}</p>}
            {msg.message_type === 'image' && (
              <img src={msg.media_url} alt="Shared image" />
            )}
            <span className="time">
              {new Date(msg.created_at).toLocaleTimeString()}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  )
}
```

## Database Functions (SQL)

### Get unread message count for user

```sql
CREATE OR REPLACE FUNCTION get_unread_count(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_unread INTEGER;
BEGIN
  SELECT SUM(
    CASE 
      WHEN participant_1_id = user_id THEN unread_count_participant_1
      WHEN participant_2_id = user_id THEN unread_count_participant_2
      ELSE 0
    END
  ) INTO total_unread
  FROM conversations
  WHERE participant_1_id = user_id OR participant_2_id = user_id;
  
  RETURN COALESCE(total_unread, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usage
SELECT get_unread_count('user-uuid');
```

### Search messages

```sql
CREATE OR REPLACE FUNCTION search_messages(
  user_id UUID,
  search_query TEXT
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  sender_id UUID,
  created_at TIMESTAMPTZ,
  conversation_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.content,
    m.sender_id,
    m.created_at,
    m.conversation_id
  FROM messages m
  INNER JOIN conversations c ON c.id = m.conversation_id
  WHERE 
    (c.participant_1_id = user_id OR c.participant_2_id = user_id)
    AND m.content ILIKE '%' || search_query || '%'
  ORDER BY m.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usage
SELECT * FROM search_messages('user-uuid', 'hello');
```

## Performance Tips

1. **Pagination**: Always paginate messages (don't load all at once)
2. **Indexing**: Indexes already created on frequently queried columns
3. **Caching**: Cache conversation list on client side
4. **Debouncing**: Debounce typing indicators and read receipts
5. **Cleanup**: Archive old conversations (optional)

## Security Notes

- RLS ensures users can only see their own conversations
- Users can only send messages as themselves
- File uploads should validate file types and sizes
- Consider rate limiting for message sending
- Sanitize message content to prevent XSS

## Storage Bucket Setup

Create a storage bucket for message attachments:

```sql
-- Run in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false);

-- Policy: Users can upload to their conversations
CREATE POLICY "Users can upload message attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can view attachments from their conversations
CREATE POLICY "Users can view message attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'message-attachments');
```

## Testing

```typescript
// Test conversation creation
const conv = await getOrCreateConversation(
  'worker-uuid',
  'business-uuid',
  'worker',
  'business'
)

// Test message sending
await sendMessage(conv.id, 'worker-uuid', 'business-uuid', 'Hello!')

// Test real-time subscription
const channel = subscribeToConversation(conv.id, (msg) => {
  console.log('Received:', msg)
})

// Wait a moment, then send another message
setTimeout(() => {
  sendMessage(conv.id, 'business-uuid', 'worker-uuid', 'Hi there!')
}, 2000)
```

---

**Ready to use!** Apply the migration and start chatting! 🚀
