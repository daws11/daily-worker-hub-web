"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  getUserConversations,
  getUnreadCount,
  markBookingMessagesAsRead,
  markSenderMessagesAsRead,
} from "../supabase/queries/messages";
import type { MessageWithRelations } from "../types/message";

type UseConversationsOptions = {
  userId?: string;
  autoFetch?: boolean;
};

type UseConversationsReturn = {
  conversations: MessageWithRelations[] | null;
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchConversations: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markConversationAsRead: (bookingId: string, receiverId: string) => Promise<void>;
  markConversationFromUserAsRead: (
    senderId: string,
    receiverId: string,
  ) => Promise<void>;
  refreshConversations: () => Promise<void>;
};

export function useConversations(
  options: UseConversationsOptions = {},
): UseConversationsReturn {
  const { userId, autoFetch = true } = options;

  const [conversations, setConversations] = useState<
    MessageWithRelations[] | null
  >(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!userId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getUserConversations(userId);

      if (result.error) {
        setError(result.error.message);
        toast.error(
          "Gagal mengambil data percakapan: " + result.error.message,
        );
        return;
      }

      setConversations(result.data as MessageWithRelations[] | null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Terjadi kesalahan tak terduga";
      setError(errorMessage);
      toast.error("Gagal mengambil data percakapan: " + errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) {
      return;
    }

    setError(null);

    try {
      const result = await getUnreadCount(userId);

      if (result.error) {
        setError(result.error.message);
        toast.error(
          "Gagal mengambil jumlah pesan belum dibaca: " + result.error.message,
        );
        return;
      }

      setUnreadCount(result.data?.total_unread || 0);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Terjadi kesalahan tak terduga";
      setError(errorMessage);
      toast.error(
        "Gagal mengambil jumlah pesan belum dibaca: " + errorMessage,
      );
    }
  }, [userId]);

  const markConversationAsRead = useCallback(
    async (bookingId: string, receiverId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await markBookingMessagesAsRead(bookingId, receiverId);

        if (result.error) {
          setError(result.error.message);
          toast.error("Gagal menandai percakapan: " + result.error.message);
          return;
        }

        toast.success("Percakapan ditandai sudah dibaca");

        // Refresh conversations and unread count
        await fetchConversations();
        await fetchUnreadCount();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Terjadi kesalahan tak terduga";
        setError(errorMessage);
        toast.error("Gagal menandai percakapan: " + errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchConversations, fetchUnreadCount],
  );

  const markConversationFromUserAsRead = useCallback(
    async (senderId: string, receiverId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await markSenderMessagesAsRead(senderId, receiverId);

        if (result.error) {
          setError(result.error.message);
          toast.error("Gagal menandai percakapan: " + result.error.message);
          return;
        }

        toast.success("Percakapan ditandai sudah dibaca");

        // Refresh conversations and unread count
        await fetchConversations();
        await fetchUnreadCount();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Terjadi kesalahan tak terduga";
        setError(errorMessage);
        toast.error("Gagal menandai percakapan: " + errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchConversations, fetchUnreadCount],
  );

  const refreshConversations = useCallback(async () => {
    await fetchConversations();
  }, [fetchConversations]);

  // Auto-fetch on mount and when options change
  useEffect(() => {
    if (autoFetch) {
      if (userId) {
        fetchConversations();
        fetchUnreadCount();
      }
    }
  }, [autoFetch, userId, fetchConversations, fetchUnreadCount]);

  return {
    conversations,
    unreadCount,
    isLoading,
    error,
    fetchConversations,
    fetchUnreadCount,
    markConversationAsRead,
    markConversationFromUserAsRead,
    refreshConversations,
  };
}
