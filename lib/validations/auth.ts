/**
 * Authentication Validation Schemas
 * 
 * Zod schemas for login, registration, and password reset operations
 */

import { z } from 'zod'

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid')
    .max(255, 'Email maksimal 255 karakter'),
  
  password: z
    .string()
    .min(1, 'Password wajib diisi')
    .min(6, 'Password minimal 6 karakter')
    .max(100, 'Password maksimal 100 karakter'),
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Registration schema
 */
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid')
    .max(255, 'Email maksimal 255 karakter'),
  
  password: z
    .string()
    .min(1, 'Password wajib diisi')
    .min(6, 'Password minimal 6 karakter')
    .max(100, 'Password maksimal 100 karakter')
    .refine(
      (password) => {
        // At least one uppercase, one lowercase, one number
        const hasUppercase = /[A-Z]/.test(password)
        const hasLowercase = /[a-z]/.test(password)
        const hasNumber = /[0-9]/.test(password)
        return hasUppercase && hasLowercase && hasNumber
      },
      {
        message: 'Password harus mengandung huruf besar, huruf kecil, dan angka',
      }
    ),
  
  confirm_password: z
    .string()
    .min(1, 'Konfirmasi password wajib diisi'),
  
  full_name: z
    .string()
    .min(1, 'Nama lengkap wajib diisi')
    .min(3, 'Nama lengkap minimal 3 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter'),
  
  phone: z
    .string()
    .min(1, 'Nomor telepon wajib diisi')
    .min(10, 'Nomor telepon minimal 10 digit')
    .max(15, 'Nomor telepon maksimal 15 digit')
    .regex(
      /^(\+62|62|0)[0-9]+$/,
      'Format nomor telepon tidak valid. Gunakan format: +62xxx, 62xxx, atau 0xxx'
    ),
  
  role: z
    .enum(['worker', 'business'], {
      errorMap: () => ({ message: 'Role harus worker atau business' }),
    }),
  
  // Optional fields
  business_name: z
    .string()
    .max(200, 'Nama bisnis maksimal 200 karakter')
    .optional(),
  
  business_type: z
    .enum(['hotel', 'villa', 'restaurant', 'event_company', 'other'], {
      errorMap: () => ({ message: 'Tipe bisnis tidak valid' }),
    })
    .optional(),
  
  business_address: z
    .string()
    .max(500, 'Alamat bisnis maksimal 500 karakter')
    .optional(),
})
.refine(
  (data) => data.password === data.confirm_password,
  {
    message: 'Password dan konfirmasi password tidak cocok',
    path: ['confirm_password'],
  }
)
.refine(
  (data) => {
    // If role is business, business_name is required
    if (data.role === 'business' && !data.business_name) {
      return false
    }
    return true
  },
  {
    message: 'Nama bisnis wajib diisi untuk akun bisnis',
    path: ['business_name'],
  }
)

export type RegisterInput = z.infer<typeof registerSchema>

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid')
    .max(255, 'Email maksimal 255 karakter'),
})

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>

/**
 * Password reset schema (with token)
 */
export const passwordResetSchema = z.object({
  token: z
    .string()
    .min(1, 'Token reset password wajib diisi'),
  
  password: z
    .string()
    .min(1, 'Password wajib diisi')
    .min(6, 'Password minimal 6 karakter')
    .max(100, 'Password maksimal 100 karakter')
    .refine(
      (password) => {
        const hasUppercase = /[A-Z]/.test(password)
        const hasLowercase = /[a-z]/.test(password)
        const hasNumber = /[0-9]/.test(password)
        return hasUppercase && hasLowercase && hasNumber
      },
      {
        message: 'Password harus mengandung huruf besar, huruf kecil, dan angka',
      }
    ),
  
  confirm_password: z
    .string()
    .min(1, 'Konfirmasi password wajib diisi'),
})
.refine(
  (data) => data.password === data.confirm_password,
  {
    message: 'Password dan konfirmasi password tidak cocok',
    path: ['confirm_password'],
  }
)

export type PasswordResetInput = z.infer<typeof passwordResetSchema>

/**
 * Change password schema (for authenticated users)
 */
export const changePasswordSchema = z.object({
  current_password: z
    .string()
    .min(1, 'Password lama wajib diisi'),
  
  new_password: z
    .string()
    .min(1, 'Password baru wajib diisi')
    .min(6, 'Password minimal 6 karakter')
    .max(100, 'Password maksimal 100 karakter')
    .refine(
      (password) => {
        const hasUppercase = /[A-Z]/.test(password)
        const hasLowercase = /[a-z]/.test(password)
        const hasNumber = /[0-9]/.test(password)
        return hasUppercase && hasLowercase && hasNumber
      },
      {
        message: 'Password harus mengandung huruf besar, huruf kecil, dan angka',
      }
    ),
  
  confirm_password: z
    .string()
    .min(1, 'Konfirmasi password wajib diisi'),
})
.refine(
  (data) => data.new_password === data.confirm_password,
  {
    message: 'Password baru dan konfirmasi password tidak cocok',
    path: ['confirm_password'],
  }
)
.refine(
  (data) => data.current_password !== data.new_password,
  {
    message: 'Password baru harus berbeda dengan password lama',
    path: ['new_password'],
  }
)

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/**
 * Email verification schema
 */
export const emailVerificationSchema = z.object({
  token: z
    .string()
    .min(1, 'Token verifikasi wajib diisi'),
})

export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>

/**
 * Resend verification email schema
 */
export const resendVerificationSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid')
    .max(255, 'Email maksimal 255 karakter'),
})

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>
