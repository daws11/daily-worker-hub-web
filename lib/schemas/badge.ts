import { z } from "zod"

// Badge category enum
export const badgeCategoryEnum = z.enum([
  "skill",
  "training",
  "certification",
  "specialization",
])

// Badge verification status enum
export const badgeVerificationStatusEnum = z.enum([
  "pending",
  "verified",
  "rejected",
])

// Badge verification request schema
export const badgeVerificationRequestSchema = z.object({
  badge_id: z.string().min(1, "Badge wajib dipilih"),

  verification_document_url: z.string()
    .url("URL dokumen verifikasi tidak valid")
    .optional()
    .or(z.literal("")),

  notes: z.string()
    .max(1000, "Catatan maksimal 1000 karakter")
    .optional(),
})

// Type exports
export type BadgeVerificationRequestInput = z.infer<typeof badgeVerificationRequestSchema>
export type BadgeCategory = z.infer<typeof badgeCategoryEnum>
export type BadgeVerificationStatus = z.infer<typeof badgeVerificationStatusEnum>
