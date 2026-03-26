"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Messaging, MessagePayload } from "firebase/messaging";
import {
  getFirebaseMessaging,
  getVapidKey,
  isFirebaseClientConfigured,
} from "@/lib/firebase-client-lazy";

type NotificationPermission = "granted" | "denied" | "default";

type DeviceType = "web" | "android" | "ios";

type UseFcmNotificationsOptions = {
  userId: string;
  enabled?: boolean;
  autoRegister?: boolean;
  deviceType?: DeviceType;
  onMessageReceived?: (payload: MessagePayload) => void;
};

type UseFcmNotificationsReturn = {
  permission: NotificationPermission;
  isSupported: boolean;
  isRegistered: boolean;
  isLoading: boolean;
  token: string | null;
  error: string | null;
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  requestPermission: () => Promise<void>;
};

/**
 * Hook for managing FCM push notifications in React components
 *
 * This hook handles the complete flow for FCM push notifications:
 * - Checking browser support
 * - Requesting notification permission
 * - Registering FCM token
 * - Listening for foreground messages
 * - Managing token lifecycle
 *
 * @param options - FCM notification options
 * @param options.userId - User ID for registering token
 * @param options.enabled - Enable/disable push notifications (default: true)
 * @param options.autoRegister - Automatically register on mount if permission granted (default: false)
 * @param options.deviceType - Device type: 'web', 'android', 'ios' (default: 'web')
 * @param options.onMessageReceived - Callback for foreground messages
 *
 * @returns FCM notification state and control functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { permission, isRegistered, register, unregister } = useFcmNotifications({
 *     userId: 'user-123',
 *     autoRegister: true,
 *     onMessageReceived: (payload) => {
 *       console.log('Message received:', payload)
 *     }
 *   })
 *
 *   return (
 *     <div>
 *       <p>Permission: {permission}</p>
 *       <p>Registered: {isRegistered ? 'Yes' : 'No'}</p>
 *       <button onClick={register}>Register</button>
 *       <button onClick={unregister}>Unregister</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useFcmNotifications(
  options: UseFcmNotificationsOptions,
): UseFcmNotificationsReturn {
  const {
    userId,
    enabled = true,
    autoRegister = false,
    deviceType = "web",
    onMessageReceived,
  } = options;

  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagingRef = useRef<Messaging | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const tokenUnsubscribeRef = useRef<(() => void) | null>(null);
  const initializationRef = useRef(false);

  /**
   * Check if FCM is supported in the browser
   */
  const checkSupport = useCallback(async () => {
    if (typeof window === "undefined") return false;

    const isConfigured = isFirebaseClientConfigured();
    if (!isConfigured) {
      setError("Firebase tidak dikonfigurasi");
      return false;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      setError("FCM tidak didukung di browser ini");
      return false;
    }

    messagingRef.current = messaging;
    setIsSupported(true);
    return true;
  }, []);

  /**
   * Register FCM token with the backend
   */
  const registerTokenWithBackend = useCallback(
    async (fcmToken: string) => {
      if (!userId) {
        setError("User ID diperlukan");
        return false;
      }

      try {
        const response = await fetch("/api/notifications/register-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: fcmToken,
            deviceType,
            deviceId: getDeviceId(),
            deviceName: getDeviceName(),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Gagal mendaftarkan token");
          return false;
        }

        return true;
      } catch (err) {
        setError("Gagal mendaftarkan token");
        return false;
      }
    },
    [userId, deviceType],
  );

  /**
   * Unregister FCM token from the backend
   */
  const unregisterTokenFromBackend = useCallback(async (fcmToken: string) => {
    try {
      await fetch(
        `/api/notifications/token?token=${encodeURIComponent(fcmToken)}`,
        {
          method: "DELETE",
        },
      );
    } catch (err) {
      console.error("Failed to unregister token:", err);
    }
  }, []);

  /**
   * Request notification permission from the user
   */
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      setError("Notifikasi tidak didukung di browser ini");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "denied") {
        setError(
          "Izin notifikasi ditolak. Silakan aktifkan di pengaturan browser.",
        );
      } else if (result === "default") {
        setError("Izin notifikasi belum diberikan");
      }
    } catch (err) {
      setError("Gagal meminta izin notifikasi");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register for FCM notifications
   */
  const register = useCallback(async () => {
    if (!enabled) return;

    const supported = await checkSupport();
    if (!supported) return;

    if (!userId) {
      setError("User ID diperlukan");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check/request permission
      const currentPermission = Notification.permission;
      setPermission(currentPermission);

      if (currentPermission === "denied") {
        setError(
          "Izin notifikasi ditolak. Silakan aktifkan di pengaturan browser.",
        );
        setIsLoading(false);
        return;
      }

      if (currentPermission === "default") {
        await requestPermission();
        const newPermission = Notification.permission;
        if (newPermission !== "granted") {
          setIsLoading(false);
          return;
        }
        setPermission(newPermission);
      }

      // Get VAPID key
      const vapidKey = getVapidKey();
      if (!vapidKey) {
        setError("Kunci VAPID tidak dikonfigurasi");
        setIsLoading(false);
        return;
      }

      // Get FCM token
      const messaging = messagingRef.current;
      if (!messaging) {
        setError("Messaging tidak tersedia");
        setIsLoading(false);
        return;
      }

      const { getToken: firebaseGetToken } = await import("firebase/messaging");
      const fcmToken = await firebaseGetToken(messaging, { vapidKey });

      if (!fcmToken) {
        setError("Gagal mendapatkan token FCM");
        setIsLoading(false);
        return;
      }

      // Register with backend
      const registered = await registerTokenWithBackend(fcmToken);
      if (!registered) {
        setIsLoading(false);
        return;
      }

      setToken(fcmToken);
      setIsRegistered(true);
      setError(null);

      // Note: onTokenRefresh is deprecated in newer Firebase SDK
      // Token refresh is now handled automatically by the SDK
      // tokenUnsubscribeRef.current = onTokenRefresh(messaging, async () => {
      //   try {
      //     const newToken = await getToken(messaging, { vapidKey });
      //     if (newToken) {
      //       await registerTokenWithBackend(newToken);
      //       setToken(newToken);
      //     }
      //   } catch (err) {
      //     console.error("Token refresh failed:", err);
      //   }
      // });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mendaftarkan notifikasi",
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    enabled,
    userId,
    checkSupport,
    requestPermission,
    registerTokenWithBackend,
  ]);

  /**
   * Unregister from FCM notifications
   */
  const unregister = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (token) {
        // Unregister from backend
        await unregisterTokenFromBackend(token);

        // Delete token from FCM
        const messaging = messagingRef.current;
        if (messaging) {
          const { deleteToken: firebaseDeleteToken } = await import(
            "firebase/messaging"
          );
          await firebaseDeleteToken(messaging);
        }
      }

      // Cleanup listeners
      if (tokenUnsubscribeRef.current) {
        tokenUnsubscribeRef.current();
        tokenUnsubscribeRef.current = null;
      }

      setToken(null);
      setIsRegistered(false);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal berhenti berlangganan",
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, unregisterTokenFromBackend]);

  /**
   * Set up foreground message listener
   */
  const setupMessageListener = useCallback(async () => {
    const messaging = messagingRef.current;
    if (!messaging) return;

    const { onMessage: firebaseOnMessage } = await import("firebase/messaging");

    unsubscribeRef.current = firebaseOnMessage(messaging, (payload) => {
      // Call custom handler if provided
      if (onMessageReceived) {
        onMessageReceived(payload);
      }

      // Show notification if in foreground
      if (payload.notification) {
        const { title, body, image } = payload.notification;

        // Create and show notification
        if (Notification.permission === "granted") {
          new Notification(title || "Daily Worker Hub", {
            body,
            icon: image || "/icon-192x192.png",
            tag: payload.messageId,
            data: payload.data,
          });
        }
      }
    });
  }, [onMessageReceived]);

  /**
   * Initialize FCM notifications
   */
  const initialize = useCallback(async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    if (!enabled) return;

    const supported = await checkSupport();
    if (!supported) return;

    // Check current permission
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }

    // Set up message listener
    setupMessageListener();

    // Auto-register if enabled and permission granted
    if (autoRegister && Notification.permission === "granted") {
      await register();
    }
  }, [enabled, checkSupport, setupMessageListener, autoRegister, register]);

  // Initialize on mount
  useEffect(() => {
    initialize();

    return () => {
      // Cleanup
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (tokenUnsubscribeRef.current) {
        tokenUnsubscribeRef.current();
      }
      initializationRef.current = false;
    };
  }, [initialize]);

  return {
    permission,
    isSupported,
    isRegistered,
    isLoading,
    token,
    error,
    register,
    unregister,
    requestPermission,
  };
}

