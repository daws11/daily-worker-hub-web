import { createBrowserClient } from "@supabase/ssr";
import { Database } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
// Updated to ES256 key format (matches supabase local dev keys)
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODkxMDA2Mjl9.AkfRbxj2kMta4cRUWNbs9t2a3amOTCz9k3CQ0VAOnfjlaCqXNDu4QrwM89GalrGYIIbQ_wavNTMAXGLR5wSk2A";

/**
 * Create Supabase browser client with proper cookie handling
 * Using @supabase/ssr v0.8+ pattern
 *
 * Note: We don't pass auth options because createBrowserClient handles them internally
 * with cookie-based storage for proper SSR support
 */
export const supabase = createBrowserClient<Database>(url, anonKey);
