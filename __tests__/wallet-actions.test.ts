/**
 * Wallet Actions Unit Tests
 *
 * Tests for wallet-related server actions:
 * - createWalletAction
 * - getWalletBalanceAction
 * - getOrCreateWalletAction
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn(),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn(),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn(),
          }),
        }),
      }),
    }),
  }),
}));

// Mock xendit gateway
vi.mock("@/lib/payments", () => ({
  xenditGateway: {
    createVirtualAccount: vi.fn().mockResolvedValue({
      success: true,
      data: { id: "va-123", account_number: "1234567890" },
    }),
    getBalance: vi.fn().mockResolvedValue({ success: true, data: 1000000 }),
  },
}));

import { createClient } from "@/lib/supabase/server";
import {
  createWalletAction,
  getWalletBalanceAction,
  getOrCreateWalletAction,
} from "@/lib/actions/wallets";

describe("Wallet Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── createWalletAction ─────────────────────────────────────────────────

  describe("createWalletAction", () => {
    it("should create a new wallet successfully", async () => {
      const mockWallet = {
        id: "wallet-123",
        user_id: "user-123",
        pending_balance: 0,
        available_balance: 0,
        created_at: "2026-04-04T09:00:00.000Z",
        updated_at: "2026-04-04T09:00:00.000Z",
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116" },
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockWallet,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof createClient>);

      const result = await createWalletAction("user-123");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockWallet);
    });

    it("should fail if wallet already exists", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "wallet-existing", user_id: "user-123" },
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof createClient>);

      const result = await createWalletAction("user-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Dompet sudah ada");
    });

    it("should handle database errors when checking existing wallet", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST100", message: "Connection error" },
            }),
          }),
        }),
      });

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof createClient>);

      const result = await createWalletAction("user-123");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Gagal mengecek status dompet");
    });

    it("should handle creation errors", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116" },
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Insert failed" },
            }),
          }),
        }),
      });

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof createClient>);

      const result = await createWalletAction("user-123");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Gagal membuat dompet");
    });
  });

  // ─── getWalletBalanceAction ─────────────────────────────────────────────

  describe("getWalletBalanceAction", () => {
    it("should return wallet balance successfully", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { pending_balance: 50000, available_balance: 100000 },
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof createClient>);

      const result = await getWalletBalanceAction("user-123");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        pending_balance: 50000,
        available_balance: 100000,
      });
    });

    it("should return error if wallet not found", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116", message: "Not found" },
            }),
          }),
        }),
      });

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof createClient>);

      const result = await getWalletBalanceAction("user-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Dompet tidak ditemukan");
    });
  });

  // ─── getOrCreateWalletAction ─────────────────────────────────────────────

  describe("getOrCreateWalletAction", () => {
    it("should return existing wallet if found", async () => {
      const existingWallet = {
        id: "wallet-existing",
        user_id: "user-123",
        pending_balance: 50000,
        available_balance: 100000,
        created_at: "2026-04-04T09:00:00.000Z",
        updated_at: "2026-04-04T09:00:00.000Z",
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: existingWallet,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof createClient>);

      const result = await getOrCreateWalletAction("user-123");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(existingWallet);
    });

    it("should return false for non-existent wallet without creating", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116", message: "Not found" },
            }),
          }),
        }),
      });

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof createClient>);

      const result = await getOrCreateWalletAction("user-123");

      expect(result.success).toBe(false);
    });
  });
});
