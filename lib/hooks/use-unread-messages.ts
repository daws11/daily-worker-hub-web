"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/app/providers/auth-provider";
import { getUnreadCount } from "@/lib/supabase/queries/messages";

type UseUnreadMessagesOptions = {
  userId?: string;
  enabled?: boolean;
};

type UseUnreadMessagesReturn = {
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

/**
 * Hook to fetch and manage the unread message count for the current user.
 * Provides real-time updates via Supabase subscription for badge indicators
 * in the site header navigation.
 */
export function useUnreadMessages(
  options: UseUnreadMessagesOptions = {},
): UseUnreadMessagesReturn {
  const { userId, enabled = true } = options;
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const effectiveUserId = userId ?? user?.id;

  /**
   * Fetch the unread count from the database
   */
  const fetchUnreadCount = useCallback(async () => {
    if (!effectiveUserId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getUnreadCount(effectiveUserId);

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setUnreadCount(result.data?.total_unread || 0);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Terjadi kesalahan tak terduga";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUserId]);

  /**
   * Refetch unread count (exposed for manual refresh)
   */
  const refetch = useCallback(async () => {
    await fetchUnreadCount();
  }, [fetchUnreadCount]);

  /**
   * Set up Supabase real-time subscription for unread count updates
   */
  const setupRealtimeSubscription = useCallback(() => {
    if (!effectiveUserId || !enabled) return;

    // Clean up any existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`unread-messages-${effectiveUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${effectiveUserId}`,
        },
        async () => {
          // New message received - increment count
          setUnreadCount((prev) => prev + 1);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${effectiveUserId}`,
        },
        async (payload) => {
          // Message marked as read - refresh count
          const newVal = payload.new as { is_read?: boolean };
          if (newVal?.is_read === true) {
            // A message was marked as read - decrement count if there were unread
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        },
      )
      .subscribe();

    channelRef.current = channel;
  }, [effectiveUserId, enabled]);

  // Initial fetch and subscription setup
  useEffect(() => {
    if (!effectiveUserId || !enabled) {
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();
    setupRealtimeSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [effectiveUserId, enabled, fetchUnreadCount, setupRealtimeSubscription]);

  return {
    unreadCount,
    isLoading,
    error,
    refetch,
  };
}
