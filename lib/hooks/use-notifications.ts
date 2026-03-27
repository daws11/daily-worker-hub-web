"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  getUserNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../actions/notifications";
import type { Database } from "../supabase/types";
import { useTranslation } from "../i18n/hooks";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

type UseNotificationsOptions = {
  userId?: string;
  autoFetch?: boolean;
};

type UseNotificationsReturn = {
  notifications: NotificationRow[] | null;
  unreadNotifications: NotificationRow[] | null;
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  fetchUnreadNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
};

export function useNotifications(
  options: UseNotificationsOptions = {},
): UseNotificationsReturn {
  const { userId, autoFetch = true } = options;
  const { t } = useTranslation();

  const [notifications, setNotifications] = useState<NotificationRow[] | null>(
    null,
  );
  const [unreadNotifications, setUnreadNotifications] = useState<
    NotificationRow[] | null
  >(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getUserNotifications(userId);

      if (!result.success) {
        setError(result.error || "Gagal mengambil notifikasi");
        toast.error(
          t("notifications.fetchFailed", {
            message: result.error || "Unknown error",
          }),
        );
        return;
      }

      setNotifications(result.data || null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t("errors.generic");
      setError(errorMessage);
      toast.error(t("notifications.fetchFailed", { message: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const fetchUnreadNotifications = useCallback(async () => {
    if (!userId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getUnreadNotifications(userId);

      if (!result.success) {
        setError(result.error || "Gagal mengambil notifikasi");
        toast.error(
          t("notifications.fetchFailed", {
            message: result.error || "Unknown error",
          }),
        );
        return;
      }

      setUnreadNotifications(result.data || null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t("errors.generic");
      setError(errorMessage);
      toast.error(t("notifications.fetchFailed", { message: errorMessage }));
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

      if (!result.success) {
        setError(result.error || "Gagal mengambil jumlah notifikasi");
        toast.error(
          t("notifications.fetchUnreadCountFailed", {
            message: result.error || "Unknown error",
          }),
        );
        return;
      }

      setUnreadCount(result.count || 0);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t("errors.generic");
      setError(errorMessage);
      toast.error(
        t("notifications.fetchUnreadCountFailed", { message: errorMessage }),
      );
    }
  }, [userId]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!userId) {
        toast.error("User ID tidak ditemukan");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await markNotificationAsRead(notificationId, userId);

        if (!result.success) {
          setError(result.error || "Gagal menandai notifikasi");
          toast.error(
            t("notifications.markAsReadFailed", {
              message: result.error || "Unknown error",
            }),
          );
          return;
        }

        toast.success(t("notifications.markAsReadSuccess"));

        // Refresh notifications and unread count after marking as read
        await fetchNotifications();
        await fetchUnreadCount();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : t("errors.generic");
        setError(errorMessage);
        toast.error(
          t("notifications.markAsReadFailed", { message: errorMessage }),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [userId, fetchNotifications, fetchUnreadCount],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) {
      toast.error("User ID tidak ditemukan");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await markAllNotificationsAsRead(userId);

      if (!result.success) {
        setError(result.error || "Gagal menandai semua notifikasi");
        toast.error(
          t("notifications.markAllAsReadFailed", {
            message: result.error || "Unknown error",
          }),
        );
        return;
      }

      toast.success(t("notifications.markAllAsReadSuccess"));

      // Refresh notifications and unread count after marking all as read
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t("errors.generic");
      setError(errorMessage);
      toast.error(
        t("notifications.markAllAsReadFailed", { message: errorMessage }),
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId, fetchNotifications, fetchUnreadCount]);

  const removeNotification = useCallback(
    async (notificationId: string) => {
      if (!userId) {
        toast.error("User ID tidak ditemukan");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await deleteNotification(notificationId, userId);

        if (!result.success) {
          setError(result.error || "Gagal menghapus notifikasi");
          toast.error(
            t("notifications.deleteFailed", {
              message: result.error || "Unknown error",
            }),
          );
          return;
        }

        toast.success(t("notifications.deleteSuccess"));

        // Refresh notifications and unread count after deletion
        await fetchNotifications();
        await fetchUnreadCount();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : t("errors.generic");
        setError(errorMessage);
        toast.error(t("notifications.deleteFailed", { message: errorMessage }));
      } finally {
        setIsLoading(false);
      }
    },
    [userId, fetchNotifications, fetchUnreadCount],
  );

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  // Auto-fetch on mount and when options change
  useEffect(() => {
    if (autoFetch && userId) {
      fetchNotifications();
      fetchUnreadNotifications();
      fetchUnreadCount();
    }
  }, [autoFetch, userId, fetchNotifications, fetchUnreadNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadNotifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    fetchUnreadNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    refreshNotifications,
  };
}
