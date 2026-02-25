import { z } from "zod"

// Reviewer type enum
export const reviewerTypeEnum = z.enum(["business", "worker"], {
  message: "Tipe penulis ulasan harus dipilih",
})

// Rating validation (1-5 stars)
export const ratingSchema = z
  .number({
    message: "Rating harus berupa angka",
  })
  .int({ message: "Rating harus berupa bilangan bulat" })
  .min(1, { message: "Rating minimal 1 bintang" })
  .max(5, { message: "Rating maksimal 5 bintang" })

// Comment validation
export const commentSchema = z
  .string()
  .max(1000, { message: "Komentar maksimal 1000 karakter" })
  .optional()

// Would rehire validation
export const wouldRehireSchema = z.boolean().optional()

// Review schema for creation
export const createReviewSchema = z.object({
  booking_id: z.string().uuid({ message: "ID pemesanan tidak valid" }),
  worker_id: z.string().uuid({ message: "ID pekerja tidak valid" }),
  business_id: z.string().uuid({ message: "ID bisnis tidak valid" }).optional(),
  reviewer: reviewerTypeEnum,
  rating: ratingSchema,
  comment: commentSchema,
  would_rehire: wouldRehireSchema,
})

// Review schema for partial updates
export const updateReviewSchema = z
  .object({
    rating: z
      .number()
      .int({ message: "Rating harus berupa bilangan bulat" })
      .min(1, { message: "Rating minimal 1 bintang" })
      .max(5, { message: "Rating maksimal 5 bintang" })
      .optional(),
    comment: z
      .string()
      .max(1000, { message: "Komentar maksimal 1000 karakter" })
      .optional(),
    would_rehire: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // At least one field must be provided
      return (
        data.rating !== undefined ||
        data.comment !== undefined ||
        data.would_rehire !== undefined
      )
    },
    { message: "Minimal satu field harus diisi untuk update" }
  )

// Type exports
export type CreateReviewInput = z.infer<typeof createReviewSchema>
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>
export type ReviewerType = z.infer<typeof reviewerTypeEnum>
