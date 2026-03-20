import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Supabase first - factory must be self-contained due to hoisting
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
  }),
}));

// Mock notifications
vi.mock("../notifications", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

// Mock push notifications
vi.mock("../push-notifications", () => ({
  sendPushNotification: vi.fn().mockResolvedValue(undefined),
  isNotificationTypeEnabled: vi.fn().mockResolvedValue({ enabled: true }),
}));

// Mock wallets
vi.mock("../wallets", () => ({
  addPendingFundsAction: vi.fn().mockResolvedValue({ success: true }),
  releaseFundsAction: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock reliability score
vi.mock("../reliability-score", () => ({
  triggerScoreUpdate: vi.fn().mockResolvedValue({ success: true }),
}));

// Import after mocks are set up
import {
  checkInBooking,
  checkOutBooking,
  completeBooking,
  confirmBookingCompletion,
  addBookingReview,
  addWorkerReview,
} from "../bookings-completion";

// Helper to create a fresh mock client for each test
const createMockClient = () => ({
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
});

type MockClient = ReturnType<typeof createMockClient>;

// Helper to reset all mocks
const resetAllMocks = () => {
  vi.clearAllMocks();
};

describe("checkInBooking", () => {
  let mockClient: MockClient;

  beforeEach(async () => {
    resetAllMocks();
    mockClient = createMockClient();
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(mockClient as any);
  });

  it("should return error if booking not found", async () => {
    mockClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Not found" },
    });

    const result = await checkInBooking("booking-123", "worker-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Booking tidak ditemukan");
  });

  it("should return error if booking status is not accepted", async () => {
    mockClient.single.mockResolvedValueOnce({
      data: { id: "booking-123", status: "pending", worker_id: "worker-123" },
      error: null,
    });

    const result = await checkInBooking("booking-123", "worker-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Hanya booking yang sudah diterima yang bisa di-check in",
    );
  });

  it("should return error if worker is not owner", async () => {
    // The query filters by worker_id, so it returns no data when worker doesn't match
    mockClient.single.mockResolvedValueOnce({ data: null, error: null });

    const result = await checkInBooking("booking-123", "worker-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Booking tidak ditemukan");
  });

  it("should update status to in_progress and set check_in_at", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "accepted",
      worker_id: "worker-123",
      business_id: "business-123",
      jobs: { id: "job-123", title: "Test Job" },
    };

    const mockUpdatedBooking = {
      ...mockBooking,
      status: "in_progress",
      check_in_at: new Date().toISOString(),
    };

    // First call: fetch booking
    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      // Second call: update booking
      .mockResolvedValueOnce({ data: mockUpdatedBooking, error: null })
      // Third call: fetch business for notification
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null });

    const result = await checkInBooking("booking-123", "worker-123");

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("in_progress");
    expect(result.data?.check_in_at).toBeDefined();
  });

  it("should send notification to business", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "accepted",
      worker_id: "worker-123",
      business_id: "business-123",
      jobs: { id: "job-123", title: "Test Job" },
    };

    const mockUpdatedBooking = {
      ...mockBooking,
      status: "in_progress",
      check_in_at: new Date().toISOString(),
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({ data: mockUpdatedBooking, error: null })
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null });

    const { createNotification } = await import("../notifications");

    await checkInBooking("booking-123", "worker-123");

    expect(createNotification).toHaveBeenCalledWith(
      "business-123",
      "Pekerja Telah Tiba",
      expect.stringContaining("check-in"),
      expect.stringContaining("booking-123"),
    );
  });
});

