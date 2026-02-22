import { z } from "zod"

/**
 * Zod validation schemas for worker profile and KYC verification
 */

// Gender enum
export const genderSchema = z.enum(["male", "female"], {
  message: "Gender harus dipilih",
})

// Date of birth validation - must be at least 17 years old (legal working age in Indonesia)
export const dateOfBirthSchema = z.string().refine(
  (date) => {
    const dob = new Date(date)
    const today = new Date()
    const minAge = 17

    const age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    const dayDiff = today.getDate() - dob.getDate()

    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age

    return !isNaN(dob.getTime()) && actualAge >= minAge
  },
  { message: "Usia minimal 17 tahun" }
)

// Phone number validation (Indonesian format)
export const phoneNumberSchema = z
  .string()
  .min(10, { message: "Nomor telepon minimal 10 digit" })
  .max(15, { message: "Nomor telepon maksimal 15 digit" })
  .regex(/^(\+62|62|0)[0-9]+$/, {
    message: "Format nomor telepon tidak valid. Gunakan format: +62xxx, 62xxx, atau 0xxx",
  })

// Experience years validation
export const experienceYearsSchema = z
  .number()
  .int({ message: "Pengalaman kerja harus berupa angka bulat" })
  .min(0, { message: "Pengalaman kerja tidak boleh negatif" })
  .max(50, { message: "Pengalaman kerja maksimal 50 tahun" })

// Skills array validation
export const skillsSchema = z
  .array(z.string())
  .min(1, { message: "Pilih minimal 1 skill" })
  .max(10, { message: "Maksimal 10 skill" })

// Worker profile schema
export const workerProfileSchema = z.object({
  full_name: z
    .string()
    .min(3, { message: "Nama lengkap minimal 3 karakter" })
    .max(100, { message: "Nama lengkap maksimal 100 karakter" }),
  gender: genderSchema.optional(),
  dob: dateOfBirthSchema.optional(),
  phone: phoneNumberSchema,
  address: z
    .string()
    .min(10, { message: "Alamat minimal 10 karakter" })
    .max(500, { message: "Alamat maksimal 500 karakter" }),
  location_name: z
    .string()
    .min(3, { message: "Nama lokasi minimal 3 karakter" })
    .max(100, { message: "Nama lokasi maksimal 100 karakter" }),
  bio: z
    .string()
    .max(500, { message: "Bio maksimal 500 karakter" })
    .optional(),
  experience_years: experienceYearsSchema,
  skill_ids: skillsSchema,
})

export type WorkerProfileInput = z.infer<typeof workerProfileSchema>

// KTP number validation with custom validator
const ktpNumberSchema = z
  .string()
  .regex(/^\d{16}$/, { message: "Nomor KTP harus 16 digit" })
  .refine(
    (ktp) => {
      // Import validator dynamically to avoid circular dependency
      const { validateKTP } = require("../utils/ktp-validator")
      return validateKTP(ktp)
    },
    { message: "Nomor KTP tidak valid" }
  )

// File validation for KTP and selfie images
const imageFileSchema = z
  .instanceof(File)
  .refine(
    (file) => {
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
      return validTypes.includes(file.type)
    },
    { message: "Format file harus JPG, PNG, atau WebP" }
  )
  .refine(
    (file) => {
      const maxSize = 5 * 1024 * 1024 // 5MB
      return file.size <= maxSize
    },
    { message: "Ukuran file maksimal 5MB" }
  )

// For string URLs (when editing existing data)
const imageUrlSchema = z
  .string()
  .url({ message: "URL gambar tidak valid" })
  .optional()

// KYC verification schema
export const kycVerificationSchema = z.object({
  ktp_number: ktpNumberSchema,
  ktp_image: z.union([imageFileSchema, imageUrlSchema], {
    message: "Upload gambar KTP (JPG/PNG, maks 5MB)",
  }),
  selfie_image: z.union([imageFileSchema, imageUrlSchema], {
    message: "Upload selfie (JPG/PNG, maks 5MB)",
  }),
})

export type KycVerificationInput = z.infer<typeof kycVerificationSchema>

// Combined schema for profile + KYC submission
export const workerFullProfileSchema = workerProfileSchema
  .and(kycVerificationSchema)

export type WorkerFullProfileInput = z.infer<typeof workerFullProfileSchema>

// Update profile schema (all fields optional)
export const updateWorkerProfileSchema = workerProfileSchema.partial()

export type UpdateWorkerProfileInput = z.infer<typeof updateWorkerProfileSchema>
