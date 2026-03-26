import { describe, it, expect, vi, beforeEach } from "vitest";

// Module-level client — captured by the factory so tests can set up mocks on it directly
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var _moduleClient: any;

// Mock Supabase — factory captures its client in _moduleClient
// NOTE: eq and maybeSingle use plain vi.fn() (no mockImplementation) because
// mockResolvedValueOnce on a vi.fn() with mockImplementation is broken in vitest 4.0.18
// (the queue is silently ignored). The mockImplementation is set via reassignment in resetAllMocks.
vi.mock("@/lib/supabase/server", () => {
  const client: typeof _moduleClient = {} as any;
  _moduleClient = client;

  client.from = vi.fn().mockImplementation(() => client);
  client.select = vi.fn().mockImplementation(() => client);
  client.eq = vi.fn();
  client.single = vi.fn();
  client.update = vi.fn().mockImplementation(() => client);
  client.insert = vi.fn().mockImplementation(() => client);
  client.limit = vi.fn().mockImplementation(() => client);
  client.order = vi.fn().mockImplementation(() => client);
  client.lt = vi.fn().mockImplementation(() => client);
  client.delete = vi.fn().mockImplementation(() => client);
  client.maybeSingle = vi.fn();

  return {
    createClient: vi.fn().mockResolvedValue(client),
  };
});

// Mock xenditGateway — stored in a var so tests and resetAllMocks can reference it directly
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var _xenditCreateDisbursement: any;

// Store the factory's default implementation so we can restore it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var _xenditDefaultImpl: any;

vi.mock("@/lib/payments", () => {
  // Default implementation returns PENDING
  const defaultFn = vi.fn().mockImplementation(() =>
    Promise.resolve({ id: "disbursement-123", status: "PENDING", amount: 95000 }),
  );
  _xenditCreateDisbursement = defaultFn;
  _xenditDefaultImpl = defaultFn;
  return {
    xenditGateway: {
      createDisbursement: defaultFn,
    },
  };
});

// Mock PAYMENT_CONSTANTS
vi.mock("@/lib/types/payment", () => ({
  PAYMENT_CONSTANTS: {
    MIN_PAYOUT_AMOUNT: 10000,
    MAX_PAYOUT_AMOUNT: 50000000,
    DEFAULT_PAYOUT_FEE_PERCENTAGE: 0.01,
  },
}));

// Import after mocks are set up
import {
  createWalletAction,
  getWalletBalanceAction,
  getOrCreateWalletAction,
  addPendingFundsAction,
  releaseFundsAction,
  deductAvailableFundsAction,
  getWalletTransactionsAction,
  getWalletDetailsAction,
  getWorkerWalletAction,
  requestWithdrawalAction,
} from "../wallets";

// Type alias — tests use this name for the module-level client
type MockClient = typeof _moduleClient;

// Helper to reset all mocks between tests — clears mockResolvedValueOnce queues AND call history
// NOTE: eq and maybeSingle use REASSIGNMENT (not mockReset) because vi.fn() defined inside
// a vi.mock factory has a bug where mockReset does NOT clear the mockResolvedValueOnce queue.
// By reassigning to a fresh vi.fn(), we get a clean slate with no queue.
const resetAllMocks = () => {
  // Reset chain methods via mockReset + mockImplementation (these don't have the bug)
  for (const fn of [
    _moduleClient.from,
    _moduleClient.select,
    _moduleClient.single,
    _moduleClient.update,
    _moduleClient.insert,
    _moduleClient.limit,
    _moduleClient.order,
    _moduleClient.lt,
    _moduleClient.delete,
  ]) {
    fn.mockReset();
    fn.mockImplementation(() => _moduleClient);
  }
  // eq and maybeSingle: use reassignment to avoid the factory vi.fn mockReset bug
  // These new vi.fn() instances properly support mockResolvedValueOnce and mockImplementation
  _moduleClient.eq = vi.fn().mockImplementation(() => _moduleClient);
  _moduleClient.maybeSingle = vi.fn().mockImplementation(() => Promise.resolve(_moduleClient));
  // For xendit: same bug — use reassignment
  _xenditCreateDisbursement = _xenditDefaultImpl;
  _xenditCreateDisbursement.mockReset();
  _xenditCreateDisbursement.mockImplementation(() =>
    Promise.resolve({ id: "disbursement-123", status: "PENDING", amount: 95000 }),
  );
};

