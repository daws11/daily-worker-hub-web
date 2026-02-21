import { z } from "zod"

// Business type enum
export const businessTypeEnum = z.enum([
  "hotel",
  "villa",
  "restaurant",
  "event_company",
  "other",
], {
  errorMap: () => ({ message: "Tipe bisnis harus dipilih" }),
})

// Area enum (Bali regencies)
export const areaEnum = z.enum([
  "Badung",
  "Denpasar",
  "Gianyar",
  "Tabanan",
  "Buleleng",
  "Klungkung",
  "Karangasem",
  "Bangli",
  "Jembrana",
], {
  errorMap: () => ({ message: "Area harus dipilih" }),
})

// Business profile schema for creation
export const businessProfileSchema = z.object({
  name: z.string({
    required_error: "Nama perusahaan wajib diisi",
  }).min(1, "Nama perusahaan wajib diisi")
    .max(200, "Nama perusahaan maksimal 200 karakter"),

  business_type: businessTypeEnum,

  address: z.string({
    required_error: "Alamat wajib diisi",
  }).min(1, "Alamat wajib diisi")
    .max(500, "Alamat maksimal 500 karakter"),

  area: areaEnum,

  phone: z.string()
    .max(20, "Nomor telepon maksimal 20 karakter")
    .regex(/^[0-9+\-\s()]*$/, "Nomor telepon tidak valid")
    .optional()
    .or(z.literal("")),

  email: z.string()
    .email("Email tidak valid")
    .max(255, "Email maksimal 255 karakter")
    .optional()
    .or(z.literal("")),

  website: z.string()
    .max(255, "Website maksimal 255 karakter")
    .url("Website tidak valid")
    .optional()
    .or(z.literal("")),

  description: z.string()
    .max(2000, "Deskripsi maksimal 2000 karakter")
    .optional(),
})

// Business profile schema for partial updates
export const updateBusinessProfileSchema = businessProfileSchema.partial()

// Type exports
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>
export type UpdateBusinessProfileInput = z.infer<typeof updateBusinessProfileSchema>
export type BusinessType = z.infer<typeof businessTypeEnum>
export type Area = z.infer<typeof areaEnum>
