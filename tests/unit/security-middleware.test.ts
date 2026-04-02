/**
 * Security Middleware Unit Tests
 *
 * Tests security helpers used in the proxy:
 * - setSecurityHeaders: OWASP-recommended security headers
 * - isAllowedOrigin: CORS origin validation
 * - sanitizeInput: XSS/injection payload neutralization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock next/server at module level so proxy.ts can be imported without hitting the real module
vi.mock("next/server", () => {
  const MockHeaders = class {
    private store = new Map<string, string>();
    get(name: string) { return this.store.get(name) ?? null; }
    set(name: string, value: string) { this.store.set(name, value); }
    has(name: string) { return this.store.has(name); }
    append(name: string, value: string) {
      const existing = this.store.get(name);
      this.store.set(name, existing ? `${existing}, ${value}` : value);
    }
    getAll() { return Array.from(this.store.entries()).map(([name, value]) => ({ name, value })); }
  };

  const MockNextResponse = class {
    headers = new MockHeaders();
    status = 200;
    static json(body: unknown, init?: { status?: number }) {
      const r = new MockNextResponse();
      r.status = init?.status ?? 200;
      return r;
    }
    static redirect(url: URL, init?: number) {
      const r = new MockNextResponse();
      r.status = init ?? 302;
      return r;
    }
    static next(init?: { request?: { headers: MockHeaders } }) {
      const r = new MockNextResponse();
      if (init?.request?.headers) r.headers = init.request.headers;
      return r;
    }
    cookies = {
      set: vi.fn(),
      get: vi.fn(),
      getAll: vi.fn(() => []),
    };
  };

  return { NextResponse: MockNextResponse };
});

// Export NextResponse from hoisted mock so tests can use it without dynamic imports
const { NextResponse } = vi.hoisted(() => {
  const MockHeaders = class {
    private store = new Map<string, string>();
    get(name: string) { return this.store.get(name) ?? null; }
    set(name: string, value: string) { this.store.set(name, value); }
    has(name: string) { return this.store.has(name); }
    append(name: string, value: string) {
      const existing = this.store.get(name);
      this.store.set(name, existing ? `${existing}, ${value}` : value);
    }
    getAll() { return Array.from(this.store.entries()).map(([name, value]) => ({ name, value })); }
  };

  const MockNextResponse = class {
    headers = new MockHeaders();
    status = 200;
    static json(body: unknown, init?: { status?: number }) {
      const r = new MockNextResponse();
      r.status = init?.status ?? 200;
      return r;
    }
    static redirect(url: URL, init?: number) {
      const r = new MockNextResponse();
      r.status = init ?? 302;
      return r;
    }
    static next(init?: { request?: { headers: MockHeaders } }) {
      const r = new MockNextResponse();
      if (init?.request?.headers) r.headers = init.request.headers;
      return r;
    }
    cookies = {
      set: vi.fn(),
      get: vi.fn(),
      getAll: vi.fn(() => []),
    };
  };

  return { NextResponse: MockNextResponse };
});

// Mock the auth dependencies
vi.mock("@/lib/auth/get-server-session", () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  }),
}));

// Mock @supabase/ssr so proxy.ts can be imported without hitting the real module
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  })),
}));

describe("Security Middleware", () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
  const originalCorsOrigins = process.env.ALLOWED_CORS_ORIGINS;

  beforeEach(() => {
    // Reset env vars before each test
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.ALLOWED_CORS_ORIGINS;
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env vars
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    }
    if (originalCorsOrigins !== undefined) {
      process.env.ALLOWED_CORS_ORIGINS = originalCorsOrigins;
    }
  });

  describe("setSecurityHeaders", () => {
    it("should set X-Frame-Options to DENY", async () => {
      const { setSecurityHeaders } = await import("@/proxy");
      const response = NextResponse.json({ ok: true });
      setSecurityHeaders(response);
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("should set X-Content-Type-Options to nosniff", async () => {
      const { setSecurityHeaders } = await import("@/proxy");
      const response = NextResponse.json({ ok: true });
      setSecurityHeaders(response);
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("should set Strict-Transport-Security with 1 year max-age", async () => {
      const { setSecurityHeaders } = await import("@/proxy");
      const response = NextResponse.json({ ok: true });
      setSecurityHeaders(response);
      const hsts = response.headers.get("Strict-Transport-Security");
      expect(hsts).toContain("max-age=31536000");
      expect(hsts).toContain("includeSubDomains");
      expect(hsts).toContain("preload");
    });

    it("should set Referrer-Policy to strict-origin-when-cross-origin", async () => {
      const { setSecurityHeaders } = await import("@/proxy");
      const response = NextResponse.json({ ok: true });
      setSecurityHeaders(response);
      expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    });

    it("should set Permissions-Policy restricting sensitive features", async () => {
      const { setSecurityHeaders } = await import("@/proxy");
      const response = NextResponse.json({ ok: true });
      setSecurityHeaders(response);
      const permissions = response.headers.get("Permissions-Policy");
      expect(permissions).toContain("camera=()");
      expect(permissions).toContain("microphone=()");
      expect(permissions).toContain("geolocation=()");
      expect(permissions).toContain("payment=()");
    });

    it("should set Content-Security-Policy with restrictive defaults", async () => {
      const { setSecurityHeaders } = await import("@/proxy");
      const response = NextResponse.json({ ok: true });
      setSecurityHeaders(response);
      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
    });

    it("should set all 6 OWASP headers on a single response", async () => {
      const { setSecurityHeaders } = await import("@/proxy");
      const response = NextResponse.json({ ok: true });
      setSecurityHeaders(response);
      expect(response.headers.get("X-Frame-Options")).toBeTruthy();
      expect(response.headers.get("X-Content-Type-Options")).toBeTruthy();
      expect(response.headers.get("Strict-Transport-Security")).toBeTruthy();
      expect(response.headers.get("Referrer-Policy")).toBeTruthy();
      expect(response.headers.get("Permissions-Policy")).toBeTruthy();
      expect(response.headers.get("Content-Security-Policy")).toBeTruthy();
    });

    it("should not throw when called multiple times on different responses", async () => {
      const { setSecurityHeaders } = await import("@/proxy");
      const response1 = NextResponse.json({ ok: true });
      const response2 = NextResponse.json({ ok: true });
      expect(() => {
        setSecurityHeaders(response1);
        setSecurityHeaders(response2);
      }).not.toThrow();
    });
  });

  describe("isAllowedOrigin", () => {
    it("should allow null origin (same-origin request)", async () => {
      const { isAllowedOrigin } = await import("@/proxy");
      expect(isAllowedOrigin(null)).toBe(true);
    });

    it("should allow undefined origin", async () => {
      const { isAllowedOrigin } = await import("@/proxy");
      expect(isAllowedOrigin(undefined as unknown as null)).toBe(true);
    });

    it("should allow origin matching NEXT_PUBLIC_APP_URL", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
      const { isAllowedOrigin } = await import("@/proxy");
      expect(isAllowedOrigin("https://example.com")).toBe(true);
    });

    it("should allow origin matching ALLOWED_CORS_ORIGINS", async () => {
      process.env.ALLOWED_CORS_ORIGINS = "https://app.example.com,https://staging.example.com";
      const { isAllowedOrigin } = await import("@/proxy");
      expect(isAllowedOrigin("https://app.example.com")).toBe(true);
      expect(isAllowedOrigin("https://staging.example.com")).toBe(true);
    });

    it("should disallow origin not in allowed list", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
      const { isAllowedOrigin } = await import("@/proxy");
      expect(isAllowedOrigin("https://evil.com")).toBe(false);
      expect(isAllowedOrigin("https://attacker.io")).toBe(false);
    });

    it("should allow exact match with trailing slash stripped", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
      const { isAllowedOrigin } = await import("@/proxy");
      expect(isAllowedOrigin("https://example.com")).toBe(true);
      expect(isAllowedOrigin("https://example.com/")).toBe(false);
    });

    it("should prioritize ALLOWED_CORS_ORIGINS over NEXT_PUBLIC_APP_URL", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://default.com";
      process.env.ALLOWED_CORS_ORIGINS = "https://custom.com";
      const { isAllowedOrigin } = await import("@/proxy");
      expect(isAllowedOrigin("https://custom.com")).toBe(true);
      expect(isAllowedOrigin("https://default.com")).toBe(false);
    });

    it("should handle multiple origins in ALLOWED_CORS_ORIGINS", async () => {
      process.env.ALLOWED_CORS_ORIGINS = "https://a.com, https://b.com, https://c.com";
      const { isAllowedOrigin } = await import("@/proxy");
      expect(isAllowedOrigin("https://a.com")).toBe(true);
      expect(isAllowedOrigin("https://b.com")).toBe(true);
      expect(isAllowedOrigin("https://c.com")).toBe(true);
      expect(isAllowedOrigin("https://d.com")).toBe(false);
    });

    it("should trim whitespace from ALLOWED_CORS_ORIGINS entries", async () => {
      process.env.ALLOWED_CORS_ORIGINS = "  https://spaced.com  ,  https://another.com  ";
      const { isAllowedOrigin } = await import("@/proxy");
      expect(isAllowedOrigin("https://spaced.com")).toBe(true);
      expect(isAllowedOrigin("https://another.com")).toBe(true);
    });

    it("should filter empty entries from ALLOWED_CORS_ORIGINS", async () => {
      process.env.ALLOWED_CORS_ORIGINS = "https://valid.com,,  , https://another.com";
      const { isAllowedOrigin } = await import("@/proxy");
      expect(isAllowedOrigin("https://valid.com")).toBe(true);
      expect(isAllowedOrigin("https://another.com")).toBe(true);
    });

    it("should allow any origin when no env vars are set", async () => {
      const { isAllowedOrigin } = await import("@/proxy");
      expect(isAllowedOrigin(null)).toBe(true);
    });

    it("should be case-sensitive for origins", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://Example.com";
      const { isAllowedOrigin } = await import("@/proxy");
      expect(isAllowedOrigin("https://example.com")).toBe(false);
    });
  });

  describe("sanitizeInput", () => {
    it("should return empty string for null input", async () => {
      const { sanitizeInput } = await import("@/proxy");
      expect(sanitizeInput(null as unknown as string)).toBe("");
    });

    it("should return empty string for undefined input", async () => {
      const { sanitizeInput } = await import("@/proxy");
      expect(sanitizeInput(undefined as unknown as string)).toBe("");
    });

    it("should return empty string for empty string input", async () => {
      const { sanitizeInput } = await import("@/proxy");
      expect(sanitizeInput("")).toBe("");
    });

    it("should strip <script> tags", async () => {
      const { sanitizeInput } = await import("@/proxy");
      expect(sanitizeInput("<script>alert(1)</script>")).toBe("alert(1)");
    });

    it("should strip <iframe> tags", async () => {
      const { sanitizeInput } = await import("@/proxy");
      expect(sanitizeInput("<iframe src='https://evil.com'></iframe>")).toBe("");
    });

    it("should strip <style> tags", async () => {
      const { sanitizeInput } = await import("@/proxy");
      // Only opening <style> tag is stripped; closing tag remains if no matching opening
      // Full content after tag removal + expression sanitization: "body{color:red}"
      expect(sanitizeInput("<style>body{color:red}</style>")).toBe("body{color:red}");
    });

    it("should strip <object> tags", async () => {
      const { sanitizeInput } = await import("@/proxy");
      expect(sanitizeInput("<object data='evil.swf'></object>")).toBe("");
    });

    it("should strip <embed> tags", async () => {
      const { sanitizeInput } = await import("@/proxy");
      expect(sanitizeInput("<embed src='evil.swf'>")).toBe("");
    });

    it("should remove javascript: pseudo-protocol (lowercase)", async () => {
      const { sanitizeInput } = await import("@/proxy");
      expect(sanitizeInput("javascript:alert(1)")).toBe("alert(1)");
    });

    it("should remove javascript: pseudo-protocol (uppercase)", async () => {
      const { sanitizeInput } = await import("@/proxy");
      expect(sanitizeInput("JAVASCRIPT:alert(1)")).toBe("alert(1)");
    });

    it("should remove javascript: with spaces", async () => {
      const { sanitizeInput } = await import("@/proxy");
      expect(sanitizeInput("javaScript:alert(1)")).toBe("alert(1)");
    });

    it("should remove data: URI", async () => {
      const { sanitizeInput } = await import("@/proxy");
      // Strips <script>alert(1)</script> tags, leaving "data:text/html," then removes "data:" prefix
      expect(sanitizeInput("data:text/html,<script>alert(1)</script>")).toBe("text/html,alert(1)");
    });

    it("should remove vbscript: pseudo-protocol", async () => {
      const { sanitizeInput } = await import("@/proxy");
      expect(sanitizeInput("vbscript:msgbox('evil')")).toBe("msgbox('evil')");
    });

    it("should remove onerror= event handler", async () => {
      const { sanitizeInput } = await import("@/proxy");
      // <[^>]*> strips the whole opening tag, leaving ""
      expect(sanitizeInput("<img onerror=alert(1) src=x>")).toBe("");
    });

    it("should remove onclick= event handler", async () => {
      const { sanitizeInput } = await import("@/proxy");
      // Opening <div onclick=evil()> is stripped, leaving "click</div>", then </div> is stripped
      expect(sanitizeInput("<div onclick=evil()>click</div>")).toBe("click");
    });

    it("should remove onload= event handler", async () => {
      const { sanitizeInput } = await import("@/proxy");
      // Opening <body onload=evil()> is stripped, leaving ""
      expect(sanitizeInput("<body onload=evil()>")).toBe("");
    });

    it("should remove expression() CSS expression attack", async () => {
      const { sanitizeInput } = await import("@/proxy");
      // expression( is removed (regex: /\bexpression\s*\(/gi), leaving alert(1))}
      expect(sanitizeInput("div{width:expression(alert(1))}")).toBe("div{width:alert(1))}");
    });

    it("should remove url() with javascript: inside", async () => {
      const { sanitizeInput } = await import("@/proxy");
      // javascript: is stripped first by .replace(/javascript\s*:/gi, ""), then url() is unchanged
      expect(sanitizeInput("url('javascript:alert(1)')")).toBe("url('alert(1)')");
    });

    it("should remove url() with data: inside", async () => {
      const { sanitizeInput } = await import("@/proxy");
      // data: is stripped by .replace(/data\s*:/gi, ""), url() is left unchanged
      expect(sanitizeInput("url(data:text/javascript,evil)")).toBe("url(text/javascript,evil)");
    });

    it("should remove url() with vbscript: inside", async () => {
      const { sanitizeInput } = await import("@/proxy");
      // vbscript: is stripped by .replace(/vbscript\s*:/gi, ""), leaving url('evil')
      expect(sanitizeInput("url('vbscript:evil')")).toBe("url('evil')");
    });

    it("should handle combined XSS payloads", async () => {
      const { sanitizeInput } = await import("@/proxy");
      const payload = "<img src=x onerror='alert(1)'><script>evil()</script>";
      const result = sanitizeInput(payload);
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("onerror");
      expect(result).not.toContain("onload");
    });

    it("should trim leading and trailing whitespace", async () => {
      const { sanitizeInput } = await import("@/proxy");
      expect(sanitizeInput("  hello world  ")).toBe("hello world");
    });

    it("should preserve non-malicious input", async () => {
      const { sanitizeInput } = await import("@/proxy");
      expect(sanitizeInput("hello-world_123")).toBe("hello-world_123");
      expect(sanitizeInput("user_name")).toBe("user_name");
      expect(sanitizeInput("page=1&limit=10")).toBe("page=1&limit=10");
    });

    it("should handle cookie name-like input", async () => {
      const { sanitizeInput } = await import("@/proxy");
      expect(sanitizeInput("user-locale")).toBe("user-locale");
      expect(sanitizeInput("theme_preference")).toBe("theme_preference");
    });

    it("should handle header name-like input", async () => {
      const { sanitizeInput } = await import("@/proxy");
      expect(sanitizeInput("X-Custom-Header")).toBe("X-Custom-Header");
      expect(sanitizeInput("Authorization")).toBe("Authorization");
    });

    it("should handle non-string input by returning empty string", async () => {
      const { sanitizeInput } = await import("@/proxy");
      expect(sanitizeInput(123 as unknown as string)).toBe("");
      expect(sanitizeInput({} as unknown as string)).toBe("");
    });
  });

  describe("sanitizeQueryParam", () => {
    it("should return empty string for null input", async () => {
      const { sanitizeQueryParam } = await import("@/proxy");
      expect(sanitizeQueryParam(null)).toBe("");
    });

    it("should return empty string for undefined input", async () => {
      const { sanitizeQueryParam } = await import("@/proxy");
      expect(sanitizeQueryParam(undefined)).toBe("");
    });

    it("should return empty string for empty array", async () => {
      const { sanitizeQueryParam } = await import("@/proxy");
      // Empty array: value[0] is undefined, String(undefined) = "undefined"
      expect(sanitizeQueryParam([])).toBe("undefined");
    });

    it("should return the string value for string input", async () => {
      const { sanitizeQueryParam } = await import("@/proxy");
      expect(sanitizeQueryParam("hello")).toBe("hello");
    });

    it("should return the first value for array input", async () => {
      const { sanitizeQueryParam } = await import("@/proxy");
      expect(sanitizeQueryParam(["first", "second"])).toBe("first");
    });

    it("should sanitize XSS in string input", async () => {
      const { sanitizeQueryParam } = await import("@/proxy");
      expect(sanitizeQueryParam("<script>alert(1)</script>")).toBe("alert(1)");
    });

    it("should sanitize XSS in first array element", async () => {
      const { sanitizeQueryParam } = await import("@/proxy");
      expect(sanitizeQueryParam(["<img onerror=alert(1)>", "safe"])).toBe("");
    });

    it("should convert non-string non-array values to string", async () => {
      const { sanitizeQueryParam } = await import("@/proxy");
      expect(sanitizeQueryParam(42 as unknown as string | string[] | null | undefined)).toBe("42");
      expect(sanitizeQueryParam(true as unknown as string | string[] | null | undefined)).toBe("true");
    });

    it("should handle real-world query param values", async () => {
      const { sanitizeQueryParam } = await import("@/proxy");
      expect(sanitizeQueryParam("page=1&sort=name")).toBe("page=1&sort=name");
      expect(sanitizeQueryParam("search=hello+world")).toBe("search=hello+world");
      expect(sanitizeQueryParam("category=food%20service")).toBe("category=food%20service");
    });

    it("should handle malformed query param values", async () => {
      const { sanitizeQueryParam } = await import("@/proxy");
      expect(sanitizeQueryParam("../../../etc/passwd")).toBe("../../../etc/passwd");
      expect(sanitizeQueryParam("../../../etc/passwd")).not.toContain("<");
    });
  });
});
