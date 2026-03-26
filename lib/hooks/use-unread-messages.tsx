"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { supabase } from "../supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type UseUnreadMessagesReturn = {
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

type UnreadMessagesContextType = UseUnreadMessagesReturn & {
  incrementUnread: () => void;
  decrementUnread: (amount?: number) => void;
};

const UnreadMessagesContext = createContext<UnreadMessagesContextType | undefined>(
  undefined,
);

type UseUnreadMessagesOptions = {
  userId?: string | null;
  enabled?: boolean;
};

/**
 * Hook to get global unread message count for a user
 *
 * @param options - Hook options
 * @param options.userId - Current user ID to fetch unread count for
 * @param options.enabled - Enable/disable the hook (default: true)
 *
 * @returns Unread message count and control functions
 */
export function useUnreadMessages(
  options: UseUnreadMessagesOptions = {},
): UseUnreadMessagesReturn {
  const { userId, enabled = true } = options;

  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { count, error: countError } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("is_read", false);

      if (countError) {
        console.error("Error fetching unread count:", countError);
        setError(countError.message);
        return;
      }

      setUnreadCount(count || 0);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Terjadi kesalahan tak terduga";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, enabled]);

  // Initial fetch
  useEffect(() => {
    if (enabled && userId) {
      fetchUnreadCount();
    } else if (!userId) {
      setUnreadCount(0);
    }
  }, [enabled, userId, fetchUnreadCount]);

  return {
    unreadCount,
    isLoading,
    error,
    refresh: fetchUnreadCount,
  };
}

/**
 * Context provider for global unread message count
 *
 * Provides unread count across the app and methods to update it.
 * Wraps the app in layout.tsx to enable global unread badge.
 *
 * @param props - Component props
 * @param props.children - Child components
 * @param props.userId - Current user ID
 */
export function UnreadMessagesProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId?: string | null;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isInitializedRef = useRef(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { count, error: countError } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("is_read", false);

      if (countError) {
        console.error("Error fetching unread count:", countError);
        setError(countError.message);
        return;
      }

      setUnreadCount(count || 0);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Terjadi kesalahan tak terduga";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Subscribe to realtime message changes
  const subscribeToMessages = useCallback(() => {
    if (!userId || !isInitializedRef.current) {
      return;
    }

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`unread-messages-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as { receiver_id: string; is_read: boolean };
          // Only increment if message is for this user and unread
          if (newMessage.receiver_id === userId && !newMessage.is_read) {
            setUnreadCount((prev) => prev + 1);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const updatedMessage = payload.new as { receiver_id: string; is_read: boolean };
          const oldMessage = payload.old as { is_read: boolean };
          // Handle read status changes
          if (updatedMessage.receiver_id === userId) {
            if (!oldMessage.is_read && updatedMessage.is_read) {
              // Message was marked as read
              setUnreadCount((prev) => Math.max(0, prev - 1));
            } else if (oldMessage.is_read && !updatedMessage.is_read) {
              // Message was marked as unread (edge case)
              setUnreadCount((prev) => prev + 1);
            }
          }
        },
      )
      .subscribe();

    channelRef.current = channel;
  }, [userId]);

  // Initial fetch and subscription setup
  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      isInitializedRef.current = false;
      return;
    }

    isInitializedRef.current = true;
    fetchUnreadCount();
    subscribeToMessages();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [userId, fetchUnreadCount, subscribeToMessages]);

  const incrementUnread = useCallback(() => {
    setUnreadCount((prev) => prev + 1);
  }, []);

  const decrementUnread = useCallback((amount = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - amount));
  }, []);

  const refresh = useCallback(async () => {
    await fetchUnreadCount();
  }, [fetchUnreadCount]);

  return (
    <UnreadMessagesContext.Provider
      value={{
        unreadCount,
        isLoading,
        error,
        refresh,
        incrementUnread,
        decrementUnread,
      }}
    >
      {children}
    </UnreadMessagesContext.Provider>
  );
}

/**
 * Hook to access global unread message context
 * Must be used within UnreadMessagesProvider
 */
export function useUnreadMessagesContext(): UnreadMessagesContextType {
  const context = useContext(UnreadMessagesContext);
  if (context === undefined) {
    throw new Error(
      "useUnreadMessagesContext must be used within UnreadMessagesProvider",
    );
  }
  return context;
}
