"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageWithRelations } from "@/lib/types/message"

interface MessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  message: MessageWithRelations
  currentUserId: string
  showAvatar?: boolean
  showSenderName?: boolean
}

const MessageBubble = React.forwardRef<HTMLDivElement, MessageBubbleProps>(
  (
    {
      message,
      currentUserId,
      showAvatar = true,
      showSenderName = false,
      className,
      ...props
    },
    ref
  ) => {
    const isOwnMessage = message.sender_id === currentUserId
    const senderInitials = message.sender.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

    const formatTime = (dateString: string) => {
      const date = new Date(dateString)
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()

      if (isToday) {
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      }

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex gap-2.5 max-w-[85%]",
          isOwnMessage ? "ml-auto flex-row-reverse" : "mr-auto",
          className
        )}
        {...props}
      >
        {showAvatar && !isOwnMessage && (
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage
              src={message.sender.avatar_url ?? undefined}
              alt={message.sender.full_name}
            />
            <AvatarFallback className="text-xs">
              {senderInitials}
            </AvatarFallback>
          </Avatar>
        )}

        <div
          className={cn(
            "flex flex-col gap-1",
            isOwnMessage ? "items-end" : "items-start"
          )}
        >
          {showSenderName && !isOwnMessage && (
            <span className="text-xs text-muted-foreground px-1">
              {message.sender.full_name}
            </span>
          )}

          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 break-words",
              isOwnMessage
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted text-foreground rounded-bl-md"
            )}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>

          <div
            className={cn(
              "flex items-center gap-1.5 px-1",
              isOwnMessage ? "flex-row" : "flex-row-reverse"
            )}
          >
            <span className="text-xs text-muted-foreground">
              {formatTime(message.created_at)}
            </span>

            {isOwnMessage && (
              <span
                className={cn(
                  "text-xs",
                  message.is_read
                    ? "text-muted-foreground"
                    : "text-muted-foreground/60"
                )}
              >
                {message.is_read ? "Read" : "Sent"}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }
)
MessageBubble.displayName = "MessageBubble"

export { MessageBubble }
