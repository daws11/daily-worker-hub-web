"use client"

import * as React from "react"
import { toast } from "sonner"

import { ConversationCard } from "@/components/messaging/conversation-card"
import { useMessages } from "@/lib/hooks/use-messages"
import { useRealtimeMessages } from "@/lib/hooks/use-realtime-messages"
import type { MessageWithRelations } from "@/lib/types/message"

export interface ConversationListProps {
  userId: string
}

export function ConversationList({ userId }: ConversationListProps) {
  const {
    conversations,
    isLoading,
    error,
    fetchConversations,
    refreshMessages,
  } = useMessages({
    userId,
    autoFetch: true,
  })

  // Subscribe to realtime message updates
  // Use receiverId to listen for incoming messages
  useRealtimeMessages(
    { receiverId: userId, enabled: true },
    {
      onMessageChange: async () => {
        // Refresh conversations when any message change occurs
        await refreshMessages()
      },
    }
  )

  // Load conversations on mount
  React.useEffect(() => {
    if (userId) {
      fetchConversations()
    }
  }, [userId, fetchConversations])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Error: {error}</p>
      </div>
    )
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Belum ada percakapan.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Pesan akan muncul di sini setelah Anda memiliki booking dengan bisnis.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {conversations.map((conversation) => (
        <ConversationCard
          key={conversation.id}
          conversation={conversation}
          currentUserId={userId}
        />
      ))}
    </div>
  )
}
