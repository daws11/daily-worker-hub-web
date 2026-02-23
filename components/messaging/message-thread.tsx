"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageBubble } from "@/components/messaging/message-bubble"
import { MessageWithRelations } from "@/lib/types/message"

export interface MessageThreadProps extends React.HTMLAttributes<HTMLDivElement> {
  messages: MessageWithRelations[]
  currentUserId: string
  isLoading?: boolean
  loadingComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
  autoScroll?: boolean
  scrollBehavior?: "auto" | "smooth"
  groupConsecutive?: boolean
  showAvatar?: boolean
  showSenderName?: boolean
}

interface MessageGroup {
  senderId: string
  messages: MessageWithRelations[]
}

const MessageThread = React.forwardRef<HTMLDivElement, MessageThreadProps>(
  (
    {
      messages,
      currentUserId,
      isLoading = false,
      loadingComponent,
      emptyComponent,
      autoScroll = true,
      scrollBehavior = "smooth",
      groupConsecutive = true,
      showAvatar = true,
      showSenderName = false,
      className,
      ...props
    },
    ref
  ) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const prevMessagesLengthRef = useRef(0)

    // Group consecutive messages from the same sender
    const groupedMessages = React.useMemo(() => {
      if (!groupConsecutive) {
        return messages.map((msg) => [{ senderId: msg.sender_id, messages: [msg] }])
      }

      const groups: MessageGroup[] = []
      for (const message of messages) {
        const lastGroup = groups[groups.length - 1]
        if (lastGroup && lastGroup.senderId === message.sender_id) {
          lastGroup.messages.push(message)
        } else {
          groups.push({ senderId: message.sender_id, messages: [message] })
        }
      }
      return groups
    }, [messages, groupConsecutive])

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
      if (!autoScroll) return

      const messagesLength = messages.length
      const hasNewMessages = messagesLength > prevMessagesLengthRef.current

      if (hasNewMessages && messagesLength > 0) {
        const scrollElement = scrollAreaRef.current
        if (scrollElement) {
          scrollElement.scrollTo({
            top: scrollElement.scrollHeight,
            behavior: scrollBehavior,
          })
        }
      }

      prevMessagesLengthRef.current = messagesLength
    }, [messages, autoScroll, scrollBehavior])

    // Render empty state
    if (!isLoading && messages.length === 0) {
      return (
        <div
          ref={ref}
          className={cn("flex items-center justify-center h-full", className)}
          {...props}
        >
          {emptyComponent || (
            <p className="text-sm text-muted-foreground">No messages yet</p>
          )}
        </div>
      )
    }

    return (
      <ScrollArea
        ref={scrollAreaRef}
        className={cn("flex-1 h-full", className)}
        {...props}
      >
        <div className="flex flex-col gap-4 p-4">
          {groupConsecutive
            ? groupedMessages.map((group, groupIndex) => {
                const isOwnGroup = group.senderId === currentUserId

                return (
                  <div
                    key={`group-${groupIndex}-${group.messages[0].id}`}
                    className={cn(
                      "flex flex-col gap-1",
                      isOwnGroup ? "items-end" : "items-start"
                    )}
                  >
                    {group.messages.map((message, messageIndex) => {
                      const isFirstInGroup = messageIndex === 0
                      const isLastInGroup = messageIndex === group.messages.length - 1

                      return (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          currentUserId={currentUserId}
                          showAvatar={showAvatar && isFirstInGroup}
                          showSenderName={
                            showSenderName &&
                            !isOwnGroup &&
                            isFirstInGroup
                          }
                          className={cn(
                            isFirstInGroup && "mt-2",
                            isLastInGroup && "mb-2",
                            !isFirstInGroup && !isLastInGroup && "my-0.5"
                          )}
                        />
                      )
                    })}
                  </div>
                )
              })
            : messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  currentUserId={currentUserId}
                  showAvatar={showAvatar}
                  showSenderName={showSenderName && message.sender_id !== currentUserId}
                />
              ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              {loadingComponent || (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Loading messages...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    )
  }
)
MessageThread.displayName = "MessageThread"

export { MessageThread }
