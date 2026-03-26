"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  getFirebaseMessaging,
  isFirebaseClientConfigured,
} from "@/lib/firebase-client";
import {
  onMessage,
  MessagePayload,
  Messaging,
} from "firebase/messaging";

type NotificationPermission = "granted" | "denied" | "default";

type UseChatNotificationsOptions = {
  /**
   * Current user ID - used to avoid showing notifications for own messages
   */
  currentUserId?: string;
  /**
   * Enable/disable chat notifications (default: true)
   */
  enabled?: boolean;
  /**
   * Whether to show sonner toast for incoming chat messages (default: true)
   */
  showToast?: boolean;
  /**
   * Whether to trigger browser Notification API (default: true)
   */
  showBrowserNotification?: boolean;
  /**
   * Callback fired when a chat notification is received
   */
  onNotificationReceived?: (notification: ChatNotification) => void;
};

type UseChatNotificationsReturn = {
  /**
   * Whether the hook is initialized and listening for messages
   */
  isActive: boolean;
  /**
   * Current notification permission status
   */
  permission: NotificationPermission;
  /**
   * Whether Firebase is supported in this browser
   */
  isSupported: boolean;
  /**
   * Any error that occurred during initialization
   */
  error: string | null;
  /**
   * Manually enable the notification listener
   */
  enable: () => void;
  /**
   * Manually disable the notification listener
   */
  disable: () => void;
};

export type ChatNotification = {
  type: "new_message";
  senderId: string;
  senderName: string;
  senderRole: string;
  bookingId: string;
  conversationId: string;
  messageId: string;
  messagePreview: string;
  timestamp: string;
};

/**
 * Hook for handling FCM foreground messages as chat notifications
 *
 * This hook subscribes to Firebase Cloud Messaging foreground messages
 * and displays them as sonner toasts and browser notifications for
 * new_message type payloads.
 *
 * It should be initialized once in the app layout and will handle
 * all incoming FCM messages globally.
 *
 * @param options - Chat notification options
 * @param options.currentUserId - Current user ID to avoid self-notifications
 * @param options.enabled - Enable/disable notifications (default: true)
 * @param options.showToast - Show sonner toast (default: true)
 * @param options.showBrowserNotification - Show browser notification (default: true)
 * @param options.onNotificationReceived - Callback for incoming notifications
 *
 * @returns Chat notification state and control functions
 *
 * @example
 * ```tsx
 * // In a provider or layout component
 * function ChatNotificationProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
 *   const { isActive, permission, error, enable, disable } = useChatNotifications({
 *     currentUserId: userId,
 *     enabled: true,
 *     showToast: true,
 *     showBrowserNotification: true,
 *   })
 *
 *   return <>{children}</>
 * }
 * ```
 */