// Helper to create a mock wallet
const createMockWallet = (overrides = {}) => ({
  id: "wallet-123",
  user_id: "user-123",
  pending_balance: 100000,
  available_balance: 500000,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe("createWalletAction", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("should create a new wallet successfully", async () => {
    const mockWallet = createMockWallet();

    // First call: check if wallet exists (returns PGRST116 = not found)
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });
    // Second call: insert wallet
    _moduleClient.single.mockResolvedValueOnce({ data: mockWallet, error: null });

    const result = await createWalletAction("user-123");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockWallet);
  });

  it("should return error if wallet already exists", async () => {
    const existingWallet = createMockWallet();

    _moduleClient.single.mockResolvedValueOnce({
      data: existingWallet,
      error: null,
    });

    const result = await createWalletAction("user-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Dompet sudah ada");
  });

  it("should return error if database check fails", async () => {
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "OTHER_ERROR", message: "Database error" },
    });

    const result = await createWalletAction("user-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Gagal mengecek status dompet");
  });

  it("should return error if insert fails", async () => {
    // First call: check if wallet exists
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });
    // Second call: insert fails
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Insert failed" },
    });

    const result = await createWalletAction("user-123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Gagal membuat dompet");
  });
});

describe("getWalletBalanceAction", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("should return wallet balance successfully", async () => {
    _moduleClient.single.mockResolvedValueOnce({
      data: { pending_balance: 100000, available_balance: 500000 },
      error: null,
    });

    const result = await getWalletBalanceAction("user-123");

    expect(result.success).toBe(true);
    expect(result.data?.pending_balance).toBe(100000);
    expect(result.data?.available_balance).toBe(500000);
  });

  it("should return error if wallet not found", async () => {
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });

    const result = await getWalletBalanceAction("user-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Dompet tidak ditemukan");
  });

  it("should return error on database error", async () => {
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "OTHER_ERROR", message: "Database error" },
    });

    const result = await getWalletBalanceAction("user-123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Gagal mengambil saldo dompet");
  });
});

describe("getOrCreateWalletAction", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("should return existing wallet if it exists", async () => {
    const existingWallet = createMockWallet();

    _moduleClient.single.mockResolvedValueOnce({
      data: existingWallet,
      error: null,
    });

    const result = await getOrCreateWalletAction("user-123");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(existingWallet);
  });

  it("should create a new wallet if it does not exist", async () => {
    const newWallet = createMockWallet();

    // First call: fetch existing wallet (not found)
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });
    // Second call: insert new wallet
    _moduleClient.single.mockResolvedValueOnce({ data: newWallet, error: null });

    const result = await getOrCreateWalletAction("user-123");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(newWallet);
  });

  it("should return error if fetch fails", async () => {
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "OTHER_ERROR", message: "Database error" },
    });

    const result = await getOrCreateWalletAction("user-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Gagal mengambil data dompet");
  });

  it("should return error if insert fails", async () => {
    // First call: fetch existing wallet (not found)
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });
    // Second call: insert fails
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Insert failed" },
    });

    const result = await getOrCreateWalletAction("user-123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Gagal membuat dompet");
  });
});

describe("addPendingFundsAction", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("should add pending funds successfully", async () => {
    const wallet = createMockWallet({ pending_balance: 0 });
    const updatedWallet = createMockWallet({ pending_balance: 50000 });

    // First call: fetch wallet
    _moduleClient.single.mockResolvedValueOnce({ data: wallet, error: null });
    // Second call: update wallet
    _moduleClient.single.mockResolvedValueOnce({
      data: updatedWallet,
      error: null,
    });
    // Third call: insert transaction record
    _moduleClient.insert.mockResolvedValueOnce({ error: null });

    const result = await addPendingFundsAction(
      "user-123",
      50000,
      "booking-123",
      "Test payment",
    );

    expect(result.success).toBe(true);
    expect(result.data?.pending_balance).toBe(50000);
  });

  it("should return error if wallet not found", async () => {
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });

    const result = await addPendingFundsAction(
      "user-123",
      50000,
      "booking-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Dompet tidak ditemukan");
  });

  it("should return error if update fails", async () => {
    const wallet = createMockWallet({ pending_balance: 0 });

    _moduleClient.single
      .mockResolvedValueOnce({ data: wallet, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "Update failed" } });

    const result = await addPendingFundsAction(
      "user-123",
      50000,
      "booking-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Gagal menambahkan dana");
  });

  it("should use default description if not provided", async () => {
    const wallet = createMockWallet({ pending_balance: 0 });
    const updatedWallet = createMockWallet({ pending_balance: 50000 });

    _moduleClient.single.mockResolvedValueOnce({ data: wallet, error: null });
    _moduleClient.single.mockResolvedValueOnce({
      data: updatedWallet,
      error: null,
    });
    _moduleClient.insert.mockResolvedValueOnce({ error: null });

    await addPendingFundsAction("user-123", 50000, "booking-123");

    expect(_moduleClient.insert).toHaveBeenCalled();
    const insertCall = _moduleClient.insert.mock.calls[0][0];
    expect(insertCall.description).toBe("Pembayaran pekerjaan selesai");
  });
});

