/**
 * User Profile Validation Schemas
 *
 * Zod schemas for user profile update operations
 */

import { z } from "zod";

/**
 * User profile update schema
 */
export const userProfileUpdateSchema = z.object({
  full_name: z
    .string()
    .min(3, "Nama lengkap minimal 3 karakter")
    .max(100, "Nama lengkap maksimal 100 karakter")
    .optional(),

  email: z
    .string()
    .email("Format email tidak valid")
    .max(255, "Email maksimal 255 karakter")
    .optional(),

  phone: z
    .string()
    .min(10, "Nomor telepon minimal 10 digit")
    .max(15, "Nomor telepon maksimal 15 digit")
    .regex(
      /^(\+62|62|0)[0-9]+$/,
      "Format nomor telepon tidak valid. Gunakan format: +62xxx, 62xxx, atau 0xxx",
    )
    .optional()
    .or(z.literal("")), // Allow empty string for clearing

  avatar_url: z
    .string()
    .url("URL avatar tidak valid")
    .max(500, "URL avatar maksimal 500 karakter")
    .optional()
    .or(z.literal("")),

  bio: z
    .string()
    .max(500, "Bio maksimal 500 karakter")
    .optional()
    .or(z.literal("")),

  address: z
    .string()
    .max(500, "Alamat maksimal 500 karakter")
    .optional()
    .or(z.literal("")),

  location_name: z
    .string()
    .max(100, "Nama lokasi maksimal 100 karakter")
    .optional()
    .or(z.literal("")),

  // Coordinates
  lat: z
    .number()
    .min(-90, "Latitude tidak valid")
    .max(90, "Latitude tidak valid")
    .optional(),

  lng: z
    .number()
    .min(-180, "Longitude tidak valid")
    .max(180, "Longitude tidak valid")
    .optional(),
});

export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>;

/**
 * User notification settings schema
 */
export const notificationSettingsSchema = z.object({
  email_notifications: z.boolean().optional(),

  push_notifications: z.boolean().optional(),

  sms_notifications: z.boolean().optional(),

  booking_reminders: z.boolean().optional(),

  marketing_emails: z.boolean().optional(),

  job_alerts: z.boolean().optional(),

  payment_notifications: z.boolean().optional(),
});

export type NotificationSettingsInput = z.infer<
  typeof notificationSettingsSchema
>;

/**
 * User preferences schema
 */
export const userPreferencesSchema = z.object({
  language: z
    .enum(["id", "en"], {
      message: "Bahasa harus id (Indonesian) atau en (English)",
    })
    .optional(),

  currency: z
    .enum(["IDR", "USD"], {
      message: "Mata uang harus IDR atau USD",
    })
    .optional(),

  timezone: z.string().max(50, "Timezone maksimal 50 karakter").optional(),

  theme: z
    .enum(["light", "dark", "system"], {
      message: "Theme harus light, dark, atau system",
    })
    .optional(),
});

export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;

/**
 * Combined user settings schema
 */
export const userSettingsSchema = userProfileUpdateSchema
  .merge(notificationSettingsSchema)
  .merge(userPreferencesSchema);

export type UserSettingsInput = z.infer<typeof userSettingsSchema>;

/**
 * User search/filter schema for admin
 */
export const userSearchSchema = z.object({
  search: z.string().max(100, "Pencarian maksimal 100 karakter").optional(),

  role: z
    .enum(["worker", "business", "admin"], {
      message: "Role tidak valid",
    })
    .optional(),

  status: z
    .enum(["active", "inactive", "suspended"], {
      message: "Status tidak valid",
    })
    .optional(),

  is_verified: z.boolean().optional(),

  created_from: z.string().datetime("Format tanggal tidak valid").optional(),

  created_to: z.string().datetime("Format tanggal tidak valid").optional(),

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

  sort: z
    .enum(["newest", "oldest", "name_asc", "name_desc"], {
      message: "Sort tidak valid",
    })
    .optional(),
});

export type UserSearchInput = z.infer<typeof userSearchSchema>;
