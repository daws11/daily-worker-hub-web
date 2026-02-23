/**
 * VAPID Key Generation for Web Push Notifications
 *
 * VAPID (Voluntary Application Server Identification) keys are required
 * for the Web Push API to authenticate push messages. The public key is
 * shared with the frontend to subscribe users to push notifications,
 * while the private key is kept secure on the server for sending notifications.
 *
 * @see https://tools.ietf.org/html/rfc8292
 */

import webpush from 'web-push'

/**
 * VAPID keys interface
 */
export interface VapidKeys {
  /** Public key (base64 URL-encoded) - safe to expose to frontend */
  publicKey: string
  /** Private key (base64 URL-encoded) - must be kept secret */
  privateKey: string
}

/**
 * Generate a new VAPID key pair
 *
 * This function generates a new VAPID key pair that can be used for
 * Web Push API authentication. The keys should be generated once and
 * stored securely in environment variables.
 *
 * @returns VAPID key pair with public and private keys
 * @throws {Error} If key generation fails
 *
 * @example
 * ```ts
 * const keys = await generateVapidKeys()
 * console.log('Public Key:', keys.publicKey) // Add to .env.local
 * console.log('Private Key:', keys.privateKey) // Add to .env.local
 * // In .env.local:
 * // VAPID_PUBLIC_KEY=your_public_key_here
 * // VAPID_PRIVATE_KEY=your_private_key_here
 * ```
 */
export async function generateVapidKeys(): Promise<VapidKeys> {
  try {
    const keys = webpush.generateVAPIDKeys()
    return {
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate VAPID keys: ${error.message}`)
    }
    throw new Error('Failed to generate VAPID keys: Unknown error')
  }
}

/**
 * Get VAPID public key from environment
 *
 * Retrieves the VAPID public key from the environment variable.
 * This key is safe to expose to the frontend for subscribing to
 * push notifications.
 *
 * @throws {Error} If VAPID_PUBLIC_KEY environment variable is not set
 * @returns VAPID public key (base64 URL-encoded)
 *
 * @example
 * ```ts
 * try {
 *   const publicKey = getVapidPublicKey()
 *   // Use publicKey to subscribe user to push notifications
 * } catch (error) {
 *   console.error('VAPID not configured:', error)
 * }
 * ```
 */
export function getVapidPublicKey(): string {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  if (!publicKey) {
    throw new Error(
      'VAPID_PUBLIC_KEY environment variable is not set. ' +
        'Generate VAPID keys using generateVapidKeys() and add them to your .env.local file.'
    )
  }
  return publicKey
}

/**
 * Get VAPID private key from environment
 *
 * Retrieves the VAPID private key from the environment variable.
 * This key must be kept secure and should NEVER be exposed to the frontend.
 *
 * @throws {Error} If VAPID_PRIVATE_KEY environment variable is not set
 * @returns VAPID private key (base64 URL-encoded)
 *
 * @example
 * ```ts
 * // In server-side code or Edge Function only!
 * try {
 *   const privateKey = getVapidPrivateKey()
 *   // Use privateKey to send push notifications
 * } catch (error) {
 *   console.error('VAPID not configured:', error)
 * }
 * ```
 */
export function getVapidPrivateKey(): string {
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!privateKey) {
    throw new Error(
      'VAPID_PRIVATE_KEY environment variable is not set. ' +
        'Generate VAPID keys using generateVapidKeys() and add them to your .env.local file.'
    )
  }
  return privateKey
}

/**
 * Validate VAPID keys configuration
 *
 * Checks if both VAPID public and private keys are properly configured
 * in the environment variables.
 *
 * @returns True if both keys are configured, false otherwise
 *
 * @example
 * ```ts
 * if (!validateVapidConfig()) {
 *   console.warn('VAPID keys not configured. Push notifications will not work.')
 * }
 * ```
 */
export function validateVapidConfig(): boolean {
  try {
    getVapidPublicKey()
    getVapidPrivateKey()
    return true
  } catch {
    return false
  }
}

/**
 * Generate VAPID subject for push notifications
 *
 * The subject is a URL or mailto email that identifies the application
 * sending push notifications. This is required by the Web Push API.
 *
 * @returns VAPID subject string (defaults to site URL from env or localhost)
 *
 * @example
 * ```ts
 * const subject = getVapidSubject()
 * // Result: "mailto:contact@example.com" or "https://example.com"
 * ```
 */
export function getVapidSubject(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const contactEmail = process.env.VAPID_CONTACT_EMAIL

  if (contactEmail) {
    return `mailto:${contactEmail}`
  }

  return siteUrl
}