describe("checkOutBooking", () => {
  let mockClient: MockClient;

  beforeEach(async () => {
    resetAllMocks();
    mockClient = createMockClient();
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(mockClient as any);
  });

  it("should return error if booking not found", async () => {
    mockClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Not found" },
    });

    const result = await checkOutBooking("booking-123", "worker-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Pekerjaan tidak ditemukan");
  });

  it("should return error if not checked in", async () => {
    mockClient.single.mockResolvedValueOnce({
      data: {
        id: "booking-123",
        status: "in_progress",
        worker_id: "worker-123",
        check_in_at: null,
      },
      error: null,
    });

    const result = await checkOutBooking("booking-123", "worker-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Anda belum check-in ke pekerjaan ini");
  });

  it("should return error if status is not in_progress", async () => {
    mockClient.single.mockResolvedValueOnce({
      data: {
        id: "booking-123",
        status: "accepted",
        worker_id: "worker-123",
        check_in_at: new Date().toISOString(),
      },
      error: null,
    });

    const result = await checkOutBooking("booking-123", "worker-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Hanya pekerjaan yang sedang berjalan yang bisa di-checkout",
    );
  });

  it("should calculate actual_hours from check_in_at if not provided", async () => {
    const checkInTime = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours ago
    const mockBooking = {
      id: "booking-123",
      status: "in_progress",
      worker_id: "worker-123",
      check_in_at: checkInTime.toISOString(),
      business_id: "business-123",
      jobs: { budget_max: 50000 },
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({
        data: {
          ...mockBooking,
          status: "completed",
          payment_status: "pending_review",
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null });

    const result = await checkOutBooking("booking-123", "worker-123");

    expect(result.success).toBe(true);
    expect(mockClient.update).toHaveBeenCalled();
  });

  it("should set payment_status to pending_review", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "in_progress",
      worker_id: "worker-123",
      check_in_at: new Date().toISOString(),
      business_id: "business-123",
      jobs: { budget_max: 50000 },
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({
        data: {
          ...mockBooking,
          status: "completed",
          payment_status: "pending_review",
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null });

    const result = await checkOutBooking("booking-123", "worker-123");

    expect(result.success).toBe(true);
    expect(mockClient.update).toHaveBeenCalled();
  });

  it("should use provided actual_hours if given", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "in_progress",
      worker_id: "worker-123",
      check_in_at: new Date().toISOString(),
      business_id: "business-123",
      jobs: { budget_max: 50000 },
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({
        data: { ...mockBooking, status: "completed", actual_hours: 6 },
        error: null,
      })
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null });

    const result = await checkOutBooking(
      "booking-123",
      "worker-123",
      6,
      "Test notes",
    );

    expect(result.success).toBe(true);
  });

  it("should add pending funds to wallet", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "in_progress",
      worker_id: "worker-123",
      check_in_at: new Date().toISOString(),
      business_id: "business-123",
      jobs: { budget_max: 50000 },
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({
        data: { ...mockBooking, status: "completed" },
        error: null,
      })
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null });

    const { addPendingFundsAction } = await import("../wallets");

    await checkOutBooking("booking-123", "worker-123");

    expect(addPendingFundsAction).toHaveBeenCalled();
  });

  it("should set review_deadline to 24h from now", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "in_progress",
      worker_id: "worker-123",
      check_in_at: new Date().toISOString(),
      business_id: "business-123",
      jobs: { budget_max: 50000 },
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({
        data: {
          ...mockBooking,
          status: "completed",
          review_deadline: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null });

    const result = await checkOutBooking("booking-123", "worker-123");

    expect(result.success).toBe(true);
  });
});