describe("releaseFundsAction", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("should release funds successfully", async () => {
    const wallet = createMockWallet({
      pending_balance: 150000,
      available_balance: 0,
    });
    const updatedWallet = createMockWallet({
      pending_balance: 50000,
      available_balance: 100000,
    });

    _moduleClient.single
      .mockResolvedValueOnce({ data: wallet, error: null }) // fetch wallet
      .mockResolvedValueOnce({ data: updatedWallet, error: null }); // update wallet
    // No mockResolvedValue for update/insert — mockReturnThis() keeps the chain intact

    let result;
    try {
      result = await releaseFundsAction(
        "user-123",
        100000,
        "booking-123",
        "Funds released",
      );
    } catch (e: any) {
      console.log("releaseFundsAction THREW:", e?.message, e?.stack?.split("\n")[0]);
      throw e;
    }

    console.log("releaseFundsAction result:", JSON.stringify(result));
    expect(result.success).toBe(true);
    expect(result.data?.pending_balance).toBe(50000);
    expect(result.data?.available_balance).toBe(100000);
  });

  it("should return error if wallet not found", async () => {
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });

    const result = await releaseFundsAction(
      "user-123",
      100000,
      "booking-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Dompet tidak ditemukan");
  });

  it("should return error if pending balance is insufficient", async () => {
    const wallet = createMockWallet({ pending_balance: 50000 });

    _moduleClient.single.mockResolvedValueOnce({ data: wallet, error: null });

    const result = await releaseFundsAction(
      "user-123",
      100000,
      "booking-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Saldo pending tidak mencukupi");
  });

  it("should return error if update fails", async () => {
    const wallet = createMockWallet({ pending_balance: 100000 });

    _moduleClient.single.mockResolvedValueOnce({ data: wallet, error: null });
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Update failed" },
    });

    const result = await releaseFundsAction(
      "user-123",
      100000,
      "booking-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Gagal melepaskan dana");
  });
});

describe("deductAvailableFundsAction", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("should deduct available funds successfully", async () => {
    const wallet = createMockWallet({ available_balance: 500000 });
    const updatedWallet = createMockWallet({ available_balance: 400000 });

    _moduleClient.single
      .mockResolvedValueOnce({ data: wallet, error: null })
      .mockResolvedValueOnce({ data: updatedWallet, error: null });
    _moduleClient.insert.mockResolvedValue({ error: null });

    const result = await deductAvailableFundsAction(
      "user-123",
      100000,
      "Withdrawal",
    );

    expect(result.success).toBe(true);
    expect(result.data?.available_balance).toBe(400000);
  });

  it("should return error if wallet not found", async () => {
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });

    const result = await deductAvailableFundsAction(
      "user-123",
      100000,
      "Withdrawal",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Dompet tidak ditemukan");
  });

  it("should return error if available balance is insufficient", async () => {
    const wallet = createMockWallet({ available_balance: 50000 });

    _moduleClient.single.mockResolvedValueOnce({ data: wallet, error: null });

    const result = await deductAvailableFundsAction(
      "user-123",
      100000,
      "Withdrawal",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Saldo tersedia tidak mencukupi");
  });

  it("should return error if update fails", async () => {
    const wallet = createMockWallet({ available_balance: 500000 });

    _moduleClient.single.mockResolvedValueOnce({ data: wallet, error: null });
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Update failed" },
    });

    const result = await deductAvailableFundsAction(
      "user-123",
      100000,
      "Withdrawal",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Gagal mengurangi dana");
  });
});

