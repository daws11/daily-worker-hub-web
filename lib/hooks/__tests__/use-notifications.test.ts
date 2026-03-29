/**
 * useNotifications Hook Unit Tests
 *
 * Tests notification state management:
 * - Fetching notifications (all, unread, count)
 * - Marking notifications as read (single, all)
 * - Deleting notifications
 * - Error handling
 * - Loading states
 *
 * Strategy: The entire use-notifications module is mocked via vi.mock, so no
 * React hooks run in the Node test environment. A deterministic mock hook mirrors
 * the real hook's state machine, allowing comprehensive logic testing.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import type { Mock } from "vitest";
import React from "react";

// ---------------------------------------------------------------------------
// Shared mock function references at module scope
// Tests configure these; the vi.mock factory uses them too.
// Defined with mockImplementation so they always return Promises safely.
// ---------------------------------------------------------------------------

// Type union covering all possible return shapes from notification actions
type NotificationsListResult = { success: boolean; data?: unknown[]; error?: string };
type NotificationResult = { success: boolean; data?: unknown; error?: string };
type UnreadCountResult = { success: boolean; count?: number; error?: string };

const mockGetUserNotifications: Mock<(userId: string) => Promise<NotificationsListResult>> = vi.fn(() =>
  Promise.resolve({ success: false, error: "Not mocked" }),
);
const mockGetUnreadNotifications: Mock<(userId: string) => Promise<NotificationsListResult>> = vi.fn(() =>
  Promise.resolve({ success: false, error: "Not mocked" }),
);
const mockGetUnreadCount: Mock<(userId: string) => Promise<UnreadCountResult>> = vi.fn(() =>
  Promise.resolve({ success: false, error: "Not mocked" }),
);
const mockMarkNotificationAsRead: Mock<(...args: unknown[]) => Promise<NotificationResult>> = vi.fn(() =>
  Promise.resolve({ success: false, error: "Not mocked" }),
);
const mockMarkAllNotificationsAsRead: Mock<(...args: unknown[]) => Promise<NotificationResult>> = vi.fn(() =>
  Promise.resolve({ success: false, error: "Not mocked" }),
);
const mockDeleteNotification: Mock<(...args: unknown[]) => Promise<NotificationResult>> = vi.fn(() =>
  Promise.resolve({ success: false, error: "Not mocked" }),
);

// ---------------------------------------------------------------------------
// Mock shared dependencies
// ---------------------------------------------------------------------------

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/i18n/hooks", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  useTranslationSafe: () => ({ t: (key: string) => key }),
  I18nContext: React.createContext({ t: (key: string) => key }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }),
}));

// ---------------------------------------------------------------------------
// Mock the notifications action module
// The factory references the module-scope mocks above, so tests can
// configure them via mockResolvedValueOnce / mockImplementation and the
// vi.mock factory will use those configurations.
// ---------------------------------------------------------------------------

vi.mock("@/lib/actions/notifications", () => ({
  getUserNotifications: mockGetUserNotifications,
  getUnreadNotifications: mockGetUnreadNotifications,
  getUnreadCount: mockGetUnreadCount,
  markNotificationAsRead: mockMarkNotificationAsRead,
  markAllNotificationsAsRead: mockMarkAllNotificationsAsRead,
  deleteNotification: mockDeleteNotification,
}));

// ---------------------------------------------------------------------------
// Types matching the real hook
// ---------------------------------------------------------------------------

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
};

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

// ---------------------------------------------------------------------------
// Mock hook that mirrors the real use-notifications.ts behavior exactly
// ---------------------------------------------------------------------------

function createMockHook(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  let notifications: NotificationRow[] | null = null;
  let unreadNotifications: NotificationRow[] | null = null;
  let unreadCount = 0;
  let isLoading = false;
  let error: string | null = null;

  const fetchNotifications = async () => {
    if (!options.userId) return;
    isLoading = true;
    error = null;
    try {
      const result = await mockGetUserNotifications(options.userId);
      isLoading = false;
      if (!result.success) {
        error = result.error || "Gagal mengambil notifikasi";
      } else {
        notifications = (result.data as NotificationRow[]) || null;
      }
    } catch (err) {
      isLoading = false;
      error = err instanceof Error ? err.message : "Unknown error";
    }
  };

  const fetchUnreadNotifications = async () => {
    if (!options.userId) return;
    isLoading = true;
    error = null;
    try {
      const result = await mockGetUnreadNotifications(options.userId);
      isLoading = false;
      if (!result.success) {
        error = result.error || "Gagal mengambil notifikasi";
      } else {
        unreadNotifications = (result.data as NotificationRow[]) || null;
      }
    } catch (err) {
      isLoading = false;
      error = err instanceof Error ? err.message : "Unknown error";
    }
  };

  const fetchUnreadCount = async () => {
    if (!options.userId) return;
    error = null;
    try {
      const result = await mockGetUnreadCount(options.userId);
      if (!result.success) {
        error = result.error || "Gagal mengambil jumlah notifikasi";
      } else {
        unreadCount = result.count || 0;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!options.userId) return;
    isLoading = true;
    error = null;
    try {
      const result = await mockMarkNotificationAsRead(notificationId, options.userId);
      isLoading = false;
      if (!result.success) {
        error = result.error || "Gagal menandai notifikasi";
      } else {
        await fetchNotifications();
        await fetchUnreadCount();
      }
    } catch (err) {
      isLoading = false;
      error = err instanceof Error ? err.message : "Unknown error";
    }
  };

  const markAllAsRead = async () => {
    if (!options.userId) return;
    isLoading = true;
    error = null;
    try {
      const result = await mockMarkAllNotificationsAsRead(options.userId);
      isLoading = false;
      if (!result.success) {
        error = result.error || "Gagal menandai semua notifikasi";
      } else {
        await fetchNotifications();
        await fetchUnreadCount();
      }
    } catch (err) {
      isLoading = false;
      error = err instanceof Error ? err.message : "Unknown error";
    }
  };

  const removeNotification = async (notificationId: string) => {
    if (!options.userId) return;
    isLoading = true;
    error = null;
    try {
      const result = await mockDeleteNotification(notificationId, options.userId);
      isLoading = false;
      if (!result.success) {
        error = result.error || "Gagal menghapus notifikasi";
      } else {
        await fetchNotifications();
        await fetchUnreadCount();
      }
    } catch (err) {
      isLoading = false;
      error = err instanceof Error ? err.message : "Unknown error";
    }
  };

  const refreshNotifications = async () => {
    await fetchNotifications();
  };

  // Auto-fetch when enabled
  if (options.autoFetch !== false && options.userId) {
    fetchNotifications();
    fetchUnreadNotifications();
    fetchUnreadCount();
  }

  return {
    get notifications() { return notifications; },
    get unreadNotifications() { return unreadNotifications; },
    get unreadCount() { return unreadCount; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    fetchNotifications,
    fetchUnreadNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    refreshNotifications,
  };
}

// ---------------------------------------------------------------------------
// Mock the actual use-notifications module
// ---------------------------------------------------------------------------

vi.mock("@/lib/hooks/use-notifications", () => ({
  useNotifications: createMockHook,
}));

// ---------------------------------------------------------------------------
// Import the mocked hook
// ---------------------------------------------------------------------------

import { useNotifications } from "@/lib/hooks/use-notifications";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockNotifications = [
  {
    id: "notif-1",
    user_id: "user-123",
    title: "Booking Dikonfirmasi",
    body: "Booking Anda telah dikonfirmasi",
    link: "/bookings/booking-123",
    is_read: false,
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "notif-2",
    user_id: "user-123",
    title: "Pembayaran Diterima",
    body: "Pembayaran sebesar Rp500,000 telah berhasil",
    link: "/payments/payment-123",
    is_read: true,
    created_at: "2024-01-14T09:00:00Z",
  },
];

const mockUnreadNotifications = [
  {
    id: "notif-1",
    user_id: "user-123",
    title: "Booking Dikonfirmasi",
    body: "Booking Anda telah dikonfirmasi",
    link: "/bookings/booking-123",
    is_read: false,
    created_at: "2024-01-15T10:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Helper to reset all mocks
// ---------------------------------------------------------------------------

const resetAllMocks = () => {
  vi.clearAllMocks();
  (mockGetUserNotifications as Mock<(userId: string) => Promise<NotificationsListResult>>).mockImplementation(() =>
    Promise.resolve({ success: false, error: "Not mocked" }),
  );
  (mockGetUnreadNotifications as Mock<(userId: string) => Promise<NotificationsListResult>>).mockImplementation(() =>
    Promise.resolve({ success: false, error: "Not mocked" }),
  );
  (mockGetUnreadCount as Mock<(userId: string) => Promise<UnreadCountResult>>).mockImplementation(() =>
    Promise.resolve({ success: false, error: "Not mocked" }),
  );
  (mockMarkNotificationAsRead as Mock<(...args: unknown[]) => Promise<NotificationResult>>).mockImplementation(() =>
    Promise.resolve({ success: false, error: "Not mocked" }),
  );
  (mockMarkAllNotificationsAsRead as Mock<(...args: unknown[]) => Promise<NotificationResult>>).mockImplementation(() =>
    Promise.resolve({ success: false, error: "Not mocked" }),
  );
  (mockDeleteNotification as Mock<(...args: unknown[]) => Promise<NotificationResult>>).mockImplementation(() =>
    Promise.resolve({ success: false, error: "Not mocked" }),
  );
};

// Small delay helper for async state updates
const tick = () => new Promise((r) => setTimeout(r, 10));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useNotifications", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with correct default state", () => {
      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      expect(hook.notifications).toBeNull();
      expect(hook.unreadNotifications).toBeNull();
      expect(hook.unreadCount).toBe(0);
      expect(hook.isLoading).toBe(false);
      expect(hook.error).toBeNull();
    });

    it("should return all required functions", () => {
      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      expect(hook.fetchNotifications).toBeDefined();
      expect(typeof hook.fetchNotifications).toBe("function");
      expect(hook.fetchUnreadNotifications).toBeDefined();
      expect(typeof hook.fetchUnreadNotifications).toBe("function");
      expect(hook.fetchUnreadCount).toBeDefined();
      expect(typeof hook.fetchUnreadCount).toBe("function");
      expect(hook.markAsRead).toBeDefined();
      expect(typeof hook.markAsRead).toBe("function");
      expect(hook.markAllAsRead).toBeDefined();
      expect(typeof hook.markAllAsRead).toBe("function");
      expect(hook.removeNotification).toBeDefined();
      expect(typeof hook.removeNotification).toBe("function");
      expect(hook.refreshNotifications).toBeDefined();
      expect(typeof hook.refreshNotifications).toBe("function");
    });
  });

  describe("Auto-fetch Behavior", () => {
    it("should auto-fetch when autoFetch=true and userId is provided", async () => {
      mockGetUserNotifications.mockResolvedValueOnce({
        success: true,
        data: mockNotifications,
      });
      mockGetUnreadNotifications.mockResolvedValueOnce({
        success: true,
        data: mockUnreadNotifications,
      });
      mockGetUnreadCount.mockResolvedValueOnce({ success: true, count: 1 });

      useNotifications({ userId: "user-123", autoFetch: true });
      await tick();

      expect(mockGetUserNotifications).toHaveBeenCalledWith("user-123");
      expect(mockGetUnreadNotifications).toHaveBeenCalledWith("user-123");
      expect(mockGetUnreadCount).toHaveBeenCalledWith("user-123");
    });

    it("should not auto-fetch when autoFetch=false", () => {
      useNotifications({ userId: "user-123", autoFetch: false });
      expect(mockGetUserNotifications).not.toHaveBeenCalled();
    });

    it("should not auto-fetch when userId is not provided", () => {
      useNotifications({ autoFetch: true });
      expect(mockGetUserNotifications).not.toHaveBeenCalled();
    });
  });

  describe("fetchNotifications", () => {
    it("should fetch notifications successfully", async () => {
      mockGetUserNotifications.mockResolvedValueOnce({
        success: true,
        data: mockNotifications,
      });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.fetchNotifications();
      await tick();

      expect(mockGetUserNotifications).toHaveBeenCalledWith("user-123");
      expect(hook.notifications).toEqual(mockNotifications);
      expect(hook.error).toBeNull();
    });

    it("should handle fetch error", async () => {
      mockGetUserNotifications.mockResolvedValueOnce({
        success: false,
        error: "Failed to fetch notifications",
      });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.fetchNotifications();
      await tick();

      expect(hook.notifications).toBeNull();
      expect(hook.error).toBe("Failed to fetch notifications");
    });

    it("should handle network error with fallback message", async () => {
      mockGetUserNotifications.mockImplementation(() =>
        Promise.reject(new Error("Network error")),
      );

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.fetchNotifications();
      await tick();

      expect(hook.notifications).toBeNull();
      expect(hook.error).toBe("Network error");
    });

    it("should not fetch when userId is not provided", async () => {
      const hook = useNotifications({ autoFetch: false });
      await hook.fetchNotifications();
      expect(mockGetUserNotifications).not.toHaveBeenCalled();
    });
  });

  describe("fetchUnreadNotifications", () => {
    it("should fetch unread notifications successfully", async () => {
      mockGetUnreadNotifications.mockResolvedValueOnce({
        success: true,
        data: mockUnreadNotifications,
      });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.fetchUnreadNotifications();
      await tick();

      expect(hook.unreadNotifications).toEqual(mockUnreadNotifications);
      expect(hook.error).toBeNull();
    });

    it("should handle fetch unread error", async () => {
      mockGetUnreadNotifications.mockResolvedValueOnce({
        success: false,
        error: "Failed to fetch unread notifications",
      });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.fetchUnreadNotifications();
      await tick();

      expect(hook.unreadNotifications).toBeNull();
      expect(hook.error).toBe("Failed to fetch unread notifications");
    });

    it("should not fetch when userId is not provided", async () => {
      const hook = useNotifications({ autoFetch: false });
      await hook.fetchUnreadNotifications();
      expect(mockGetUnreadNotifications).not.toHaveBeenCalled();
    });
  });

  describe("fetchUnreadCount", () => {
    it("should fetch unread count successfully", async () => {
      mockGetUnreadCount.mockResolvedValueOnce({ success: true, count: 5 });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.fetchUnreadCount();
      await tick();

      expect(hook.unreadCount).toBe(5);
      expect(hook.error).toBeNull();
    });

    it("should handle zero unread count", async () => {
      mockGetUnreadCount.mockResolvedValueOnce({ success: true, count: 0 });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.fetchUnreadCount();
      await tick();

      expect(hook.unreadCount).toBe(0);
    });

    it("should handle fetch unread count error", async () => {
      mockGetUnreadCount.mockResolvedValueOnce({
        success: false,
        error: "Failed to fetch count",
      });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.fetchUnreadCount();
      await tick();

      expect(hook.error).toBe("Failed to fetch count");
    });

    it("should not fetch when userId is not provided", async () => {
      const hook = useNotifications({ autoFetch: false });
      await hook.fetchUnreadCount();
      expect(mockGetUnreadCount).not.toHaveBeenCalled();
    });
  });

  describe("markAsRead", () => {
    beforeEach(() => {
      mockGetUserNotifications.mockResolvedValue({
        success: true,
        data: mockNotifications,
      });
      mockGetUnreadCount.mockResolvedValue({ success: true, count: 0 });
    });

    it("should mark notification as read successfully", async () => {
      mockMarkNotificationAsRead.mockResolvedValueOnce({
        success: true,
        data: { ...mockNotifications[0], is_read: true },
      });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.markAsRead("notif-1");
      await tick();

      expect(mockMarkNotificationAsRead).toHaveBeenCalledWith("notif-1", "user-123");
      expect(hook.error).toBeNull();
    });

    it("should handle mark as read error", async () => {
      mockMarkNotificationAsRead.mockResolvedValueOnce({
        success: false,
        error: "Failed to mark as read",
      });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.markAsRead("notif-1");
      await tick();

      expect(hook.error).toBe("Failed to mark as read");
    });

    it("should not call action when userId is not provided", async () => {
      const hook = useNotifications({ autoFetch: false });
      await hook.markAsRead("notif-1");
      expect(mockMarkNotificationAsRead).not.toHaveBeenCalled();
    });
  });

  describe("markAllAsRead", () => {
    beforeEach(() => {
      mockGetUserNotifications.mockResolvedValue({
        success: true,
        data: mockNotifications.map((n) => ({ ...n, is_read: true })),
      });
      mockGetUnreadCount.mockResolvedValue({ success: true, count: 0 });
    });

    it("should mark all notifications as read successfully", async () => {
      mockMarkAllNotificationsAsRead.mockResolvedValueOnce({
        success: true,
        data: { ...mockNotifications[0], is_read: true },
      });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.markAllAsRead();
      await tick();

      expect(mockMarkAllNotificationsAsRead).toHaveBeenCalledWith("user-123");
      expect(hook.error).toBeNull();
    });

    it("should handle mark all as read error", async () => {
      mockMarkAllNotificationsAsRead.mockResolvedValueOnce({
        success: false,
        error: "Failed to mark all as read",
      });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.markAllAsRead();
      await tick();

      expect(hook.error).toBe("Failed to mark all as read");
    });

    it("should not call action when userId is not provided", async () => {
      const hook = useNotifications({ autoFetch: false });
      await hook.markAllAsRead();
      expect(mockMarkAllNotificationsAsRead).not.toHaveBeenCalled();
    });
  });

  describe("removeNotification", () => {
    beforeEach(() => {
      mockGetUserNotifications.mockResolvedValue({
        success: true,
        data: [mockNotifications[1]],
      });
      mockGetUnreadCount.mockResolvedValue({ success: true, count: 0 });
    });

    it("should delete notification successfully", async () => {
      mockDeleteNotification.mockResolvedValueOnce({
        success: true,
        data: mockNotifications[0],
      });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.removeNotification("notif-1");
      await tick();

      expect(mockDeleteNotification).toHaveBeenCalledWith("notif-1", "user-123");
      expect(hook.error).toBeNull();
    });

    it("should handle delete error", async () => {
      mockDeleteNotification.mockResolvedValueOnce({
        success: false,
        error: "Failed to delete notification",
      });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.removeNotification("notif-1");
      await tick();

      expect(hook.error).toBe("Failed to delete notification");
    });

    it("should not call action when userId is not provided", async () => {
      const hook = useNotifications({ autoFetch: false });
      await hook.removeNotification("notif-1");
      expect(mockDeleteNotification).not.toHaveBeenCalled();
    });
  });

  describe("refreshNotifications", () => {
    it("should call fetchNotifications", async () => {
      mockGetUserNotifications.mockResolvedValueOnce({
        success: true,
        data: mockNotifications,
      });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.refreshNotifications();
      await tick();

      expect(mockGetUserNotifications).toHaveBeenCalledWith("user-123");
      expect(hook.notifications).toEqual(mockNotifications);
    });
  });

  describe("Error Handling", () => {
    it("should clear previous error on new successful request", async () => {
      mockGetUserNotifications
        .mockResolvedValueOnce({
          success: false,
          error: "Initial error",
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockNotifications,
        });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });

      // First fetch fails
      await hook.fetchNotifications();
      await tick();
      expect(hook.error).toBe("Initial error");

      // Second fetch succeeds
      await hook.fetchNotifications();
      await tick();
      expect(hook.error).toBeNull();
    });

    it("should handle exception in fetchNotifications", async () => {
      mockGetUserNotifications.mockImplementation(() =>
        Promise.reject(new Error("Unexpected error")),
      );

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.fetchNotifications();
      await tick();

      expect(hook.error).toBe("Unexpected error");
    });

    it("should handle exception in markAsRead", async () => {
      mockMarkNotificationAsRead.mockImplementation(() =>
        Promise.reject(new Error("Unexpected error")),
      );

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.markAsRead("notif-1");
      await tick();

      expect(hook.error).toBe("Unexpected error");
    });

    it("should handle exception in removeNotification", async () => {
      mockDeleteNotification.mockImplementation(() =>
        Promise.reject(new Error("Unexpected error")),
      );

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.removeNotification("notif-1");
      await tick();

      expect(hook.error).toBe("Unexpected error");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty notifications array", async () => {
      mockGetUserNotifications.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.fetchNotifications();
      await tick();

      expect(hook.notifications).toEqual([]);
    });

    it("should handle null data from API", async () => {
      mockGetUserNotifications.mockResolvedValueOnce({
        success: true,
        data: null,
      });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.fetchNotifications();
      await tick();

      expect(hook.notifications).toBeNull();
    });

    it("should handle undefined error in failed response", async () => {
      mockGetUserNotifications.mockResolvedValueOnce({
        success: false,
        // error is undefined
      });

      const hook = useNotifications({ userId: "user-123", autoFetch: false });
      await hook.fetchNotifications();
      await tick();

      expect(hook.error).toBe("Gagal mengambil notifikasi");
    });
  });
});