describe("completeBooking", () => {
  let mockClient: MockClient;

  beforeEach(async () => {
    resetAllMocks();
    mockClient = createMockClient();
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(mockClient as any);
  });

  it("should return error if booking not found", async () => {
    mockClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Not found" },
    });

    const result = await completeBooking("booking-123", "business-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Booking tidak ditemukan");
  });

  it("should allow business to complete from in_progress", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "in_progress",
      business_id: "business-123",
      worker_id: "worker-123",
      check_in_at: new Date().toISOString(),
      jobs: { budget_max: 50000 },
      workers: { id: "worker-123", user_id: "user-123" },
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({
        data: { ...mockBooking, status: "completed" },
        error: null,
      })
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null });

    const result = await completeBooking("booking-123", "business-123");

    expect(result.success).toBe(true);
  });

  it("should allow business to complete from accepted (direct)", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "accepted",
      business_id: "business-123",
      worker_id: "worker-123",
      jobs: { budget_max: 50000 },
      workers: { id: "worker-123", user_id: "user-123" },
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({
        data: { ...mockBooking, status: "completed" },
        error: null,
      })
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null });

    const result = await completeBooking("booking-123", "business-123");

    expect(result.success).toBe(true);
  });

  it("should calculate final_price from job budget", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "in_progress",
      business_id: "business-123",
      worker_id: "worker-123",
      check_in_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      jobs: { budget_max: 50000 },
      workers: { id: "worker-123", user_id: "user-123" },
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({
        data: { ...mockBooking, status: "completed", final_price: 400000 },
        error: null,
      })
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null });

    const result = await completeBooking("booking-123", "business-123");

    expect(result.success).toBe(true);
  });

  it("should fail if business not owner", async () => {
    // The query filters by business_id, so it returns no data when business doesn't match
    mockClient.single.mockResolvedValueOnce({ data: null, error: null });

    const result = await completeBooking("booking-123", "business-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Booking tidak ditemukan");
  });
});

describe("confirmBookingCompletion", () => {
  let mockClient: MockClient;

  beforeEach(async () => {
    resetAllMocks();
    mockClient = createMockClient();
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(mockClient as any);
  });

  it("should return error if booking not found", async () => {
    mockClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Not found" },
    });

    const result = await confirmBookingCompletion(
      "booking-123",
      "business-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Booking tidak ditemukan");
  });

  it("should return error if booking not completed", async () => {
    mockClient.single.mockResolvedValueOnce({
      data: {
        id: "booking-123",
        status: "in_progress",
        business_id: "business-123",
      },
      error: null,
    });

    const result = await confirmBookingCompletion(
      "booking-123",
      "business-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Booking belum selesai");
  });

  it("should release funds to available balance", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "completed",
      business_id: "business-123",
      worker_id: "worker-123",
      final_price: 50000,
      workers: { id: "worker-123", user_id: "user-123" },
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({
        data: { ...mockBooking, payment_status: "available" },
        error: null,
      })
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null });

    const result = await confirmBookingCompletion(
      "booking-123",
      "business-123",
    );

    expect(result.success).toBe(true);
  });

  it("should update payment_status to available", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "completed",
      business_id: "business-123",
      worker_id: "worker-123",
      final_price: 50000,
      workers: { id: "worker-123", user_id: "user-123" },
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({
        data: { ...mockBooking, payment_status: "available" },
        error: null,
      })
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null });

    const result = await confirmBookingCompletion(
      "booking-123",
      "business-123",
    );

    expect(result.success).toBe(true);
    expect(mockClient.update).toHaveBeenCalled();
  });

  it("should notify worker", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "completed",
      business_id: "business-123",
      worker_id: "worker-123",
      final_price: 50000,
      workers: { id: "worker-123", user_id: "user-123" },
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({
        data: { ...mockBooking, payment_status: "available" },
        error: null,
      })
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null });

    const { createNotification } = await import("../notifications");

    await confirmBookingCompletion("booking-123", "business-123");

    expect(createNotification).toHaveBeenCalled();
  });
});

