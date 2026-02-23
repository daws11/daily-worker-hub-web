"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MessageThread } from "@/components/messaging/message-thread"
import { MessageInput } from "@/components/messaging/message-input"
import { useMessages } from "@/lib/hooks/use-messages"
import { useRealtimeMessages } from "@/lib/hooks/use-realtime-messages"
import { cn } from "@/lib/utils"

export interface BookingMessagesDialogProps {
  bookingId: string
  currentUserId: string
  receiverId: string
  receiverName?: string
  trigger?: React.ReactNode
  triggerClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function BookingMessagesDialog({
  bookingId,
  currentUserId,
  receiverId,
  receiverName = "the other party",
  trigger,
  triggerClassName,
  open: controlledOpen,
  onOpenChange,
}: BookingMessagesDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (isControlled && onOpenChange) {
        onOpenChange(newOpen)
      } else {
        setInternalOpen(newOpen)
      }
    },
    [isControlled, onOpenChange]
  )

  // Fetch messages for this booking
  const {
    messages,
    isLoading,
    sendNewMessage,
    markBookingAsRead,
    refreshMessages,
  } = useMessages({
    bookingId,
    userId: currentUserId,
    autoFetch: open, // Only fetch when dialog is open
  })

  // Subscribe to realtime message updates
  const { isConnected } = useRealtimeMessages(
    { bookingId, enabled: open },
    {
      onMessageChange: async (event) => {
        // Refresh messages when any change occurs
        await refreshMessages()
      },
    }
  )

  // Mark messages as read when dialog opens
  React.useEffect(() => {
    if (open) {
      markBookingAsRead(bookingId, receiverId)
    }
  }, [open, bookingId, receiverId, markBookingAsRead])

  const handleSendMessage = async (receiverId: string, content: string, bookingId?: string) => {
    await sendNewMessage(receiverId, content, bookingId)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && (
        <DialogTrigger asChild className={triggerClassName}>
          {trigger}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Messages</DialogTitle>
          <DialogDescription>
            Conversation with {receiverName}
          </DialogDescription>
        </DialogHeader>

        {/* Message Thread */}
        <div className="flex-1 overflow-hidden">
          <MessageThread
            messages={messages || []}
            currentUserId={currentUserId}
            isLoading={isLoading}
            autoScroll
            groupConsecutive
            showAvatar
          />
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          <MessageInput
            bookingId={bookingId}
            receiverId={receiverId}
            onSendMessage={handleSendMessage}
            disabled={!isConnected}
            placeholder={`Message ${receiverName}...`}
          />
        </div>

        {/* Connection Status */}
        {!isConnected && open && (
          <div className="absolute top-16 right-6 flex items-center gap-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
            <div className="h-2 w-2 rounded-full bg-yellow-600 animate-pulse" />
            Reconnecting...
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
