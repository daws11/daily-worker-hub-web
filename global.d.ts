/**
 * Global type declarations for Daily Worker Hub
 */

// ============================================================================
// Service Worker and Push API Types
// ============================================================================

interface PushSubscriptionJSON {
  endpoint: string
  keys?: {
    p256dh?: string
    auth?: string
  }
}

interface PushSubscription {
  readonly endpoint: string
  readonly options: PushSubscriptionOptions
  toJSON(): PushSubscriptionJSON
  unsubscribe(): Promise<boolean>
  getKey(name: "p256dh" | "auth"): ArrayBuffer | null
}

interface PushSubscriptionOptions {
  userVisibleOnly: boolean
  applicationServerKey: BufferSource | null
}

interface PushManager {
  subscribe(options: PushSubscriptionOptions): Promise<PushSubscription>
  getSubscription(): Promise<PushSubscription | null>
  permissionState(options: PushSubscriptionOptions): Promise<NotificationPermission>
}

interface ServiceWorkerRegistration extends EventTarget {
  readonly pushManager: PushManager
  readonly installing: ServiceWorker | null
  readonly waiting: ServiceWorker | null
  readonly active: ServiceWorker | null
  readonly scope: string
  update(): Promise<void>
  unregister(): Promise<boolean>
}

interface ServiceWorker extends EventTarget {
  readonly scriptURL: string
  readonly state: "parsed" | "installing" | "installed" | "activating" | "activated" | "redundant"
  postMessage(message: unknown, options?: PostMessageOptions | Transferable[]): void
}

interface ServiceWorkerContainer extends EventTarget {
  readonly controller: ServiceWorker | null
  readonly ready: Promise<ServiceWorkerRegistration>
  register(scriptURL: string | URL, options?: RegistrationOptions): Promise<ServiceWorkerRegistration>
  getRegistration(): Promise<ServiceWorkerRegistration | undefined>
  getRegistrations(): Promise<ServiceWorkerRegistration[]>
  startMessages(): void
}

interface RegistrationOptions {
  scope?: string
  type?: "classic" | "module"
  updateViaCache?: "imports" | "all" | "none"
}

interface Navigator {
  readonly serviceWorker: ServiceWorkerContainer
}

// Extend Window with PushNotificationUtils if using push.js
declare global {
  interface Window {
    __NEXT_PUBLIC_VAPID_KEY__?: string
    PushNotificationUtils?: {
      registerServiceWorker(): Promise<{ success: boolean; error?: string; registration?: ServiceWorkerRegistration }>
      getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null>
      requestNotificationPermission(): Promise<{ success: boolean; permission: NotificationPermission; error?: string }>
      getNotificationPermission(): NotificationPermission
      subscribeToPushNotifications(registration?: ServiceWorkerRegistration | null): Promise<{
        success: boolean
        subscription?: PushSubscription
        permission: NotificationPermission
        error?: string
      }>
      getPushSubscription(registration?: ServiceWorkerRegistration | null): Promise<PushSubscription | null>
      unsubscribeFromPushNotifications(registration?: ServiceWorkerRegistration | null): Promise<{ success: boolean; error?: string }>
      initializePushNotifications(): Promise<{
        success: boolean
        subscription?: PushSubscription
        permission: NotificationPermission
        error?: string
      }>
      checkPushNotificationSupport(): { supported: boolean; permission: NotificationPermission }
    }
  }
}

// ============================================================================
// Web-Push Module Types (for server-side)
// ============================================================================

declare module 'web-push' {
  export interface VapidKeys {
    publicKey: string
    privateKey: string
  }

  export interface PushSubscription {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }

  export interface PushPayload {
    title?: string
    body?: string
    icon?: string
    badge?: string
    data?: unknown
  }

  export interface WebPushError extends Error {
    statusCode?: number
    headers?: Record<string, string>
    body?: unknown
  }

  export function generateVAPIDKeys(): VapidKeys

  export function sendNotification(
    subscription: PushSubscription,
    payload: string | PushPayload,
    options?: {
      vapid?: {
        subject: string
        publicKey: string
        privateKey: string
      }
      TTL?: number
      headers?: Record<string, string>
    }
  ): Promise<unknown>

  export const webpush: {
    generateVAPIDKeys(): VapidKeys
    sendNotification(
      subscription: PushSubscription,
      payload: string | PushPayload,
      options?: {
        vapid?: {
          subject: string
          publicKey: string
          privateKey: string
        }
        TTL?: number
        headers?: Record<string, string>
      }
    ): Promise<unknown>
  }

  export default webpush
}
