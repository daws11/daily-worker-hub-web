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
 * CORS configuration
 * NEXT_PUBLIC_APP_URL is the primary allowed origin
 * ALLOWED_CORS_ORIGINS env var can override with comma-separated list
 */
const CORS_CONFIG = {
  allowedOrigins: (() => {
    const envOverride = process.env.ALLOWED_CORS_ORIGINS;
    if (envOverride) {
      return envOverride.split(",").map((o) => o.trim()).filter(Boolean);
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    return appUrl ? [appUrl] : [];
  })(),
} as const;

/**
 * Validates whether a given origin is in the allowed CORS whitelist
 * @param origin - The origin string from the request's Origin header
 * @returns true if origin is allowed, false otherwise
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // No Origin header = same-origin request, allow
  return CORS_CONFIG.allowedOrigins.includes(origin);
}

/**
 * Sanitizes an input string to neutralize XSS/injection payloads.
 * Strips <script>, <iframe>, javascript:, data:, and other injection patterns.
 * Designed for cookie names, query param keys, and HTTP header names.
 * @param input - The raw input string to sanitize
 * @returns Sanitized string safe for use in headers/cookies
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return "";

  return input
    // Remove HTML tags (script, iframe, style, object, embed, etc.)
    .replace(/<[^>]*>/g, "")
    // Remove javascript: pseudo-protocol
    .replace(/javascript\s*:/gi, "")
    // Remove data: URIs (common XSS vector)
    .replace(/data\s*:/gi, "")
    // Remove vbscript: pseudo-protocol
    .replace(/vbscript\s*:/gi, "")
    // Remove on* event handler attributes (e.g. onerror=, onclick=)
    .replace(/\bon\w+\s*=/gi, "")
    // Remove expression() (CSS expression attack)
    .replace(/expression\s*\(/gi, "")
    // Remove url() with javascript/data (CSS-based attack)
    .replace(/url\s*\(\s*['"]?\s*(javascript|data|vbscript):/gi, "url(noop:")
    .trim();
}

/**
 * Sanitizes a query parameter value to neutralize injection payloads.
 * Used for sanitizing incoming URL query parameters before use.
 * @param value - The raw query param value to sanitize
 * @returns Sanitized string safe for use in headers/logs/redirects
 */
export function sanitizeQueryParam(value: string | string[] | null | undefined): string {
  if (value == null) return "";

  const str = Array.isArray(value) ? value[0] : value;
  if (typeof str !== "string") return String(str);

  return sanitizeInput(str);
}

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
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/onboarding", // Allow onboarding flow for authenticated users
  "/docs",
  "/jobs",
  "/workers",
];

/**
 * Sets all 6 OWASP-recommended security headers on a NextResponse.
 * Designed to be called before returning the response to the client.
 * @param response - The NextResponse to attach headers to
 */
export function setSecurityHeaders(response: NextResponse): void {
  // Prevent clickjacking attacks (blocks page from being rendered in iframe)
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing vulnerabilities
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Enforce HTTPS (HSTS) - 1 year max-age, include subdomains, require preload
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  // Control referrer information sent to other sites
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Restrict browser features to prevent exploitation if XSS occurs
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // Content Security Policy - mitigate XSS and injection attacks
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; ")
  );
}

/**
 * Proxy to protect routes and handle locale detection
 * - Checks for Supabase session and redirects unauthenticated users
 * - Detects and persists language preference via cookies
 */
export async function proxy(request: NextRequest) {
  // ── CORS validation: reject disallowed cross-origin requests early ──
  const requestOrigin = request.headers.get("origin");
  if (!isAllowedOrigin(requestOrigin)) {
    const forbiddenResponse = NextResponse.json(
      { error: "Forbidden: origin not allowed" },
      { status: 403 }
    );
    setSecurityHeaders(forbiddenResponse);
    return forbiddenResponse;
  }

  // ── Sanitize pathname before any routing/auth logic ──
  const rawPathname = request.nextUrl.pathname;
  const pathname = sanitizeQueryParam(rawPathname);

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

  console.log("[PROXY] Path:", pathname, "| Authenticated:", !!user);

  // Check if route is public (no auth required)
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route),
  );

  // Allow public routes to proceed normally
  if (isPublicRoute) {
    setSecurityHeaders(response);
    return response;
  }

  // Protected routes - require authentication
  const isWorkerRoute = pathname.startsWith("/worker");
  const isBusinessRoute = pathname.startsWith("/business");
  const isAdminRoute = pathname.startsWith("/admin");

  // Redirect unauthenticated users from protected routes to login
  // Admin routes require authentication
  if (!user && isAdminRoute) {
    const redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("redirect", sanitizeQueryParam(pathname));
    const redirectResponse = NextResponse.redirect(redirectUrl);
    setSecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  // Redirect unauthenticated users from worker/business routes to login
  if (!user && (isWorkerRoute || isBusinessRoute)) {
    const redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("redirect", sanitizeQueryParam(pathname));
    const redirectResponse = NextResponse.redirect(redirectUrl);
    setSecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  // Redirect unauthenticated users from root (/) to login
  if (!user && pathname === "/") {
    const redirectUrl = new URL("/login", origin);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    setSecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  // Check if user has completed onboarding for their role
  async function checkOnboardingCompleted(
    supabaseClient: ReturnType<typeof createServerClient>,
    userId: string,
    role: string
  ): Promise<boolean> {
    if (role === "business") {
      const { data: business } = await supabaseClient
        .from("businesses")
        .select("id")
        .eq("user_id", userId)
        .single();
      return !!business;
    }

    if (role === "worker") {
      const { data: worker } = await supabaseClient
        .from("workers")
        .select("id")
        .eq("user_id", userId)
        .single();
      return !!worker;
    }

    return true; // Admin doesn't need onboarding
  }

  // Protect /worker/* routes - check if worker has completed onboarding
  if (isWorkerRoute && user) {
    const userRole = user.user_metadata?.role;
    if (userRole === "worker") {
      const hasCompletedOnboarding = await checkOnboardingCompleted(supabase, user.id, "worker");
      if (!hasCompletedOnboarding) {
        const redirectResponse = NextResponse.redirect(new URL("/onboarding", origin));
        setSecurityHeaders(redirectResponse);
        return redirectResponse;
      }
    }
  }

  // Protect /business/* routes - check if business has completed onboarding
  if (isBusinessRoute && user) {
    const userRole = user.user_metadata?.role;
    if (userRole === "business") {
      const hasCompletedOnboarding = await checkOnboardingCompleted(supabase, user.id, "business");
      if (!hasCompletedOnboarding) {
        const redirectResponse = NextResponse.redirect(new URL("/onboarding", origin));
        setSecurityHeaders(redirectResponse);
        return redirectResponse;
      }
    }
  }

  // Redirect authenticated users away from login/register pages to appropriate dashboard
  if (
    (pathname === "/login" || pathname === "/register") &&
    user?.user_metadata?.role
  ) {
    if (user.user_metadata?.role === "worker") {
      const redirectResponse = NextResponse.redirect(new URL("/worker/jobs", origin));
      setSecurityHeaders(redirectResponse);
      return redirectResponse;
    } else if (user.user_metadata?.role === "business") {
      const redirectResponse = NextResponse.redirect(new URL("/onboarding", origin));
      setSecurityHeaders(redirectResponse);
      return redirectResponse;
    } else if (user.user_metadata?.role === "admin") {
      const redirectResponse = NextResponse.redirect(new URL("/admin", origin));
      setSecurityHeaders(redirectResponse);
      return redirectResponse;
    }
  }

  // Apply security headers before responding
  setSecurityHeaders(response);

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
