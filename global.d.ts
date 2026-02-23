/**
 * Global type declarations for Daily Worker Hub
 */

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