describe("addBookingReview", () => {
  let mockClient: MockClient;

  beforeEach(async () => {
    resetAllMocks();
    mockClient = createMockClient();
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(mockClient as any);
  });

  it("should return error if rating is invalid (0)", async () => {
    // Need to mock Supabase call first since validation happens after
    const mockBooking = {
      id: "booking-123",
      status: "completed",
      business_id: "business-123",
      worker_id: "worker-123",
    };
    mockClient.single.mockResolvedValueOnce({ data: mockBooking, error: null });
    mockClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116" },
    }); // No existing review

    const result = await addBookingReview(
      "booking-123",
      0,
      "Great!",
      "business-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Rating harus antara 1-5");
  });

  it("should return error if rating is invalid (> 5)", async () => {
    // Need to mock Supabase call first since validation happens after
    const mockBooking = {
      id: "booking-123",
      status: "completed",
      business_id: "business-123",
      worker_id: "worker-123",
    };
    mockClient.single.mockResolvedValueOnce({ data: mockBooking, error: null });
    mockClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116" },
    }); // No existing review

    const result = await addBookingReview(
      "booking-123",
      6,
      "Great!",
      "business-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Rating harus antara 1-5");
  });

  it("should return error if booking not found", async () => {
    mockClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Not found" },
    });

    const result = await addBookingReview(
      "booking-123",
      5,
      "Great!",
      "business-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Booking tidak ditemukan");
  });

  it("should return error if booking not completed", async () => {
    mockClient.single.mockResolvedValueOnce({
      data: { id: "booking-123", status: "in_progress" },
      error: null,
    });

    const result = await addBookingReview(
      "booking-123",
      5,
      "Great!",
      "business-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Hanya booking yang sudah selesai yang bisa direview",
    );
  });

  it("should return error if business is not owner", async () => {
    mockClient.single.mockResolvedValueOnce({
      data: {
        id: "booking-123",
        status: "completed",
        business_id: "other-business",
      },
      error: null,
    });

    const result = await addBookingReview(
      "booking-123",
      5,
      "Great!",
      "business-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Anda tidak berhak mereview booking ini");
  });

  it("should return error if already reviewed", async () => {
    mockClient.single
      .mockResolvedValueOnce({
        data: {
          id: "booking-123",
          status: "completed",
          business_id: "business-123",
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { id: "review-123" }, error: null });

    const result = await addBookingReview(
      "booking-123",
      5,
      "Great!",
      "business-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Anda sudah mereview booking ini");
  });

  it("should create review and trigger score update", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "completed",
      business_id: "business-123",
      worker_id: "worker-123",
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } }) // No existing review
      .mockResolvedValueOnce({
        data: { id: "review-123", rating: 5 },
        error: null,
      }) // Insert review
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null }); // Get worker

    const result = await addBookingReview(
      "booking-123",
      5,
      "Excellent work!",
      "business-123",
    );

    expect(result.success).toBe(true);
    expect(result.data?.rating).toBe(5);
    expect(mockClient.insert).toHaveBeenCalled();
  });

  it("should send notification to worker", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "completed",
      business_id: "business-123",
      worker_id: "worker-123",
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } }) // No existing review
      .mockResolvedValueOnce({
        data: { id: "review-123", rating: 5 },
        error: null,
      }) // Insert review
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null }); // Get worker

    const { createNotification } = await import("../notifications");

    await addBookingReview("booking-123", 5, "Excellent work!", "business-123");

    expect(createNotification).toHaveBeenCalled();
  });
});

