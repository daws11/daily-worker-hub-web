"use client";

import Link from "next/link";
import { User, Calendar, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { MessageWithRelations } from "@/lib/types/message";

interface ConversationListItemBookingDetails {
  job?: {
    id: string;
    title: string;
    address?: string;
    deadline?: string;
  };
  worker?: {
    id: string;
    full_name: string;
    phone?: string;
  };
  status: string;
}

export interface ConversationListItemData extends MessageWithRelations {
  bookingDetails?: ConversationListItemBookingDetails;
  unreadCount?: number;
}

interface ConversationListItemProps {
  conversation: ConversationListItemData;
  currentUserId?: string;
  href?: string;
}

export function ConversationListItem({
  conversation,
  currentUserId,
  href,
}: ConversationListItemProps) {
  const otherUser =
    conversation.sender.id === currentUserId
      ? conversation.receiver
      : conversation.sender;

  const isUnread =
    !conversation.is_read && conversation.receiver_id === currentUserId;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Kemarin";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("id-ID", { weekday: "long" });
    } else {
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  };

  const content = (
    <Card
      className={`transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer min-h-[60px] ${
        isUnread ? "border-primary border-2" : ""
      }`}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex gap-3 sm:gap-4">
          {/* Avatar */}
          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
            <AvatarImage
              src={otherUser.avatar_url ?? undefined}
              alt={otherUser.full_name}
            />
            <AvatarFallback>
              {otherUser.full_name?.charAt(0)?.toUpperCase() || (
                <User className="h-6 w-6" />
              )}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header: Name + Time */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <h3
                  className={`font-medium truncate ${
                    isUnread ? "font-semibold" : ""
                  }`}
                >
                  {otherUser.full_name}
                </h3>
                {otherUser.role === "worker" && (
                  <span className="text-xs text-muted-foreground">
                    (Pekerja)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isUnread && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(conversation.created_at)}
                </span>
              </div>
            </div>

            {/* Job Title */}
            {conversation.bookingDetails?.job && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                <Building2 className="h-3.5 w-3.5" />
                <span className="font-medium truncate">
                  {conversation.bookingDetails.job.title}
                </span>
              </div>
            )}

            {/* Last Message */}
            <p
              className={`text-sm truncate ${
                isUnread
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {conversation.content}
            </p>

            {/* Footer: Status + Unread Count */}
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              {conversation.bookingDetails && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Status: {conversation.bookingDetails.status}</span>
                </div>
              )}
              {conversation.unreadCount && conversation.unreadCount > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {conversation.unreadCount} baru
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block"
      >
        {content}
      </Link>
    );
  }

  return content;
}

interface ConversationListProps {
  conversations: ConversationListItemData[];
  currentUserId?: string;
  baseHref?: string;
  emptyMessage?: string;
  loading?: boolean;
}

export function ConversationList({
  conversations,
  currentUserId,
  baseHref,
  emptyMessage = "Belum ada percakapan",
  loading = false,
}: ConversationListProps) {
  if (loading) {
    return null;
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((conversation) => {
        const href = baseHref
          ? `${baseHref}/${conversation.booking_id}`
          : undefined;

        return (
          <ConversationListItem
            key={conversation.id}
            conversation={conversation}
            currentUserId={currentUserId}
            href={href}
          />
        );
      })}
    </div>
  );
}
