// ============================================================================
// Push Notification Utility
// ============================================================================
// This utility provides functions for managing push notifications in the browser.
// It handles service worker registration, notification permission requests, and
// push notification subscription management.
//
// The utility uses the Web Push API to subscribe users to push notifications
// and stores the subscription object for later use by the server.
//
// @see https://developer.mozilla.org/en-US/docs/Web/API/Push_API
// ============================================================================

// ============================================================================
// Constants
// ============================================================================

const SERVICE_WORKER_URL = '/sw.js'
const VAPID_PUBLIC_KEY_ENV = 'NEXT_PUBLIC_VAPID_KEY'

// ============================================================================
// Type Definitions (JSDoc for TypeScript compatibility)
// ============================================================================

/**
 * @typedef {Object} PushSubscriptionResult
 * @property {boolean} success - Whether the operation was successful
 * @property {string} [error] - Error message if operation failed
 * @property {PushSubscription|null} [subscription] - Push subscription object if successful
 * @property {NotificationPermission} [permission] - Current notification permission state
 */

/**
 * @typedef {Object} ServiceWorkerResult
 * @property {boolean} success - Whether the operation was successful
 * @property {string} [error] - Error message if operation failed
 * @property {ServiceWorkerRegistration|null} [registration] - Service worker registration if successful
 */

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert VAPID public key from base64 to Uint8Array
 *
 * The Web Push API requires the VAPID public key to be passed as a
 * Uint8Array. This utility converts the base64-encoded public key
 * from the environment variable to the required format.
 *
 * @param {string} base64String - Base64-encoded VAPID public key
 * @returns {Uint8Array} VAPID public key as Uint8Array
 * @private
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

/**
 * Get VAPID public key from environment or meta tag
 *
 * Retrieves the VAPID public key from either:
 * 1. A global window object property (set by Next.js)
 * 2. A meta tag in the HTML head
 *
 * @returns {string|null} VAPID public key or null if not found
 * @private
 */
function getVapidPublicKey() {
  // Try to get from window object (set by Next.js process.env)
  if (window.__NEXT_PUBLIC_VAPID_KEY__) {
    return window.__NEXT_PUBLIC_VAPID_KEY__
  }

  // Try to get from meta tag
  const metaTag = document.querySelector('meta[name="vapid-public-key"]')
  if (metaTag) {
    return metaTag.getAttribute('content')
  }

  return null
}

// ============================================================================
// Service Worker Registration
// ============================================================================

/**
 * Register the service worker for push notifications
 *
 * This function registers the service worker (sw.js) which handles
 * incoming push notifications and displays them to users.
 *
 * @returns {Promise<ServiceWorkerResult>} Service worker registration result
 *
 * @example
 * ```js
 * const result = await registerServiceWorker()
 * if (result.success) {
 *   console.log('Service worker registered:', result.registration)
 * } else {
 *   console.error('Failed to register service worker:', result.error)
 * }
 * ```
 */
export async function registerServiceWorker() {
  try {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      return {
        success: false,
        error: 'Layanan Service Worker tidak didukung di browser ini',
        registration: null,
      }
    }

    // Register the service worker
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL)

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready

    return {
      success: true,
      registration,
    }
  } catch (error) {
    return {
      success: false,
      error: `Gagal mendaftarkan service worker: ${error.message}`,
      registration: null,
    }
  }
}

/**
 * Get the current service worker registration
 *
 * Returns the existing service worker registration if one exists.
 * This is useful to check if a service worker is already registered.
 *
 * @returns {Promise<ServiceWorkerRegistration|null>} Service worker registration or null
 *
 * @example
 * ```js
 * const registration = await getServiceWorkerRegistration()
 * if (registration) {
 *   console.log('Service worker already registered')
 * }
 * ```
 */
export async function getServiceWorkerRegistration() {
  try {
    if (!('serviceWorker' in navigator)) {
      return null
    }

    const registration = await navigator.serviceWorker.getRegistration()
    return registration
  } catch {
    return null
  }
}

// ============================================================================
// Notification Permission
// ============================================================================