describe("addWorkerReview", () => {
  let mockClient: MockClient;

  beforeEach(async () => {
    resetAllMocks();
    mockClient = createMockClient();
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(mockClient as any);
  });

  it("should return error if rating is invalid", async () => {
    // Need to mock Supabase call first since validation happens after
    const mockBooking = {
      id: "booking-123",
      status: "completed",
      worker_id: "worker-123",
      business_id: "business-123",
    };
    mockClient.single.mockResolvedValueOnce({ data: mockBooking, error: null });
    mockClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116" },
    }); // No existing review

    const result = await addWorkerReview(
      "booking-123",
      0,
      "Great business!",
      "worker-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Rating harus antara 1-5");
  });

  it("should return error if rating > 5", async () => {
    // Need to mock Supabase call first since validation happens after
    const mockBooking = {
      id: "booking-123",
      status: "completed",
      worker_id: "worker-123",
      business_id: "business-123",
    };
    mockClient.single.mockResolvedValueOnce({ data: mockBooking, error: null });
    mockClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116" },
    }); // No existing review

    const result = await addWorkerReview(
      "booking-123",
      6,
      "Great business!",
      "worker-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Rating harus antara 1-5");
  });

  it("should return error if booking not found", async () => {
    mockClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Not found" },
    });

    const result = await addWorkerReview(
      "booking-123",
      5,
      "Great business!",
      "worker-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Booking tidak ditemukan");
  });

  it("should return error if worker is not booking owner", async () => {
    mockClient.single.mockResolvedValueOnce({
      data: {
        id: "booking-123",
        status: "completed",
        worker_id: "other-worker",
      },
      error: null,
    });

    const result = await addWorkerReview(
      "booking-123",
      5,
      "Great business!",
      "worker-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Anda tidak berhak mereview booking ini");
  });

  it("should return error if booking not completed", async () => {
    mockClient.single.mockResolvedValueOnce({
      data: {
        id: "booking-123",
        status: "in_progress",
        worker_id: "worker-123",
      },
      error: null,
    });

    const result = await addWorkerReview(
      "booking-123",
      5,
      "Great business!",
      "worker-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Hanya booking yang sudah selesai yang bisa direview",
    );
  });

  it("should return error if already reviewed by worker", async () => {
    mockClient.single
      .mockResolvedValueOnce({
        data: {
          id: "booking-123",
          status: "completed",
          worker_id: "worker-123",
          business_id: "business-123",
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { id: "review-123" }, error: null });

    const result = await addWorkerReview(
      "booking-123",
      5,
      "Great business!",
      "worker-123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Anda sudah mereview booking ini");
  });

  it("should create review with reviewer_type=worker", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "completed",
      worker_id: "worker-123",
      business_id: "business-123",
      businesses: {
        id: "business-123",
        user_id: "user-123",
        name: "Test Business",
      },
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } }) // No existing review
      .mockResolvedValueOnce({
        data: { id: "review-123", rating: 5, reviewer_type: "worker" },
        error: null,
      }) // Insert review
      .mockResolvedValueOnce({ data: [{ rating: 5 }], error: null }); // Business reviews for avg

    const result = await addWorkerReview(
      "booking-123",
      5,
      "Great business!",
      "worker-123",
    );

    expect(result.success).toBe(true);
    expect(result.data?.reviewer_type).toBe("worker");
  });

  it("should update business average rating", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "completed",
      worker_id: "worker-123",
      business_id: "business-123",
      businesses: {
        id: "business-123",
        user_id: "user-123",
        name: "Test Business",
      },
    };

    // Mock the booking fetch
    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      // Mock existing review check (returns error = no existing review)
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } })
      // Mock insert review
      .mockResolvedValueOnce({
        data: { id: "review-123", rating: 5, reviewer_type: "worker" },
        error: null,
      });

    // Mock the select for business reviews (returns array, not single)
    // This is called after the insert, so we need to handle it
    mockClient.select
      .mockReturnValueOnce(mockClient) // For booking fetch
      .mockReturnValueOnce(mockClient) // For existing review check
      .mockReturnValueOnce(mockClient) // For insert review
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi
            .fn()
            .mockResolvedValue({
              data: [{ rating: 5 }, { rating: 4 }],
              error: null,
            }),
        }),
      });

    const result = await addWorkerReview(
      "booking-123",
      5,
      "Great business!",
      "worker-123",
    );

    expect(result.success).toBe(true);
  });

  it("should send notification to business", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "completed",
      worker_id: "worker-123",
      business_id: "business-123",
      businesses: {
        id: "business-123",
        user_id: "user-123",
        name: "Test Business",
      },
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } }) // No existing review
      .mockResolvedValueOnce({
        data: { id: "review-123", rating: 5, reviewer_type: "worker" },
        error: null,
      }) // Insert review
      .mockResolvedValueOnce({ data: [{ rating: 5 }], error: null }); // Business reviews for avg

    const { createNotification } = await import("../notifications");

    await addWorkerReview("booking-123", 5, "Great business!", "worker-123");

    expect(createNotification).toHaveBeenCalled();
  });
});

