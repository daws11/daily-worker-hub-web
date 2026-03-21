"use client";

import * as React from "react";
import { useCallback } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  MessageSquare,
  Send,
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
import { getConversations } from "@/lib/actions/messages";
import Link from "next/link";

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

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

export default function WorkerMessagesPage() {
  const { signOut, user, isLoading: authLoading } = useAuth();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedConversation, setSelectedConversation] = React.useState<
    string | null
  >(null);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch real conversations from database
      const result = await getConversations(user.id);

      if (!result.success) {
        throw new Error(result.error || "Gagal memuat percakapan");
      }

      setConversations(result.data || []);
    } catch (err: any) {
      const message = err.message || "Gagal memuat pesan";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleLogout = async () => {
    await signOut();
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.participant_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalUnread = conversations.reduce(
    (sum, conv) => sum + conv.unread_count,
    0,
  );

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
            <Button onClick={fetchConversations} size="sm">
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
              <div className="text-2xl font-bold">{conversations.length}</div>
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
                {totalUnread}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pesan Hari Ini
              </CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {
                  conversations.filter((c) => {
                    const today = new Date().toDateString();
                    return (
                      new Date(c.last_message_time).toDateString() === today
                    );
                  }).length
                }
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
        {!isLoading && !error && conversations.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-violet-100 dark:bg-violet-900/30 rounded-full mb-4">
                <MessageSquare className="h-12 w-12 text-violet-600 dark:text-violet-400" />
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
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold transition-all hover:bg-primary/90 shadow-sm hover:shadow-md"
                >
                  <Calendar className="w-5 h-5" />
                  Lihat Booking Saya
                </Link>
                <Link
                  href="/worker/jobs"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-muted text-foreground border border-border rounded-lg text-sm font-medium transition-all hover:bg-muted/80"
                >
                  <Briefcase className="w-5 h-5" />
                  Cari Pekerjaan
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conversations List */}
        {!isLoading && !error && filteredConversations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Semua Percakapan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-muted cursor-pointer transition-colors min-h-[60px] touch-manipulation ${
                      selectedConversation === conversation.id
                        ? "bg-accent"
                        : ""
                    }`}
                    onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                      <AvatarImage src={conversation.participant_avatar} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                        {conversation.participant_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm truncate">
                          {conversation.participant_name}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {formatTime(conversation.last_message_time)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.last_message}
                      </p>
                    </div>

                    {conversation.unread_count > 0 && (
                      <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shrink-0">
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Search Results */}
        {!isLoading &&
          !error &&
          searchQuery &&
          filteredConversations.length === 0 &&
          conversations.length > 0 && (
            <Card>
              <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                <Search className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Tidak ada percakapan yang cocok dengan "{searchQuery}"
                </p>
              </CardContent>
            </Card>
          )}
      </div>
    </div>
  );
}
