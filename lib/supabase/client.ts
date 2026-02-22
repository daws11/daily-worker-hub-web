import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoicG5wX2VyIiwicG9zIjoiYXV0byIsInVsIjoiaXN5eXAiOiJyZW0iLCJ0eXBlIjoiY2FsbCIsIm5hbWUiOiJwdWJsaWMifQ=='

export const supabase = createBrowserClient<Database>(
  url,
  anonKey,
  {
    auth: {
      flowType: 'pkce'
    }
  }
)
