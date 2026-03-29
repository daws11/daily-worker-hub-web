"use client";

import type { MessageWithRelations } from "@/lib/types/message";

interface MessageBubbleProps {
  message: MessageWithRelations;
  currentUserId?: string;
  showAvatar?: boolean;
}

export function MessageBubble({
  message,
  currentUserId,
  showAvatar = false,
}: MessageBubbleProps) {
  const isSent = message.sender_id === currentUserId;

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`flex ${isSent ? "justify-end" : "justify-start"} ${
        showAvatar ? "items-end gap-2" : "items-end"
      }`}
    >
      {!isSent && showAvatar && (
        <div className="w-8 h-8 rounded-full bg-muted shrink-0 flex items-center justify-center text-xs font-medium">
          {message.sender.full_name?.charAt(0)?.toUpperCase() || "?"}
        </div>
      )}

      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isSent
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={`text-xs mt-1 text-right ${
            isSent ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

interface MessageBubbleGroupProps {
  messages: MessageWithRelations[];
  currentUserId?: string;
}

export function MessageBubbleGroup({
  messages,
  currentUserId,
}: MessageBubbleGroupProps) {
  return (
    <div className="space-y-3">
      {messages.map((message, index) => {
        const isSent = message.sender_id === currentUserId;
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showAvatar =
          !isSent &&
          (!prevMessage || prevMessage.sender_id !== message.sender_id);

        return (
          <MessageBubble
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            showAvatar={showAvatar}
          />
        );
      })}
    </div>
  );
}
