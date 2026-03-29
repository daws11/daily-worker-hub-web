"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { getUnreadCount } from "../supabase/queries/messages";
import { useAuth } from "../../app/providers/auth-provider";

type UseUnreadCountReturn = {
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchUnreadCount: () => Promise<void>;
};

/**
 * Hook to fetch and manage the unread message count for the current user.
 * Provides real-time unread count updates that can be used to display
 * badge indicators in the navigation.
 */
export function useUnreadCount(): UseUnreadCountReturn {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setError(null);

    try {
      const result = await getUnreadCount(user.id);

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
      toast.error("Gagal mengambil jumlah pesan belum dibaca: " + errorMessage);
    }
  }, [user?.id]);

  // Auto-fetch on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      fetchUnreadCount();
    } else {
      setUnreadCount(0);
    }
  }, [user?.id, fetchUnreadCount]);

  return {
    unreadCount,
    isLoading,
    error,
    fetchUnreadCount,
  };
}
