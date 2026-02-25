"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  subscribeToPushNotifications as subscribeToPushDB,
  unsubscribeByEndpoint,
} from "../actions/push-notifications"

type NotificationPermission = "granted" | "denied" | "default"

type UsePushNotificationsOptions = {
  userId: string
  enabled?: boolean
  autoSubscribe?: boolean
}

type UsePushNotificationsReturn = {
  permission: NotificationPermission
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  subscription: PushSubscription | null
  error: string | null
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
  requestPermission: () => Promise<void>
}

/**
 * Hook for managing push notification subscription in React components
 *
 * This hook handles the complete flow for setting up push notifications:
 * - Checking browser support
 * - Requesting notification permission
 * - Subscribing to push notifications via service worker
 * - Storing subscription in database
 * - Managing subscription state
 *
 * @param options - Push notification options
 * @param options.userId - User ID for storing subscription
 * @param options.enabled - Enable/disable push notifications (default: true)
 * @param options.autoSubscribe - Automatically subscribe on mount if permission granted (default: false)
 *
 * @returns Push notification state and control functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { permission, isSubscribed, subscribe, unsubscribe } = usePushNotifications({
 *     userId: 'user-123',
 *     autoSubscribe: true
 *   })
 *
 *   return (
 *     <div>
 *       <p>Permission: {permission}</p>
 *       <p>Subscribed: {isSubscribed ? 'Yes' : 'No'}</p>
 *       <button onClick={subscribe}>Subscribe</button>
 *       <button onClick={unsubscribe}>Unsubscribe</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function usePushNotifications(
  options: UsePushNotificationsOptions
): UsePushNotificationsReturn {
  const { userId, enabled = true, autoSubscribe = false } = options

  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [error, setError] = useState<string | null>(null)

  const initializationRef = useRef(false)

  /**
   * Check if push notifications are supported in the browser
   */
  const checkSupport = useCallback(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window

    setIsSupported(supported)

    if (!supported) {
      setError("Layanan notifikasi tidak didukung di browser ini")
    }

    return supported
  }, [])

  /**
   * Get the service worker registration
   */
  const getServiceWorkerRegistration = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!("serviceWorker" in navigator)) {
      return null
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      return registration
    } catch {
      return null
    }
  }, [])

  /**
   * Get current push subscription
   */
  const getPushSubscription = useCallback(async (): Promise<PushSubscription | null> => {
    const registration = await getServiceWorkerRegistration()
    if (!registration) {
      return null
    }

    try {
      const subscription = await registration.pushManager.getSubscription()
      return subscription
    } catch {
      return null
    }
  }, [getServiceWorkerRegistration])

  /**
   * Store push subscription in database
   */
  const storeSubscription = useCallback(
    async (sub: PushSubscription) => {
      if (!userId) {
        setError("User ID diperlukan untuk berlangganan notifikasi")
        return false
      }

      const subscriptionJson = sub.toJSON()
      if (!subscriptionJson.endpoint || !subscriptionJson.keys) {
        setError("Langganan tidak valid")
        return false
      }

      const result = await subscribeToPushDB(
        userId,
        subscriptionJson.endpoint,
        subscriptionJson.keys.auth || "",
        subscriptionJson.keys.p256dh || ""
      )

      if (!result.success) {
        setError(result.error || "Gagal menyimpan langganan notifikasi")
        return false
      }

      return true
    },
    [userId]
  )

  /**
   * Request notification permission from the user
   */
  const requestPermission = useCallback(async () => {
    if (!checkSupport()) {
      return
    }

    if (!("Notification" in window)) {
      setError("Layanan notifikasi tidak didukung di browser ini")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === "denied") {
        setError("Izin notifikasi ditolak. Silakan aktifkan notifikasi di pengaturan browser.")
      } else if (result === "default") {
        setError("Izin notifikasi belum diberikan")
      }
    } catch (err) {
      setError("Gagal meminta izin notifikasi")
    } finally {
      setIsLoading(false)
    }
  }, [checkSupport])

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async () => {
    if (!enabled) {
      return
    }

    if (!checkSupport()) {
      return
    }

    if (!userId) {
      setError("User ID diperlukan untuk berlangganan notifikasi")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Check current permission
      const currentPermission = Notification.permission
      setPermission(currentPermission)

      if (currentPermission === "denied") {
        setError("Izin notifikasi ditolak. Silakan aktifkan notifikasi di pengaturan browser.")
        setIsLoading(false)
        return
      }

      if (currentPermission === "default") {
        // Request permission first
        await requestPermission()
        const newPermission = Notification.permission
        if (newPermission !== "granted") {
          setIsLoading(false)
          return
        }
      }

      // Get or register service worker
      let registration = await getServiceWorkerRegistration()
      if (!registration) {
        if (!("serviceWorker" in navigator)) {
          setError("Service Worker tidak didukung di browser ini")
          setIsLoading(false)
          return
        }
        registration = await navigator.serviceWorker.register("/sw.js")
      }

      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        // Verify subscription is stored in database
        await storeSubscription(existingSubscription)
        setSubscription(existingSubscription)
        setIsSubscribed(true)
        setIsLoading(false)
        return
      }

      // Get VAPID public key from environment
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY
      if (!vapidPublicKey) {
        setError("Kunci publik VAPID tidak dikonfigurasi")
        setIsLoading(false)
        return
      }

      // Convert VAPID key to Uint8Array
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey) as BufferSource

      // Subscribe to push notifications
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      })

      // Store subscription in database
      const stored = await storeSubscription(newSubscription)
      if (!stored) {
        // Rollback: unsubscribe if storage failed
        await newSubscription.unsubscribe()
        setIsLoading(false)
        return
      }

      setSubscription(newSubscription)
      setIsSubscribed(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal berlangganan notifikasi")
    } finally {
      setIsLoading(false)
    }
  }, [enabled, userId, checkSupport, getServiceWorkerRegistration, storeSubscription, requestPermission])

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get current subscription
      const currentSubscription = await getPushSubscription()

      if (!currentSubscription) {
        setIsSubscribed(false)
        setSubscription(null)
        setIsLoading(false)
        return
      }

      // Remove from database
      const subscriptionJson = currentSubscription.toJSON()
      if (subscriptionJson.endpoint) {
        await unsubscribeByEndpoint(subscriptionJson.endpoint, userId)
      }

      // Unsubscribe from push service
      await currentSubscription.unsubscribe()

      setSubscription(null)
      setIsSubscribed(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal berhenti berlangganan notifikasi")
    } finally {
      setIsLoading(false)
    }
  }, [getPushSubscription, userId])

  /**
   * Initialize push notifications
   */
  const initialize = useCallback(async () => {
    if (initializationRef.current) {
      return
    }

    initializationRef.current = true

    if (!enabled) {
      return
    }

    if (!checkSupport()) {
      return
    }

    // Check current permission
    const currentPermission = Notification.permission
    setPermission(currentPermission)

    // Check if already subscribed
    const existingSubscription = await getPushSubscription()
    if (existingSubscription) {
      setSubscription(existingSubscription)
      setIsSubscribed(true)
      return
    }

    // Auto-subscribe if enabled and permission granted
    if (autoSubscribe && currentPermission === "granted") {
      await subscribe()
    }
  }, [enabled, checkSupport, getPushSubscription, autoSubscribe, subscribe])

  // Initialize on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      initializationRef.current = false
    }
  }, [])

  return {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    subscription,
    error,
    subscribe,
    unsubscribe,
    requestPermission,
  }
}

/**
 * Convert VAPID public key from base64 to Uint8Array
 *
 * The Web Push API requires the VAPID public key to be passed as a
 * Uint8Array. This utility converts the base64-encoded public key
 * from the environment variable to the required format.
 *
 * @param base64String - Base64-encoded VAPID public key
 * @returns VAPID public key as Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}
