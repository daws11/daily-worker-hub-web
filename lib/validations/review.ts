/**
 * Review Validation Schemas
 *
 * Zod schemas for review submission and management
 */

import { z } from "zod";

/**
 * Review type enum
 */
export const reviewTypeEnum = z.enum(
  ["worker_to_business", "business_to_worker"],
  {
    message: "Tipe review tidak valid",
  },
);

/**
 * Review submission schema
 */
export const createReviewSchema = z
  .object({
    booking_id: z
      .string()
      .min(1, "Booking ID wajib diisi")
      .uuid("Booking ID tidak valid"),

    reviewer_id: z
      .string()
      .min(1, "Reviewer ID wajib diisi")
      .uuid("Reviewer ID tidak valid"),

    reviewee_id: z
      .string()
      .min(1, "Reviewee ID wajib diisi")
      .uuid("Reviewee ID tidak valid"),

    review_type: reviewTypeEnum,

    rating: z
      .number({
        message: "Rating harus berupa angka",
      })
      .int("Rating harus berupa angka bulat")
      .min(1, "Rating minimal 1")
      .max(5, "Rating maksimal 5"),

    punctuality_rating: z
      .number({
        message: "Rating ketepatan waktu harus berupa angka",
      })
      .int("Rating harus berupa angka bulat")
      .min(1, "Rating minimal 1")
      .max(5, "Rating maksimal 5")
      .optional(),

    quality_rating: z
      .number({
        message: "Rating kualitas harus berupa angka",
      })
      .int("Rating harus berupa angka bulat")
      .min(1, "Rating minimal 1")
      .max(5, "Rating maksimal 5")
      .optional(),

    communication_rating: z
      .number({
        message: "Rating komunikasi harus berupa angka",
      })
      .int("Rating harus berupa angka bulat")
      .min(1, "Rating minimal 1")
      .max(5, "Rating maksimal 5")
      .optional(),

    professionalism_rating: z
      .number({
        message: "Rating profesionalisme harus berupa angka",
      })
      .int("Rating harus berupa angka bulat")
      .min(1, "Rating minimal 1")
      .max(5, "Rating maksimal 5")
      .optional(),

    comment: z
      .string()
      .min(1, "Komentar wajib diisi")
      .min(10, "Komentar minimal 10 karakter")
      .max(1000, "Komentar maksimal 1000 karakter"),

    pros: z
      .string()
      .max(500, "Kelebihan maksimal 500 karakter")
      .optional()
      .or(z.literal("")),

    cons: z
      .string()
      .max(500, "Kekurangan maksimal 500 karakter")
      .optional()
      .or(z.literal("")),

    would_recommend: z.boolean().optional(),

    would_work_again: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Reviewer and reviewee must be different
      return data.reviewer_id !== data.reviewee_id;
    },
    {
      message: "Reviewer dan reviewee tidak boleh sama",
      path: ["reviewee_id"],
    },
  )
  .refine((data) => {
    // If review_type is worker_to_business, reviewer should be a worker
    // and reviewee should be a business (validation would happen at API level)
    return true;
  });

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

/**
 * Review update schema
 */