describe("getWalletTransactionsAction", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("should return wallet transactions successfully", async () => {
    const mockTransactions = [
      {
        id: "txn-1",
        wallet_id: "wallet-123",
        amount: 100000,
        type: "hold",
        status: "pending_review",
      },
      {
        id: "txn-2",
        wallet_id: "wallet-123",
        amount: 50000,
        type: "release",
        status: "released",
      },
    ];

    _moduleClient.limit.mockResolvedValueOnce({
      data: mockTransactions,
      error: null,
    });

    const result = await getWalletTransactionsAction("user-123", 50);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockTransactions);
    expect(result.count).toBe(2);
  });

  it("should return error on database error", async () => {
    _moduleClient.limit.mockResolvedValueOnce({
      data: null,
      error: { message: "Database error" },
    });

    const result = await getWalletTransactionsAction("user-123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Gagal mengambil riwayat transaksi");
  });

  it("should use default limit of 50", async () => {
    _moduleClient.limit.mockResolvedValueOnce({ data: [], error: null });

    await getWalletTransactionsAction("user-123");

    expect(_moduleClient.limit).toHaveBeenCalledWith(50);
  });

  it("should use custom limit when provided", async () => {
    _moduleClient.limit.mockResolvedValueOnce({ data: [], error: null });

    await getWalletTransactionsAction("user-123", 10);

    expect(_moduleClient.limit).toHaveBeenCalledWith(10);
  });
});

describe("getWalletDetailsAction", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("should return wallet details successfully", async () => {
    const wallet = createMockWallet();

    _moduleClient.single.mockResolvedValueOnce({ data: wallet, error: null });

    const result = await getWalletDetailsAction("user-123");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(wallet);
  });

  it("should return error if wallet not found", async () => {
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });

    const result = await getWalletDetailsAction("user-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Dompet tidak ditemukan");
  });

  it("should return error on database error", async () => {
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "OTHER_ERROR", message: "Database error" },
    });

    const result = await getWalletDetailsAction("user-123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Gagal mengambil data dompet");
  });
});

describe("getWorkerWalletAction", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("should return existing worker wallet", async () => {
    const worker = { id: "worker-123", user_id: "user-123" };
    const wallet = createMockWallet({ user_id: "user-123" });

    // First call: fetch worker
    _moduleClient.single.mockResolvedValueOnce({ data: worker, error: null });
    // Second call: fetch wallet
    _moduleClient.maybeSingle.mockResolvedValueOnce({
      data: wallet,
      error: null,
    });

    const result = await getWorkerWalletAction("worker-123");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(wallet);
  });

  it("should create new wallet if worker has no wallet", async () => {
    const worker = { id: "worker-123", user_id: "user-123" };
    const newWallet = createMockWallet({ user_id: "user-123" });

    // First call: fetch worker
    _moduleClient.single.mockResolvedValueOnce({ data: worker, error: null });
    // Second call: fetch wallet (not found — maybeSingle returns null data with no error)
    _moduleClient.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // Third call: insert new wallet
    _moduleClient.single.mockResolvedValueOnce({ data: newWallet, error: null });

    const result = await getWorkerWalletAction("worker-123");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(newWallet);
  });

  it("should return error if worker not found", async () => {
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });

    const result = await getWorkerWalletAction("worker-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Worker tidak ditemukan");
  });

  it("should return error if wallet fetch fails", async () => {
    const worker = { id: "worker-123", user_id: "user-123" };

    _moduleClient.single.mockResolvedValueOnce({ data: worker, error: null });
    _moduleClient.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "Database error" },
    });

    const result = await getWorkerWalletAction("worker-123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Gagal mengambil data dompet");
  });

  it("should return error if wallet creation fails", async () => {
    const worker = { id: "worker-123", user_id: "user-123" };

    _moduleClient.single.mockResolvedValueOnce({ data: worker, error: null });
    // maybeSingle returns null data with no error when wallet not found
    _moduleClient.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // Insert fails
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Insert failed" },
    });

    const result = await getWorkerWalletAction("worker-123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Gagal membuat dompet");
  });
});