export function useChatNotifications(
  options: UseChatNotificationsOptions = {},
): UseChatNotificationsReturn {
  const {
    currentUserId,
    enabled = true,
    showToast = true,
    showBrowserNotification = true,
    onNotificationReceived,
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagingRef = useRef<Messaging | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const initializationRef = useRef(false);

  /**
   * Parse FCM payload into ChatNotification
   */
  const parseNotification = useCallback(
    (payload: MessagePayload): ChatNotification | null => {
      const data = payload.data;

      if (!data) return null;

      const type = data.type as string | undefined;
      if (type !== "new_message") return null;

      const senderId = data.sender_id as string | undefined;
      const senderName = data.sender_name as string | undefined;
      const senderRole = data.sender_role as string | undefined;
      const bookingId = data.booking_id as string | undefined;
      const conversationId = data.conversation_id as string | undefined;
      const messageId = data.message_id as string | undefined;
      const messagePreview = data.message_preview as string | undefined;
      const timestamp = data.timestamp as string | undefined;

      if (!senderId || !bookingId) return null;

      return {
        type: "new_message",
        senderId,
        senderName: senderName || "Someone",
        senderRole: senderRole || "user",
        bookingId,
        conversationId: conversationId || "",
        messageId: messageId || "",
        messagePreview: messagePreview || "",
        timestamp: timestamp || new Date().toISOString(),
      };
    },
    [],
  );

  /**
   * Show sonner toast for a chat notification
   */
  const showChatToast = useCallback(
    (notification: ChatNotification) => {
      if (!showToast) return;

      const roleLabel =
        notification.senderRole === "business"
          ? "Bisnis"
          : notification.senderRole === "worker"
            ? "Pekerja"
            : "";

      const displayName = notification.senderName || "Someone";

      toast(displayName, {
        description: `${roleLabel ? `${roleLabel} · ` : ""}${notification.messagePreview}`,
        action: {
          label: "Buka",
          onClick: () => {
            if (notification.conversationId) {
              window.location.href = `/${notification.senderRole === "business" ? "business" : "worker"}/messages/${notification.bookingId}`;
            }
          },
        },
        duration: 5000,
      });
    },
    [showToast],
  );

  /**
   * Show browser Notification for a chat notification
   */
  const showBrowserNotificationAlert = useCallback(
    (notification: ChatNotification) => {
      if (!showBrowserNotification) return;
      if (Notification.permission !== "granted") return;

      try {
        const roleLabel =
          notification.senderRole === "business"
            ? "Bisnis"
            : notification.senderRole === "worker"
              ? "Pekerja"
              : "";

        const displayName = notification.senderName || "Someone";

        new Notification(
          roleLabel ? `${displayName} (${roleLabel})` : displayName,
          {
            body: notification.messagePreview || "Pesan baru",
            icon: "/icon-192x192.png",
            tag: `chat-${notification.conversationId || notification.bookingId}`,
            data: {
              type: "new_message",
              conversationId: notification.conversationId,
              bookingId: notification.bookingId,
            },
          },
        );
      } catch (err) {
        // Silently ignore notification errors
      }
    },
    [showBrowserNotification],
  );

  /**
   * Handle incoming FCM message
   */
  const handleMessage = useCallback(
    (payload: MessagePayload) => {
      // Parse notification from payload
      const notification = parseNotification(payload);
      if (!notification) return;

      // Skip notification for own messages
      if (currentUserId && notification.senderId === currentUserId) return;

      // Show sonner toast
      showChatToast(notification);

      // Show browser notification
      showBrowserNotificationAlert(notification);

      // Fire callback
      onNotificationReceived?.(notification);
    },
    [
      currentUserId,
      parseNotification,
      showChatToast,
      showBrowserNotificationAlert,
      onNotificationReceived,
    ],
  );

  /**
   * Check if FCM is supported and initialize messaging
   */
  const checkSupport = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;

    const configured = isFirebaseClientConfigured();
    if (!configured) {
      setError("Firebase tidak dikonfigurasi");
      return false;
    }

    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        setError("Firebase Messaging tidak didukung di browser ini");
        return false;
      }

      messagingRef.current = messaging;
      setIsSupported(true);
      return true;
    } catch (err) {
      setError("Gagal menginisialisasi Firebase Messaging");
      return false;
    }
  }, []);

  /**
   * Subscribe to FCM foreground messages
   */
  const subscribe = useCallback(async () => {
    if (!enabled) return;

    const supported = await checkSupport();
    if (!supported) return;

    const messaging = messagingRef.current;
    if (!messaging) return;

    // Check current permission
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }

    // Unsubscribe from previous listener if any
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Subscribe to foreground messages
    unsubscribeRef.current = onMessage(messaging, (payload) => {
      handleMessage(payload);
    });

    setIsActive(true);
    setError(null);
  }, [enabled, checkSupport, handleMessage]);

  /**
   * Unsubscribe from FCM foreground messages
   */
  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    setIsActive(false);
  }, []);

  /**
   * Enable chat notifications
   */
  const enable = useCallback(() => {
    if (!isActive) {
      subscribe();
    }
  }, [isActive, subscribe]);

  /**
   * Disable chat notifications
   */
  const disable = useCallback(() => {
    unsubscribe();
  }, [unsubscribe]);

  /**
   * Initialize chat notifications
   */
  const initialize = useCallback(async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    await subscribe();
  }, [subscribe]);

  // Initialize on mount
  useEffect(() => {
    if (enabled) {
      initialize();
    }

    return () => {
      unsubscribe();
      initializationRef.current = false;
    };
  }, [enabled, initialize, unsubscribe]);

  return {
    isActive,
    permission,
    isSupported,
    error,
    enable,
    disable,
  };
}

/**
 * Provider component for chat notifications
 *
 * Wraps useChatNotifications in a client component for use in layouts.
 *
 * @param props - Component props
 * @param props.children - Child components
 * @param props.currentUserId - Current user ID
 * @param props.enabled - Enable/disable notifications
 */
export function ChatNotificationProvider({
  children,
  currentUserId,
  enabled = true,
}: {
  children: React.ReactNode;
  currentUserId?: string;
  enabled?: boolean;
}) {
  useChatNotifications({
    currentUserId,
    enabled,
    showToast: true,
    showBrowserNotification: true,
  });

  return <>{children}</>;
}
