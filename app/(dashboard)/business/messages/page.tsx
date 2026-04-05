"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { useConversations } from "@/lib/hooks/use-conversations";
import { getBusinessBookings } from "@/lib/supabase/queries/bookings";
import type { MessageWithRelations } from "@/lib/types/message";
import {
  MessageCircle,
  Loader2,
  AlertCircle,
  User,
  Calendar,
  Building2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Query timeout wrapper to prevent infinite loading
function withTimeout<T>(promise: Promise<T>, ms: number = 10000): Promise<T> {
  return Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Request timed out")), ms))]) as any as Promise<T>;
}

interface ConversationWithDetails extends MessageWithRelations {
  bookingDetails?: {
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
  };
  unreadCount?: number;
}

interface ConversationsData {
  total: number;
  unread: number;
  conversationsList: ConversationWithDetails[];
}

export default function BusinessMessagesPage() {
  const { user } = useAuth();

  // Use the conversations hook for data management
  const {
    conversations,
    unreadCount,
    isLoading: hookLoading,
    error: hookError,
    fetchConversations,
    fetchUnreadCount,
  } = useConversations({
    userId: user?.id,
    autoFetch: false,
  });

  const [conversationsData, setConversationsData] = useState<ConversationsData>({
    total: 0,
    unread: 0,
    conversationsList: [],
  });
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loading = hookLoading || enriching;

  // Fetch conversations and enrich with booking details
  const fetchAndEnrichConversations = useCallback(async () => {
    if (!user?.id) return;

    setEnriching(true);

    try {
      setError(null);

      // Fetch conversations using the hook with timeout
      await withTimeout(Promise.all([fetchConversations(), fetchUnreadCount()]), 10000);

      // Get all business bookings to add job details with timeout
      const { data: bookingsData, error: bookingsError } =
        await withTimeout(getBusinessBookings(user.id), 10000);

      if (bookingsError) {
        throw bookingsError;
      }

      setError(null);

      // Create a map of booking_id to booking details
      const bookingMap = new Map();
      bookingsData?.forEach((booking) => {
        bookingMap.set(booking.id, {
          job: booking.job,
          worker: booking.worker,
          status: booking.status,
        });
      });

      // Enrich conversations with booking details
      const conversationsWithDetails: ConversationWithDetails[] = (
        conversations || []
      ).map((conv) => {
        const bookingDetails = conv.booking_id
          ? bookingMap.get(conv.booking_id)
          : undefined;

        return {
          ...conv,
          bookingDetails,
        };
      });

      // Sort by most recent message and by unread first
      conversationsWithDetails.sort((a, b) => {
        // Prioritize unread conversations
        if (a.unreadCount && !b.unreadCount) return -1;
        if (!a.unreadCount && b.unreadCount) return 1;
        // Then sort by created_at
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      setConversationsData({
        total: conversationsWithDetails.length,
        unread: unreadCount,
        conversationsList: conversationsWithDetails,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memuat data";
      setError(message);
      toast.error(message);
    } finally {
      setEnriching(false);
    }
  }, [user?.id, conversations, unreadCount, fetchConversations, fetchUnreadCount]);

  // Fetch conversations on mount
  useEffect(() => {
    fetchAndEnrichConversations();
  }, [fetchAndEnrichConversations]);

  // Format date to Indonesian locale
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

  // Get other user info from message
  const getOtherUser = (message: MessageWithRelations) => {
    // If current user is the sender, show receiver
    if (message.sender.id === user?.id) {
      return message.receiver;
    }
    // Otherwise show sender
    return message.sender;
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 pb-24 md:pb-6">
      {/* Page Header */}
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">Pesan</h1>
        <p className="text-muted-foreground text-xs md:text-sm">
          Kelola komunikasi dengan pekerja untuk setiap booking
        </p>
      </div>

      {/* Error State */}
      {(hookError || error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal memuat data</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{hookError || error}</span>
            <Button variant="outline" size="sm" onClick={fetchAndEnrichConversations}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && !hookError && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Memuat pesan...</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {!loading && !hookError && !error && (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Percakapan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {conversationsData.total ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Belum Dibaca
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <div className="text-3xl font-bold text-destructive">
                {conversationsData.unread ?? 0}
              </div>
              {conversationsData.unread > 0 && (
                <Badge variant="destructive">Baru</Badge>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!loading && !hookError && !error && conversationsData.conversationsList?.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <MessageCircle className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Belum Ada Percakapan</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Pesan akan muncul di sini setelah Anda memiliki booking aktif dengan pekerja. 
              Komunikasi dengan pekerja untuk koordinasi pekerjaan.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/business/bookings"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold transition-all duration-200 hover:bg-primary/90 shadow-sm hover:shadow-md min-h-[44px] touch-manipulation"
              >
                <Calendar className="w-5 h-5" />
                Lihat Booking Saya
              </Link>
              <Link
                href="/business/jobs"
                className="inline-flex items-center gap-2 px-6 py-3 bg-muted text-foreground border border-border rounded-lg text-sm font-medium transition-all duration-200 hover:bg-muted/80 min-h-[44px] touch-manipulation"
              >
                <Building2 className="w-5 h-5" />
                Kelola Pekerjaan
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversations List */}
      {!loading &&
        !hookError &&
        !error &&
        conversationsData.conversationsList &&
        conversationsData.conversationsList.length > 0 && (
          <div className="space-y-3">
            {conversationsData.conversationsList.map((conversation) => {
              const otherUser = getOtherUser(conversation);
              const isUnread =
                !conversation.is_read && conversation.receiver_id === user?.id;

              return (
                <Link
                  key={conversation.id}
                  href={`/business/messages/${conversation.booking_id}`}
                  className="block"
                >
                  <Card
                    className={`transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer min-h-[60px] touch-manipulation ${
                      isUnread ? "border-primary border-2" : ""
                    }`}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex gap-3 sm:gap-4">
                        {/* Avatar */}
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                          <AvatarImage
                            src={otherUser.avatar_url || ""}
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
                                className={`font-medium truncate ${isUnread ? "font-semibold" : ""}`}
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
                              <span className="font-medium">
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
                                <span>
                                  Status: {conversation.bookingDetails.status}
                                </span>
                              </div>
                            )}
                            {conversation.unreadCount &&
                              conversation.unreadCount > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="ml-auto"
                                >
                                  {conversation.unreadCount} baru
                                </Badge>
                              )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
    </div>
  );
}