/**
 * Request notification permission from the user
 *
 * This function requests permission to show push notifications.
 * The browser will show a permission prompt to the user.
 *
 * @returns {Promise<PushSubscriptionResult>} Permission request result
 *
 * @example
 * ```js
 * const result = await requestNotificationPermission()
 * if (result.permission === 'granted') {
 *   console.log('Notification permission granted')
 * } else if (result.permission === 'denied') {
 *   console.log('Notification permission denied')
 * }
 * ```
 */
export async function requestNotificationPermission() {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      return {
        success: false,
        error: 'Layanan notifikasi tidak didukung di browser ini',
        permission: 'default',
        subscription: null,
      }
    }

    // Request permission
    const permission = await Notification.requestPermission()

    return {
      success: permission === 'granted',
      permission,
      subscription: null,
      error: permission === 'denied'
        ? 'Izin notifikasi ditolak'
        : permission === 'default'
          ? 'Izin notifikasi belum diberikan'
          : undefined,
    }
  } catch (error) {
    return {
      success: false,
      error: `Gagal meminta izin notifikasi: ${error.message}`,
      permission: 'default',
      subscription: null,
    }
  }
}

/**
 * Get current notification permission status
 *
 * Returns the current notification permission state without prompting.
 *
 * @returns {NotificationPermission} Current permission state ('granted', 'denied', or 'default')
 *
 * @example
 * ```js
 * const permission = getNotificationPermission()
 * if (permission === 'granted') {
 *   console.log('Notifications are enabled')
 * }
 * ```
 */
export function getNotificationPermission() {
  if (!('Notification' in window)) {
    return 'default'
  }

  return Notification.permission
}

// ============================================================================
// Push Subscription
// ============================================================================

/**
 * Subscribe to push notifications
 *
 * This function subscribes the user to push notifications using the
 * VAPID public key. The resulting PushSubscription object should be
 * sent to the server for storing in the database.
 *
 * @param {ServiceWorkerRegistration} [registration] - Service worker registration (optional, will fetch if not provided)
 * @returns {Promise<PushSubscriptionResult>} Subscription result
 *
 * @example
 * ```js
 * const result = await subscribeToPushNotifications()
 * if (result.success && result.subscription) {
 *   // Send subscription to server
 *   await saveSubscriptionToServer(result.subscription)
 *   console.log('Subscribed to push notifications')
 * }
 * ```
 */
export async function subscribeToPushNotifications(registration = null) {
  try {
    // Check if permission is granted
    const permission = getNotificationPermission()
    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Izin notifikasi belum diberikan. Silakan minta izin terlebih dahulu.',
        permission,
        subscription: null,
      }
    }

    // Get service worker registration if not provided
    if (!registration) {
      registration = await getServiceWorkerRegistration()
      if (!registration) {
        return {
          success: false,
          error: 'Service worker belum terdaftar. Silakan daftarkan service worker terlebih dahulu.',
          permission,
          subscription: null,
        }
      }
    }

    // Get VAPID public key
    const vapidPublicKey = getVapidPublicKey()
    if (!vapidPublicKey) {
      return {
        success: false,
        error: 'Kunci publik VAPID tidak dikonfigurasi',
        permission,
        subscription: null,
      }
    }

    // Convert VAPID key to Uint8Array
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    })

    return {
      success: true,
      subscription,
      permission,
    }
  } catch (error) {
    return {
      success: false,
      error: `Gagal berlangganan notifikasi: ${error.message}`,
      permission: getNotificationPermission(),
      subscription: null,
    }
  }
}

/**
 * Get existing push subscription
 *
 * Returns the existing push subscription if one exists.
 * This is useful to check if the user is already subscribed.
 *
 * @param {ServiceWorkerRegistration} [registration] - Service worker registration (optional)
 * @returns {Promise<PushSubscription|null>} Existing subscription or null
 *
 * @example
 * ```js
 * const subscription = await getPushSubscription()
 * if (subscription) {
 *   console.log('Already subscribed:', subscription.endpoint)
 * } else {
 *   console.log('Not subscribed yet')
 * }
 * ```
 */
export async function getPushSubscription(registration = null) {
  try {
    // Get service worker registration if not provided
    if (!registration) {
      registration = await getServiceWorkerRegistration()
      if (!registration) {
        return null
      }
    }

    const subscription = await registration.pushManager.getSubscription()
    return subscription
  } catch {
    return null
  }
}