// Helper functions

/**
 * Get or create a unique device ID
 */
function getDeviceId(): string {
  if (typeof window === "undefined") return "";

  const storageKey = "dwh_device_id";
  let deviceId = localStorage.getItem(storageKey);

  if (!deviceId) {
    deviceId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(storageKey, deviceId);
  }

  return deviceId;
}

/**
 * Get a human-readable device name
 */
function getDeviceName(): string {
  if (typeof window === "undefined") return "Unknown";

  const ua = navigator.userAgent;

  // Detect browser
  let browser = "Unknown Browser";
  if (ua.includes("Chrome") && !ua.includes("Edg")) {
    browser = "Chrome";
  } else if (ua.includes("Firefox")) {
    browser = "Firefox";
  } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
    browser = "Safari";
  } else if (ua.includes("Edg")) {
    browser = "Edge";
  }

  // Detect OS
  let os = "Unknown OS";
  if (ua.includes("Windows")) {
    os = "Windows";
  } else if (ua.includes("Mac")) {
    os = "macOS";
  } else if (ua.includes("Linux")) {
    os = "Linux";
  } else if (ua.includes("Android")) {
    os = "Android";
  } else if (
    ua.includes("iOS") ||
    ua.includes("iPhone") ||
    ua.includes("iPad")
  ) {
    os = "iOS";
  }

  return `${browser} on ${os}`;
}

export default useFcmNotifications;
