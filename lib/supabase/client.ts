import { createBrowserClient } from "@supabase/ssr";

// Note: Not passing Database type to avoid complex type instantiation issues
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
