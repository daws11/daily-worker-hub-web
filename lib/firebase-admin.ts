import "server-only";
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getMessaging, Messaging } from "firebase-admin/messaging";

/**
 * Firebase Admin SDK configuration for server-side messaging
 * Used for sending push notifications via FCM
 */

// Firebase Admin SDK configuration
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

// Singleton pattern for Firebase Admin app
let firebaseAdminApp: App | null = null;
let messagingInstance: Messaging | null = null;

/**
 * Check if Firebase Admin is configured
 */
export function isFirebaseAdminConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

/**
 * Get or initialize Firebase Admin app
 */
export function getFirebaseAdminApp(): App {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseAdminApp = existingApps[0];
    return firebaseAdminApp;
  }

  if (!isFirebaseAdminConfigured()) {
    throw new Error(
      "Firebase Admin SDK is not configured. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.",
    );
  }

  firebaseAdminApp = initializeApp({
    credential: cert(firebaseAdminConfig as any),
    projectId: firebaseAdminConfig.projectId,
  });

  return firebaseAdminApp;
}

/**
 * Get Firebase Messaging instance
 */
export function getFirebaseMessaging(): Messaging {
  if (messagingInstance) {
    return messagingInstance;
  }

  const app = getFirebaseAdminApp();
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

/**
 * Verify an FCM device token
 * Useful for validating tokens before storing them
 */
export async function verifyFcmToken(token: string): Promise<boolean> {
  try {
    const messaging = getFirebaseMessaging();
    // Try to send a dry-run message to verify the token
    await messaging.send(
      {
        token,
        notification: { title: "Verification", body: "Token verification" },
      },
      true,
    ); // dry run

    return true;
  } catch (error: any) {
    // Token is invalid if error contains specific codes
    if (
      error.code === "messaging/invalid-registration-token" ||
      error.code === "messaging/registration-token-not-registered"
    ) {
      return false;
    }
    // For other errors, assume token might be valid (e.g., network issues)
    console.error("Token verification error:", error.message);
    return false;
  }
}

// Export types
export type { App as FirebaseApp } from "firebase-admin/app";
export type { Messaging } from "firebase-admin/messaging";
