/**
 * Environment key validation utilities for server-side Supabase clients.
 *
 * These functions validate that required environment variables are set
 * before using them to create Supabase clients.
 */

/**
 * Get Supabase service role key from environment
 * @throws {Error} If SUPABASE_SERVICE_ROLE_KEY is not set
 */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY environment variable is not set. " +
        "This key is required for server-side operations with elevated privileges.",
    );
  }
  return key;
}
