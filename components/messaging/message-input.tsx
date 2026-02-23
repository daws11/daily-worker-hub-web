"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PaperclipIcon, SendIcon } from "lucide-react"

export interface MessageInputProps extends React.HTMLAttributes<HTMLDivElement> {
  bookingId?: string
  receiverId: string
  onSendMessage: (receiverId: string, content: string, bookingId?: string) => Promise<void> | void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  showAttachmentButton?: boolean
  minRows?: number
  maxRows?: number
}

const MessageInput = React.forwardRef<HTMLDivElement, MessageInputProps>(
  (
    {
      bookingId,
      receiverId,
      onSendMessage,
      disabled = false,
      placeholder = "Type a message...",
      maxLength = 2000,
      showAttachmentButton = false,
      minRows = 1,
      maxRows = 5,
      className,
      ...props
    },
    ref
  ) => {
    const [message, setMessage] = React.useState("")
    const [isSending, setIsSending] = React.useState(false)
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)

    const isDisabled = disabled || isSending
    const canSend = message.trim().length > 0 && !isDisabled

    const handleSend = async () => {
      if (!canSend) return

      setIsSending(true)
      try {
        await onSendMessage(receiverId, message.trim(), bookingId)
        setMessage("")
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto"
        }
      } finally {
        setIsSending(false)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Send on Enter without Shift
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault()
        handleSend()
      }
    }

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      if (newValue.length <= maxLength) {
        setMessage(newValue)

        // Auto-resize textarea
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto"
          const scrollHeight = textareaRef.current.scrollHeight
          const lineHeight = 24 // Approximate line height
          const maxHeight = maxRows * lineHeight
          textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`
        }
      }
    }

    const remainingChars = maxLength - message.length
    const isNearLimit = remainingChars <= 100

    return (
      <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props}>
        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border border-input bg-background p-2",
            "focus-within:ring-1 focus-within:ring-ring",
            isDisabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {showAttachmentButton && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full"
              disabled={isDisabled}
              aria-label="Attach file"
            >
              <PaperclipIcon className="h-4 w-4" />
            </Button>
          )}

          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={minRows}
            className={cn(
              "flex-1 resize-none bg-transparent text-sm leading-relaxed",
              "placeholder:text-muted-foreground",
              "focus:outline-none disabled:cursor-not-allowed",
              "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30",
              "py-2 px-1"
            )}
            style={{
              maxHeight: `${maxRows * 24}px`, // Approximate max height
              overflowY: "auto",
            }}
          />

          <Button
            type="button"
            variant="default"
            size="icon"
            className={cn(
              "h-9 w-9 shrink-0 rounded-full transition-all",
              canSend ? "opacity-100" : "opacity-50"
            )}
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">Enter</kbd> to send,
            <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground text-[10px] ml-1">Shift + Enter</kbd> for new line
          </p>

          {isNearLimit && (
            <p
              className={cn(
                "text-xs",
                remainingChars === 0
                  ? "text-destructive"
                  : remainingChars <= 20
                    ? "text-orange-500"
                    : "text-muted-foreground"
              )}
            >
              {remainingChars} character{remainingChars !== 1 ? "s" : ""} remaining
            </p>
          )}
        </div>
      </div>
    )
  }
)
MessageInput.displayName = "MessageInput"

export { MessageInput }
