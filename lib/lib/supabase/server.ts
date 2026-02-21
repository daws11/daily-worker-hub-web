import { createServerClient, type QueryResult } from '@supabase/supabase-js'
import { Database } from './types'
 
export const createClient = () => createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
 
export const createClientComponentClient = () => createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!
)
 
export async function getClient() {
  const client = createClient()
  return client
}