describe("requestWithdrawalAction", () => {
  beforeEach(() => {
    resetAllMocks();
    // _xenditCreateDisbursement is restored to default (PENDING) by resetAllMocks.
    // Tests that need xendit to be called use _xenditCreateDisbursement.mockResolvedValueOnce(...)
  });

  it("should process withdrawal successfully", async () => {
    const worker = {
      id: "worker-123",
      user_id: "user-123",
      full_name: "John Doe",
    };
    const wallet = {
      id: "wallet-123",
      user_id: "user-123",
      pending_balance: 0,
      available_balance: 500000,
    };
    const bankAccount = {
      id: "bank-123",
      worker_id: "worker-123",
      bank_code: "BCA",
      bank_account_number: "1234567890",
      bank_account_name: "John Doe",
    };
    const payoutRequest = {
      id: "payout-123",
      created_at: new Date().toISOString(),
    };

    _xenditCreateDisbursement.mockResolvedValueOnce({
      id: "disbursement-123",
      status: "PENDING",
      amount: 95000, // net_amount = 100000 - 5000 fee
    });

    // 1. Fetch worker (single)
    _moduleClient.single.mockResolvedValueOnce({ data: worker, error: null });
    // 2. Fetch wallet (maybeSingle — implementation uses maybeSingle())
    _moduleClient.maybeSingle.mockResolvedValueOnce({ data: wallet, error: null });
    // 3. Fetch bank account (single)
    _moduleClient.single.mockResolvedValueOnce({
      data: bankAccount,
      error: null,
    });
    // 4. Insert payout request — insert().select().single() calls single() at the end
    _moduleClient.single.mockResolvedValueOnce({
      data: payoutRequest,
      error: null,
    });

    const result = await requestWithdrawalAction("worker-123", {
      amount: 100000,
      bankAccountId: "bank-123",
    });

    expect(result.success).toBe(true);
    expect(result.data?.amount).toBe(95000); // net_amount = 100000 - 5000 fee
    expect(result.data?.status).toBe("processing");
  });

  it("should return error if worker not found", async () => {
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });

    const result = await requestWithdrawalAction("worker-123", {
      amount: 100000,
      bankAccountId: "bank-123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Worker tidak ditemukan");
  });

  it("should return error if wallet not found", async () => {
    const worker = {
      id: "worker-123",
      user_id: "user-123",
      full_name: "John Doe",
    };

    _moduleClient.single.mockResolvedValueOnce({ data: worker, error: null });
    // maybeSingle returns { data: null, error: null } when no rows (no error object)
    _moduleClient.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await requestWithdrawalAction("worker-123", {
      amount: 100000,
      bankAccountId: "bank-123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Dompet tidak ditemukan");
  });

  it("should return error if insufficient balance", async () => {
    const worker = {
      id: "worker-123",
      user_id: "user-123",
      full_name: "John Doe",
    };
    const wallet = {
      id: "wallet-123",
      user_id: "user-123",
      available_balance: 50000,
    };

    _moduleClient.single.mockResolvedValueOnce({ data: worker, error: null });
    _moduleClient.maybeSingle.mockResolvedValueOnce({ data: wallet, error: null });

    const result = await requestWithdrawalAction("worker-123", {
      amount: 100000,
      bankAccountId: "bank-123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Saldo tidak mencukupi");
  });

  it("should return error if amount below minimum", async () => {
    const worker = {
      id: "worker-123",
      user_id: "user-123",
      full_name: "John Doe",
    };
    const wallet = {
      id: "wallet-123",
      user_id: "user-123",
      available_balance: 500000,
    };

    _moduleClient.single.mockResolvedValueOnce({ data: worker, error: null });
    _moduleClient.maybeSingle.mockResolvedValueOnce({ data: wallet, error: null });

    const result = await requestWithdrawalAction("worker-123", {
      amount: 5000,
      bankAccountId: "bank-123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Minimal penarikan adalah");
  });

  it("should return error if amount exceeds maximum", async () => {
    const worker = {
      id: "worker-123",
      user_id: "user-123",
      full_name: "John Doe",
    };
    const wallet = {
      id: "wallet-123",
      user_id: "user-123",
      available_balance: 100000000,
    };

    _moduleClient.single.mockResolvedValueOnce({ data: worker, error: null });
    _moduleClient.maybeSingle.mockResolvedValueOnce({ data: wallet, error: null });

    const result = await requestWithdrawalAction("worker-123", {
      amount: 100000000,
      bankAccountId: "bank-123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Maksimal penarikan adalah");
  });

  it("should return error if bank account not found", async () => {
    const worker = {
      id: "worker-123",
      user_id: "user-123",
      full_name: "John Doe",
    };
    const wallet = {
      id: "wallet-123",
      user_id: "user-123",
      available_balance: 500000,
    };

    _moduleClient.single.mockResolvedValueOnce({ data: worker, error: null });
    _moduleClient.maybeSingle.mockResolvedValueOnce({ data: wallet, error: null });
    // Bank account not found
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });

    const result = await requestWithdrawalAction("worker-123", {
      amount: 100000,
      bankAccountId: "bank-123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Rekening bank tidak ditemukan");
  });

  it("should return error if payout request creation fails", async () => {
    const worker = {
      id: "worker-123",
      user_id: "user-123",
      full_name: "John Doe",
    };
    const wallet = {
      id: "wallet-123",
      user_id: "user-123",
      available_balance: 500000,
    };
    const bankAccount = {
      id: "bank-123",
      worker_id: "worker-123",
      bank_code: "BCA",
      bank_account_number: "1234567890",
      bank_account_name: "John Doe",
    };

    _moduleClient.single.mockResolvedValueOnce({ data: worker, error: null });
    _moduleClient.maybeSingle.mockResolvedValueOnce({ data: wallet, error: null });
    _moduleClient.single.mockResolvedValueOnce({
      data: bankAccount,
      error: null,
    });
    _moduleClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Insert failed" },
    });

    const result = await requestWithdrawalAction("worker-123", {
      amount: 100000,
      bankAccountId: "bank-123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Gagal membuat permintaan penarikan");
  });

  it("should handle disbursement failure and rollback", async () => {
    const worker = {
      id: "worker-123",
      user_id: "user-123",
      full_name: "John Doe",
    };
    const wallet = {
      id: "wallet-123",
      user_id: "user-123",
      available_balance: 500000,
    };
    const bankAccount = {
      id: "bank-123",
      worker_id: "worker-123",
      bank_code: "BCA",
      bank_account_number: "1234567890",
      bank_account_name: "John Doe",
    };
    const payoutRequest = {
      id: "payout-123",
      created_at: new Date().toISOString(),
    };

    _xenditCreateDisbursement.mockRejectedValueOnce(
      new Error("Xendit API error"),
    );

    _moduleClient.single.mockResolvedValueOnce({ data: worker, error: null });
    _moduleClient.maybeSingle.mockResolvedValueOnce({ data: wallet, error: null });
    _moduleClient.single.mockResolvedValueOnce({
      data: bankAccount,
      error: null,
    });
    _moduleClient.single.mockResolvedValueOnce({
      data: payoutRequest,
      error: null,
    });
    // No update mock needed — mockReturnThis() keeps the chain intact

    const result = await requestWithdrawalAction("worker-123", {
      amount: 100000,
      bankAccountId: "bank-123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Gagal memproses penarikan");
  });

  it("should return error if wallet update after disbursement fails", async () => {
    const worker = {
      id: "worker-123",
      user_id: "user-123",
      full_name: "John Doe",
    };
    const wallet = {
      id: "wallet-123",
      user_id: "user-123",
      available_balance: 500000,
    };
    const bankAccount = {
      id: "bank-123",
      worker_id: "worker-123",
      bank_code: "BCA",
      bank_account_number: "1234567890",
      bank_account_name: "John Doe",
    };
    const payoutRequest = {
      id: "payout-123",
      created_at: new Date().toISOString(),
    };

    // Xendit succeeds — use mockResolvedValueOnce to queue the resolved value
    _xenditCreateDisbursement.mockResolvedValueOnce({
      id: "disbursement-success",
      status: "PENDING",
      amount: 95000,
    });

    // DB: worker, wallet, bank account, payout request insert
    _moduleClient.single.mockResolvedValueOnce({ data: worker, error: null });
    _moduleClient.maybeSingle.mockResolvedValueOnce({ data: wallet, error: null });
    _moduleClient.single.mockResolvedValueOnce({ data: bankAccount, error: null });
    _moduleClient.single.mockResolvedValueOnce({ data: payoutRequest, error: null });

    // Queue error for 5th eq call (wallet update) using counter-based mockImplementation
    // Note: mockResolvedValueOnce on a reassigned vi.fn() IS consumed but mockImplementation
    // overrides it, so we use a counter to ensure the error is returned on the right call.
    let eqCallCount = 0;
    _moduleClient.eq = vi.fn().mockImplementation((..._args: unknown[]) => {
      eqCallCount++;
      if (eqCallCount >= 5) {
        return Promise.resolve({ error: { message: "Update failed" } }) as unknown as typeof _moduleClient;
      }
      return _moduleClient;
    });

    const result = await requestWithdrawalAction("worker-123", {
      amount: 100000,
      bankAccountId: "bank-123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Gagal mengupdate saldo");
  });
});
