import { vi } from "vitest";

// Stub next/headers before any test file loads
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn().mockReturnValue([]),
  }),
  headers: vi.fn().mockResolvedValue(new Map()),
  draftMode: vi.fn().mockResolvedValue({
    isEnabled: vi.fn().mockReturnValue(false),
  }),
}));