/**
 * Unsubscribe from push notifications
 *
 * This function removes the existing push subscription.
 * The corresponding subscription record should also be removed from the server.
 *
 * @param {ServiceWorkerRegistration} [registration] - Service worker registration (optional)
 * @returns {Promise<{success: boolean, error?: string}>} Unsubscription result
 *
 * @example
 * ```js
 * const result = await unsubscribeFromPushNotifications()
 * if (result.success) {
 *   console.log('Unsubscribed from push notifications')
 * }
 * ```
 */
export async function unsubscribeFromPushNotifications(registration = null) {
  try {
    // Get existing subscription
    const subscription = await getPushSubscription(registration)

    if (!subscription) {
      return {
        success: true, // Already unsubscribed
      }
    }

    // Unsubscribe
    await subscription.unsubscribe()

    return {
      success: true,
    }
  } catch (error) {
    return {
      success: false,
      error: `Gagal berhenti berlangganan notifikasi: ${error.message}`,
    }
  }
}

// ============================================================================
// Push Notification Management (Complete Flow)
// ============================================================================

/**
 * Initialize push notifications (complete setup flow)
 *
 * This function handles the complete flow for setting up push notifications:
 * 1. Registers the service worker (if not already registered)
 * 2. Requests notification permission (if not already granted)
 * 3. Subscribes to push notifications (if not already subscribed)
 *
 * This is the recommended function to use when setting up push notifications
 * for the first time.
 *
 * @returns {Promise<PushSubscriptionResult>} Setup result
 *
 * @example
 * ```js
 * const result = await initializePushNotifications()
 * if (result.success && result.subscription) {
 *   // Send subscription to server
 *   await saveSubscriptionToServer(result.subscription)
 *   console.log('Push notifications initialized successfully')
 * } else if (result.error) {
 *   console.error('Failed to initialize:', result.error)
 * }
 * ```
 */
export async function initializePushNotifications() {
  try {
    // Step 1: Register service worker
    const swResult = await registerServiceWorker()
    if (!swResult.success || !swResult.registration) {
      return {
        success: false,
        error: swResult.error || 'Gagal mendaftarkan service worker',
        subscription: null,
        permission: getNotificationPermission(),
      }
    }

    // Step 2: Check/request notification permission
    let permission = getNotificationPermission()

    if (permission === 'default') {
      const permissionResult = await requestNotificationPermission()
      permission = permissionResult.permission

      if (permission !== 'granted') {
        return {
          success: false,
          error: permissionResult.error || 'Izin notifikasi tidak diberikan',
          subscription: null,
          permission,
        }
      }
    } else if (permission === 'denied') {
      return {
        success: false,
        error: 'Izin notifikasi ditolak. Silakan aktifkan notifikasi di pengaturan browser.',
        subscription: null,
        permission,
      }
    }

    // Step 3: Check if already subscribed
    const existingSubscription = await getPushSubscription(swResult.registration)
    if (existingSubscription) {
      return {
        success: true,
        subscription: existingSubscription,
        permission,
      }
    }

    // Step 4: Subscribe to push notifications
    const subscribeResult = await subscribeToPushNotifications(swResult.registration)

    return subscribeResult
  } catch (error) {
    return {
      success: false,
      error: `Gagal menginisialisasi notifikasi: ${error.message}`,
      subscription: null,
      permission: getNotificationPermission(),
    }
  }
}

/**
 * Check if push notifications are supported and enabled
 *
 * Checks if the browser supports push notifications and if the user
 * has granted permission.
 *
 * @returns {{supported: boolean, permission: NotificationPermission}} Support status
 *
 * @example
 * ```js
 * const status = checkPushNotificationSupport()
 * if (status.supported && status.permission === 'granted') {
 *   console.log('Push notifications are available')
 * }
 * ```
 */
export function checkPushNotificationSupport() {
  return {
    supported: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
    permission: getNotificationPermission(),
  }
}

// ============================================================================
// Export as window object for non-module usage
// ============================================================================

// Export functions to window object for use in non-module scripts
if (typeof window !== 'undefined') {
  window.PushNotificationUtils = {
    registerServiceWorker,
    getServiceWorkerRegistration,
    requestNotificationPermission,
    getNotificationPermission,
    subscribeToPushNotifications,
    getPushSubscription,
    unsubscribeFromPushNotifications,
    initializePushNotifications,
    checkPushNotificationSupport,
  }
}
