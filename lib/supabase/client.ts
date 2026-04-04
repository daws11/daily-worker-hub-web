import { createBrowserClient } from "@supabase/ssr";
import { Database } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Updated to ES256 key format (matches supabase local dev keys)
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Create Supabase browser client with proper cookie handling
 * Using @supabase/ssr v0.8+ pattern
 *
 * Note: We don't pass auth options because createBrowserClient handles them internally
 * with cookie-based storage for proper SSR support
 */
export const supabase = createBrowserClient<Database>(url!, anonKey!);
