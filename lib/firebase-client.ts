/**
 * Firebase Client SDK for browser notifications
 * Used for requesting permission and receiving FCM messages
 */

import { initializeApp, FirebaseApp, getApps } from 'firebase/app'
import { getMessaging, Messaging, isSupported } from 'firebase/messaging'

// Firebase client configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

/**
 * Check if Firebase client is configured
 */
export function isFirebaseClientConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  )
}

// Singleton instances
let firebaseApp: FirebaseApp | null = null
let messagingInstance: Messaging | null = null

/**
 * Get or initialize Firebase client app
 */
export async function getFirebaseApp(): Promise<FirebaseApp | null> {
  if (firebaseApp) {
    return firebaseApp
  }

  // Check if already initialized
  const existingApps = getApps()
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0]
    return firebaseApp
  }

  if (!isFirebaseClientConfigured()) {
    console.warn('Firebase client is not configured. Push notifications will not work.')
    return null
  }

  firebaseApp = initializeApp(firebaseConfig)
  return firebaseApp
}

/**
 * Get Firebase Messaging instance for the browser
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messagingInstance) {
    return messagingInstance
  }

  // Check if messaging is supported in this browser
  const supported = await isSupported()
  if (!supported) {
    console.warn('Firebase Messaging is not supported in this browser')
    return null
  }

  const app = await getFirebaseApp()
  if (!app) {
    return null
  }

  messagingInstance = getMessaging(app)
  return messagingInstance
}

/**
 * Get the VAPID key for web push
 * This is used for subscribing to push notifications in the browser
 */
export function getVapidKey(): string | null {
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || null
}

// Re-export types for convenience
export type { FirebaseApp, Messaging }
