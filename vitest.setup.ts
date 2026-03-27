/**
 * Vitest Setup File
 *
 * Global mocks applied before any module evaluation.
 * This ensures mocks are in place before any imports happen.
 */

import { vi } from "vitest";

// Define mock translation function at module level for use across all tests
export const mockTranslationFn = vi.fn((key: string, params?: Record<string, string | number>) => {
  if (params && Object.keys(params).length > 0) {
    return `${key}:${JSON.stringify(params)}`;
  }
  return key;
});

// Mock i18n/hooks - this must be set up before use-notifications is imported
// The mock returns a simple object so useContext is never called
// IMPORTANT: use @/lib/i18n/hooks NOT ../i18n/hooks because path resolution differs
// between lib/hooks/__tests__/ (test) and lib/hooks/ (hook file) directories
vi.mock("@/lib/i18n/hooks", () => ({
  useTranslation: () => ({ t: mockTranslationFn }),
  useTranslationSafe: () => ({ t: (key: string) => key }),
  I18nContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

// Mock server-only globally
vi.mock("server-only", () => ({}));

// Mock sonner globally
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));
