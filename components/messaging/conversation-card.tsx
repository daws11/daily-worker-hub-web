"use client"

import * as React from "react"
import { Building2, Calendar, MessageCircle, CheckCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UnreadBadge } from "@/components/messaging/unread-badge"
import { BookingMessagesDialog } from "@/components/messaging/booking-messages-dialog"
import type { MessageWithRelations } from "@/lib/types/message"

export interface ConversationCardProps {
  conversation: MessageWithRelations
  currentUserId: string
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function truncateMessage(content: string, maxLength: number = 80): string {
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength) + "..."
}

function getOtherParty(conversation: MessageWithRelations, currentUserId: string) {
  // If current user is the sender, the other party is the receiver
  if (conversation.sender_id === currentUserId) {
    return {
      user: conversation.receiver,
      isSender: false,
    }
  }
  // If current user is the receiver, the other party is the sender
  return {
    user: conversation.sender,
    isSender: true,
  }
}

export function ConversationCard({ conversation, currentUserId }: ConversationCardProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const otherParty = getOtherParty(conversation, currentUserId)

  const unreadCount = conversation.receiver_id === currentUserId && !conversation.is_read ? 1 : 0

  return (
    <>
      <Card
        className="w-full cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setDialogOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-base">
              {conversation.booking?.id ? `Booking ${conversation.booking.id.slice(0, 8)}` : "Direct Message"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {otherParty.user?.full_name || "Unknown"}
              </span>
              {otherParty.user?.role === "business" && (
                <CheckCircle className="h-3 w-3 text-blue-500" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatTime(conversation.created_at)}
            </span>
            {unreadCount > 0 && (
              <UnreadBadge count={unreadCount} size="sm" />
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-2 pb-3">
          {conversation.booking && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                Status: <Badge variant="outline" className="text-xs ml-1">{conversation.booking.status}</Badge>
              </span>
            </div>
          )}
          <div className="flex items-start gap-2 text-sm">
            <MessageCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground line-clamp-2 flex-1">
              {truncateMessage(conversation.content)}
            </p>
          </div>
        </CardContent>
      </Card>

      {conversation.booking_id && (
        <BookingMessagesDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          bookingId={conversation.booking_id}
          currentUserId={currentUserId}
          receiverId={otherParty.user?.id || ""}
          receiverName={otherParty.user?.full_name}
          trigger={null}
        />
      )}
    </>
  )
}
