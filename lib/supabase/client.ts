import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODcwMzMyMzZ9.vGUCEpa0nzPHLOLjiLcbiciKxIyyaOpqZAq25GgejYoyd7cbQfk4tKHCgWFCvIC77bKBULeTi24nVZlJkxxCtw'

export const supabase = createBrowserClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})