export const updateReviewSchema = z.object({
  rating: z
    .number({
      message: "Rating harus berupa angka",
    })
    .int("Rating harus berupa angka bulat")
    .min(1, "Rating minimal 1")
    .max(5, "Rating maksimal 5")
    .optional(),

  punctuality_rating: z
    .number({
      message: "Rating ketepatan waktu harus berupa angka",
    })
    .int("Rating harus berupa angka bulat")
    .min(1, "Rating minimal 1")
    .max(5, "Rating maksimal 5")
    .optional(),

  quality_rating: z
    .number({
      message: "Rating kualitas harus berupa angka",
    })
    .int("Rating harus berupa angka bulat")
    .min(1, "Rating minimal 1")
    .max(5, "Rating maksimal 5")
    .optional(),

  communication_rating: z
    .number({
      message: "Rating komunikasi harus berupa angka",
    })
    .int("Rating harus berupa angka bulat")
    .min(1, "Rating minimal 1")
    .max(5, "Rating maksimal 5")
    .optional(),

  professionalism_rating: z
    .number({
      message: "Rating profesionalisme harus berupa angka",
    })
    .int("Rating harus berupa angka bulat")
    .min(1, "Rating minimal 1")
    .max(5, "Rating maksimal 5")
    .optional(),

  comment: z
    .string()
    .min(10, "Komentar minimal 10 karakter")
    .max(1000, "Komentar maksimal 1000 karakter")
    .optional(),

  pros: z
    .string()
    .max(500, "Kelebihan maksimal 500 karakter")
    .optional()
    .or(z.literal("")),

  cons: z
    .string()
    .max(500, "Kekurangan maksimal 500 karakter")
    .optional()
    .or(z.literal("")),

  would_recommend: z.boolean().optional(),

  would_work_again: z.boolean().optional(),

  is_visible: z.boolean().optional(),
});

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

/**
 * Review response schema (for business to respond to reviews)
 */
export const reviewResponseSchema = z.object({
  review_id: z
    .string()
    .min(1, "Review ID wajib diisi")
    .uuid("Review ID tidak valid"),

  response: z
    .string()
    .min(1, "Respon wajib diisi")
    .min(10, "Respon minimal 10 karakter")
    .max(1000, "Respon maksimal 1000 karakter"),
});

export type ReviewResponseInput = z.infer<typeof reviewResponseSchema>;

/**
 * Review search/filter schema
 */
export const reviewSearchSchema = z.object({
  search: z.string().max(100, "Pencarian maksimal 100 karakter").optional(),

  reviewer_id: z.string().uuid("Reviewer ID tidak valid").optional(),

  reviewee_id: z.string().uuid("Reviewee ID tidak valid").optional(),

  booking_id: z.string().uuid("Booking ID tidak valid").optional(),

  review_type: reviewTypeEnum.optional(),

  rating_min: z
    .string()
    .regex(/^[1-5]$/, "Rating minimum harus 1-5")
    .optional(),

  rating_max: z
    .string()
    .regex(/^[1-5]$/, "Rating maksimum harus 1-5")
    .optional(),

  would_recommend: z
    .string()
    .transform((val) => val === "true")
    .optional(),

  has_response: z
    .string()
    .transform((val) => val === "true")
    .optional(),

  date_from: z.string().datetime("Format tanggal tidak valid").optional(),

  date_to: z.string().datetime("Format tanggal tidak valid").optional(),

  sort: z
    .enum(["newest", "oldest", "rating_high", "rating_low"], {
      message: "Sort tidak valid",
    })
    .optional(),

  page: z.string().regex(/^\d+$/, "Halaman harus berupa angka").optional(),

  limit: z
    .string()
    .regex(/^\d+$/, "Limit harus berupa angka")
    .refine(
      (val) => {
        const num = parseInt(val);
        return num >= 1 && num <= 100;
      },
      { message: "Limit harus antara 1-100" },
    )
    .optional(),
});

export type ReviewSearchInput = z.infer<typeof reviewSearchSchema>;

/**
 * Review report schema (for reporting inappropriate reviews)
 */
export const reportReviewSchema = z.object({
  review_id: z
    .string()
    .min(1, "Review ID wajib diisi")
    .uuid("Review ID tidak valid"),

  reason: z
    .string()
    .min(1, "Alasan laporan wajib diisi")
    .min(10, "Alasan minimal 10 karakter")
    .max(500, "Alasan maksimal 500 karakter"),

  category: z.enum(["spam", "inappropriate", "fake", "harassment", "other"], {
    message: "Kategori laporan tidak valid",
  }),
});

export type ReportReviewInput = z.infer<typeof reportReviewSchema>;
