import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const role = searchParams.get('role') || 'worker'

  if (token) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({ name, value, ...options })
            const response = NextResponse.next()
            response.cookies.set({ name, value, ...options })
          },
        },
      }
    )

    await supabase.auth.exchangeCodeForSession(token)
  }

  // Redirect to appropriate dashboard
  const redirectUrl = role === 'worker' ? '/dashboard-worker-jobs' : '/dashboard-business-jobs'
  return NextResponse.redirect(new URL(redirectUrl, request.url))
}
