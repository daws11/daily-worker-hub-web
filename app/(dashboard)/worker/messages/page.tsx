"use client";

import * as React from "react";
import { useCallback } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  MessageSquare,
  Search,
  Bell,
  Calendar,
  Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useConversations } from "@/lib/hooks/use-conversations";
import type { MessageWithRelations } from "@/lib/types/message";
import Link from "next/link";

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (diffDays === 1) {
    return "Kemarin";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("id-ID", { weekday: "short" });
  } else {
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }
}

function isConversationUnread(
  conversation: MessageWithRelations,
  userId?: string,
): boolean {
  return (
    conversation.receiver_id === userId &&
    !conversation.is_read
  );
}

export default function WorkerMessagesPage() {
  const { signOut, user, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedConversation, setSelectedConversation] = React.useState<
    string | null
  >(null);

  const {
    conversations,
    unreadCount,
    isLoading,
    error,
    fetchConversations,
    fetchUnreadCount,
    markConversationAsRead,
    markConversationFromUserAsRead,
  } = useConversations({ userId: user?.id, autoFetch: true });

  const handleLogout = async () => {
    await signOut();
  };

  const handleConversationClick = useCallback(
    async (conversation: MessageWithRelations) => {
      setSelectedConversation(conversation.booking?.id || null);
      if (!user?.id) return;

      // Determine the other user (sender if we're the receiver, receiver if we're the sender)
      const otherUserId =
        conversation.sender_id === user.id
          ? conversation.receiver_id
          : conversation.sender_id;

      // Mark messages from this user as read
      await markConversationFromUserAsRead(otherUserId, user.id);
    },
    [user?.id, markConversationFromUserAsRead],
  );

  // Sort conversations: unread first, then by created_at descending
  const sortedConversations = React.useMemo(() => {
    if (!conversations) return [];
    return [...conversations].sort((a, b) => {
      const aUnread = isConversationUnread(a, user?.id);
      const bUnread = isConversationUnread(b, user?.id);
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [conversations, user?.id]);

  const filteredConversations = React.useMemo(() => {
    if (!sortedConversations) return [];
    return sortedConversations.filter((conv) => {
      const otherUser =
        conv.sender_id === user?.id ? conv.receiver : conv.sender;
      return otherUser.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [sortedConversations, searchQuery, user?.id]);

  // Today's conversations count
  const todayCount = React.useMemo(() => {
    if (!conversations) return 0;
    const today = new Date().toDateString();
    return conversations.filter((c) => {
      return new Date(c.created_at).toDateString() === today;
    }).length;
  }, [conversations]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-900 font-medium">
            Error: Tidak dapat memuat informasi pengguna. Silakan refresh
            halaman.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-1">Pesan</h1>
            <p className="text-sm text-muted-foreground m-0">
              Komunikasi dengan bisnis dan tim
            </p>
          </div>
          <Button
            onClick={handleLogout}
            disabled={authLoading}
            variant="destructive"
            size="sm"
            className="min-h-[44px] touch-manipulation"
          >
            {authLoading ? "Memproses..." : "Keluar"}
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="text-red-900 font-medium mb-1">
                Gagal memuat pesan
              </p>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
            <Button
              onClick={async () => {
                await fetchConversations();
                await fetchUnreadCount();
              }}
              size="sm"
            >
              <Loader2 className="h-4 w-4 mr-2" />
              Coba Lagi
            </Button>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">
                Total Percakapan
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {conversations?.length ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pesan Belum Dibaca
              </CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {unreadCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pesan Hari Ini
              </CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {todayCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari percakapan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Loading State */}
        {isLoading && !error && (
          <Card>
            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="h-8 w-8 text-blue-600 mb-4 animate-spin" />
              <p className="text-muted-foreground">Memuat pesan...</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && (!conversations || conversations.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <MessageSquare className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Belum Ada Pesan</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Percakapan dengan bisnis akan muncul di sini setelah Anda
                memiliki booking aktif. Komunikasi penting untuk koordinasi
                pekerjaan!
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/worker/bookings"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold transition-all duration-200 hover:bg-primary/90 shadow-sm hover:shadow-md min-h-[44px] touch-manipulation"
                >
                  <Calendar className="w-5 h-5" />
                  Lihat Booking Saya
                </Link>
                <Link
                  href="/worker/jobs"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-muted text-foreground border border-border rounded-lg text-sm font-medium transition-all duration-200 hover:bg-muted/80 min-h-[44px] touch-manipulation"
                >
                  <Briefcase className="w-5 h-5" />
                  Cari Pekerjaan
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conversations List */}
        {!isLoading &&
          !error &&
          filteredConversations &&
          filteredConversations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  Semua Percakapan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredConversations.map((conversation) => {
                    const otherUser =
                      conversation.sender_id === user?.id
                        ? conversation.receiver
                        : conversation.sender;
                    const isUnread = isConversationUnread(conversation, user?.id);
                    const href = conversation.booking?.id
                      ? `/worker/messages/${conversation.booking.id}`
                      : "#";
                    const bookingId = conversation.booking?.id;

                    return (
                      <Link
                        key={conversation.id}
                        href={href}
                        onClick={() => handleConversationClick(conversation)}
                        className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-muted cursor-pointer transition-colors min-h-[60px] touch-manipulation ${
                          selectedConversation === bookingId ? "bg-accent" : ""
                        } ${isUnread ? "border-l-4 border-l-primary" : ""}`}
                      >
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                          <AvatarImage src={otherUser.avatar_url || undefined} />
                          <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                            {otherUser.full_name?.charAt(0)?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p
                              className={`font-medium text-sm truncate ${
                                isUnread ? "font-semibold" : ""
                              }`}
                            >
                              {otherUser.full_name}
                            </p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {formatTime(conversation.created_at)}
                            </span>
                          </div>
                          <p
                            className={`text-sm truncate ${
                              isUnread
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            {conversation.content}
                          </p>
                        </div>

                        {isUnread && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

        {/* No Search Results */}
        {!isLoading &&
          !error &&
          searchQuery &&
          (filteredConversations?.length ?? 0) === 0 &&
          (conversations?.length ?? 0) > 0 && (
            <Card className="rounded-xl shadow-sm">
              <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                <Search className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm md:text-base text-muted-foreground">
                  Tidak ada percakapan yang cocok dengan "{searchQuery}"
                </p>
              </CardContent>
            </Card>
          )}
      </div>
    </div>
  );
}
