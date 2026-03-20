import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Locale cookie name for persisting language preference
 */
const LOCALE_COOKIE = "user-locale";
const DEFAULT_LOCALE = "id";
const SUPPORTED_LOCALES = ["id", "en"] as const;

type Locale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Creates a Supabase client for use in proxy
 * Handles cookies properly for Next.js proxy environment
 *
 * Using the recommended getAll/setAll pattern from @supabase/ssr v0.8+
 */
function createProxyClient(request: NextRequest) {
  // Create initial response
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Update request cookies first
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          // Create new response with updated headers
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          // Set cookies on the new response
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              path: "/",
              sameSite: "lax",
            });
          });
        },
      },
    },
  );

  return { supabase, response };
}

/**
 * Detect locale from Accept-Language header
 * @param acceptLanguage - The Accept-Language header value
 * @returns Detected locale code or default
 */
function detectLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  // Parse Accept-Language header (e.g., "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7")
  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code, qValue] = lang.trim().split(";q=");
      return {
        code: code.toLowerCase().split("-")[0], // Extract base language (e.g., 'id' from 'id-ID')
        q: qValue ? parseFloat(qValue) : 1.0,
      };
    })
    .sort((a, b) => b.q - a.q); // Sort by quality value (descending)

  // Find first supported locale
  for (const lang of languages) {
    if (SUPPORTED_LOCALES.includes(lang.code as Locale)) {
      return lang.code as Locale;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Get or set locale preference from cookie
 * @param request - NextRequest object
 * @param response - NextResponse object
 * @returns The locale to use
 */
function getOrSetLocale(request: NextRequest, response: NextResponse): Locale {
  // Check if locale cookie exists
  const existingLocale = request.cookies.get(LOCALE_COOKIE)?.value;

  if (existingLocale && SUPPORTED_LOCALES.includes(existingLocale as Locale)) {
    return existingLocale as Locale;
  }

  // Detect from browser if no cookie exists
  const detectedLocale = detectLocaleFromHeader(
    request.headers.get("accept-language"),
  );

  // Set cookie for future requests (1 year expiration)
  response.cookies.set(LOCALE_COOKIE, detectedLocale, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
    sameSite: "lax",
    httpOnly: false, // Allow client-side access for syncing with localStorage
  });

  return detectedLocale;
}

/**
 * Routes that don't require authentication (public)
 */
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/onboarding", // Allow onboarding flow for authenticated users
];

/**
 * Proxy to protect routes and handle locale detection
 * - Checks for Supabase session and redirects unauthenticated users
 * - Detects and persists language preference via cookies
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Get the origin for proper URL construction
  const origin = request.nextUrl.origin;

  // Create Supabase client and get response
  const { supabase, response } = createProxyClient(request);

  // Detect and set locale preference
  getOrSetLocale(request, response);

  // Debug: Log all cookies
  console.log(
    "[PROXY] Cookies:",
    request.cookies
      .getAll()
      .map((c) => c.name)
      .join(", "),
  );

  // Use getUser() instead of getSession() for more reliable auth check
  // getUser() validates the token with Supabase Auth server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[PROXY] Path:", pathname, "| User:", user ? user.email : "null");

  // Check if route is public (no auth required)
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route),
  );

  // Allow public routes to proceed normally
  if (isPublicRoute) {
    return response;
  }

  // Protected routes - require authentication
  const isWorkerRoute = pathname.startsWith("/worker");
  const isBusinessRoute = pathname.startsWith("/business");

  // Redirect unauthenticated users from protected routes to login
  if (!user && (isWorkerRoute || isBusinessRoute)) {
    const redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from login/register pages to appropriate dashboard
  if (
    (pathname === "/login" || pathname === "/register") &&
    user?.user_metadata?.role
  ) {
    if (user.user_metadata?.role === "worker") {
      return NextResponse.redirect(new URL("/worker/jobs", origin));
    } else if (user.user_metadata?.role === "business") {
      return NextResponse.redirect(new URL("/business/jobs", origin));
    } else if (user.user_metadata?.role === "admin") {
      return NextResponse.redirect(new URL("/admin", origin));
    }
  }

  return response;
}

/**
 * Configure which routes proxy should run on
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
