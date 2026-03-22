"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";
import { getBookingMessages } from "@/lib/supabase/queries/messages";
import { getBookingById } from "@/lib/supabase/queries/bookings";
import { sendMessage } from "@/lib/actions/messages";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  MessageCircle,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useRealtimeMessages } from "@/lib/hooks/use-realtime-messages";
import type { MessageWithRelations } from "@/lib/types/message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function BusinessBookingMessagePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const bookingId = params.bookingId as string;
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<MessageWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiverInfo, setReceiverInfo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch messages and booking details
  const fetchMessages = useCallback(async () => {
    if (!bookingId || !user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch messages for this booking
      const { data: messagesData, error: messagesError } =
        await getBookingMessages(bookingId);

      if (messagesError) {
        throw messagesError;
      }

      // Fetch booking details to get worker info
      const { data: bookingData, error: bookingError } =
        await getBookingById(bookingId);

      if (bookingError) {
        throw bookingError;
      }

      // Determine receiver (worker)
      if (bookingData?.worker) {
        setReceiverInfo({
          id: bookingData.worker.id,
          name: bookingData.worker.full_name || "Pekerja",
        });
      }

      setMessages(messagesData || []);

      // Scroll to bottom after messages load
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memuat pesan";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [bookingId, user?.id]);

  // Subscribe to realtime message updates
  useRealtimeMessages(
    { bookingId, enabled: true },
    {
      onMessageChange: async () => {
        await fetchMessages();
      },
      onConnect: () => {
        setIsConnected(true);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
    },
  );

  // Fetch messages on mount
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Send message
  const handleSendMessage = async (content: string) => {
    if (!receiverInfo || !user?.id || !content.trim()) return;

    setSending(true);
    try {
      const result = await sendMessage(
        user.id,
        receiverInfo.id,
        content,
        bookingId,
      );

      if (!result.success) {
        throw new Error(result.error || "Gagal mengirim pesan");
      }

      // Refresh messages after sending
      await fetchMessages();

      // Clear input
      if (inputRef.current) {
        inputRef.current.value = "";
      }

      // Scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal mengirim pesan";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>

        <div className="flex-1">
          <h1 className="text-xl font-bold">Pesan</h1>
          <p className="text-sm text-muted-foreground">
            {receiverInfo
              ? `Percakapan dengan ${receiverInfo.name}`
              : "Memuat..."}
          </p>
        </div>

        {/* Connection Status */}
        <Badge
          variant={isConnected ? "default" : "secondary"}
          className="gap-1.5"
        >
          <div
            className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-yellow-500"}`}
          />
          {isConnected ? "Terhubung" : "Menghubungkan..."}
        </Badge>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal memuat pesan</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchMessages}>
              <Loader2 className="mr-2 h-4 w-4" />
              Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Memuat pesan...</p>
          </CardContent>
        </Card>
      )}

      {/* Messages Area */}
      {!loading && !error && (
        <>
          {/* Messages List */}
          <Card>
            <ScrollArea className="h-[500px]" ref={scrollRef}>
              <CardContent className="p-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
                    <p className="font-medium">Belum ada pesan</p>
                    <p className="text-sm mt-1">
                      Mulai percakapan dengan {receiverInfo?.name || "pekerja"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const isSent = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isSent ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              isSent
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p
                              className={`text-xs mt-1 text-right ${
                                isSent
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {formatTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </ScrollArea>
          </Card>

          {/* Message Input */}
          <Card>
            <CardContent className="p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inputRef.current?.value.trim()) {
                    handleSendMessage(inputRef.current.value.trim());
                  }
                }}
                className="flex gap-2"
              >
                <Input
                  ref={inputRef}
                  placeholder="Ketik pesan..."
                  disabled={sending || !isConnected}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={sending || !isConnected}
                  size="icon"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
              {!isConnected && (
                <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
                  Menunggu koneksi...
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