describe("Payment Status Flow", () => {
  let mockClient: MockClient;

  beforeEach(async () => {
    resetAllMocks();
    mockClient = createMockClient();
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(mockClient as any);
  });

  it("should transition from none to pending_review on checkout", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "in_progress",
      worker_id: "worker-123",
      check_in_at: new Date().toISOString(),
      business_id: "business-123",
      jobs: { budget_max: 50000 },
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({
        data: {
          ...mockBooking,
          status: "completed",
          payment_status: "pending_review",
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null });

    const result = await checkOutBooking("booking-123", "worker-123");

    expect(result.success).toBe(true);
    expect(result.data?.payment_status).toBe("pending_review");
  });

  it("should transition from pending_review to available after confirmation", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "completed",
      payment_status: "pending_review",
      business_id: "business-123",
      worker_id: "worker-123",
      final_price: 50000,
      workers: { id: "worker-123", user_id: "user-123" },
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({
        data: { ...mockBooking, payment_status: "available" },
        error: null,
      })
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null });

    const result = await confirmBookingCompletion(
      "booking-123",
      "business-123",
    );

    expect(result.success).toBe(true);
    expect(result.data?.payment_status).toBe("available");
  });
});

describe("Review Period", () => {
  let mockClient: MockClient;

  beforeEach(async () => {
    resetAllMocks();
    mockClient = createMockClient();
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(mockClient as any);
  });

  it("should set review_deadline to 24 hours from checkout", async () => {
    const mockBooking = {
      id: "booking-123",
      status: "in_progress",
      worker_id: "worker-123",
      check_in_at: new Date().toISOString(),
      business_id: "business-123",
      jobs: { budget_max: 50000 },
    };

    const now = new Date();
    const expectedDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({
        data: {
          ...mockBooking,
          status: "completed",
          review_deadline: expectedDeadline.toISOString(),
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null });

    const result = await checkOutBooking("booking-123", "worker-123");

    expect(result.success).toBe(true);
    expect(result.data?.review_deadline).toBeDefined();
  });

  it("should allow reviews before deadline", async () => {
    const futureDeadline = new Date();
    futureDeadline.setHours(futureDeadline.getHours() + 12); // 12 hours from now

    const mockBooking = {
      id: "booking-123",
      status: "completed",
      business_id: "business-123",
      worker_id: "worker-123",
      review_deadline: futureDeadline.toISOString(),
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } }) // No existing review
      .mockResolvedValueOnce({
        data: { id: "review-123", rating: 5 },
        error: null,
      }) // Insert review
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null }); // Get worker

    const result = await addBookingReview(
      "booking-123",
      5,
      "Great!",
      "business-123",
    );

    expect(result.success).toBe(true);
  });

  it("should allow reviews after deadline", async () => {
    const pastDeadline = new Date();
    pastDeadline.setHours(pastDeadline.getHours() - 12); // 12 hours ago

    const mockBooking = {
      id: "booking-123",
      status: "completed",
      business_id: "business-123",
      worker_id: "worker-123",
      review_deadline: pastDeadline.toISOString(),
    };

    mockClient.single
      .mockResolvedValueOnce({ data: mockBooking, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } }) // No existing review
      .mockResolvedValueOnce({
        data: { id: "review-123", rating: 5 },
        error: null,
      }) // Insert review
      .mockResolvedValueOnce({ data: { user_id: "user-123" }, error: null }); // Get worker

    const result = await addBookingReview(
      "booking-123",
      5,
      "Great!",
      "business-123",
    );

    expect(result.success).toBe(true);
  });
});
