import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Creates a Supabase client for use in middleware
 * Handles cookies properly for Next.js middleware environment
 */
function createMiddlewareClient(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

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
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  return { supabase, response }
}

/**
 * Routes that don't require authentication
 */
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
]

/**
 * Routes that require authentication
 */
const protectedRoutes = [
  '/dashboard-business-jobs',
  '/dashboard-worker-jobs',
  '/dashboard/business',
  '/dashboard/worker',
  '/dashboard/worker/bookings',
]

/**
 * Middleware to protect routes
 * Checks for Supabase session and redirects unauthenticated users
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Get the origin for proper URL construction
  const origin = request.nextUrl.origin

  // Create Supabase client and get response
  const { supabase, response } = createMiddlewareClient(request)

  // Check if user has a valid session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )
  const isPublicRoute = publicRoutes.some((route) =>
    pathname === route || pathname.startsWith(route)
  )

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', origin)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (isPublicRoute && session) {
    // Check if trying to access login/register while authenticated
    if (pathname === '/login' || pathname === '/register') {
      // Redirect to appropriate dashboard based on user role
      const userRole = session.user?.user_metadata?.role
      if (userRole === 'worker') {
        return NextResponse.redirect(new URL('/dashboard-worker-jobs', origin))
      } else if (userRole === 'business') {
        return NextResponse.redirect(new URL('/dashboard-business-jobs', origin))
      }
      // Default fallback
      return NextResponse.redirect(new URL('/dashboard-worker-jobs', origin))
    }
  }

  return response
}

/**
 * Configure which routes the middleware should run on
 * Matches all routes except static files, images, and API routes
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     * - API routes (unless you want to protect them)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
