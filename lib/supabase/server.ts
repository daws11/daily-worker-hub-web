import { createClient as createSupabaseClient, type QueryResult } from '@supabase/supabase-js'
import { Database } from './types'

export const createClient = () => createSupabaseClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const createClientComponentClient = () => createSupabaseClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
 
export async function getClient() {
  const client = createClient()
  return client
}
