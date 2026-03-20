/**
 * Payment Validation Schemas
 * 
 * Zod schemas for payment and withdrawal operations
 */

import { z } from 'zod'

/**
 * Payment provider enum
 */
export const paymentProviderEnum = z.enum(['xendit', 'midtrans'], {
  message: 'Payment provider tidak valid',
})

/**
 * Payment status enum
 */
export const paymentStatusEnum = z.enum(
  ['pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded'],
  {
    message: 'Status pembayaran tidak valid',
  }
)

/**
 * Payment method enum
 */
export const paymentMethodEnum = z.enum(
  ['qris', 'bank_transfer', 'va', 'ewallet', 'credit_card', 'retail'],
  {
    message: 'Metode pembayaran tidak valid',
  }
)

/**
 * Create payment schema
 */
export const createPaymentSchema = z.object({
  business_id: z
    .string()
    .min(1, 'Business ID wajib diisi')
    .uuid('Business ID tidak valid'),
  
  amount: z
    .number({
      message: 'Jumlah pembayaran harus berupa angka',
    })
    .min(50000, 'Top-up minimal Rp 50.000')
    .max(100000000, 'Top-up maksimal Rp 100.000.000'),
  
  provider: paymentProviderEnum
    .default('xendit'),
  
  payment_method: paymentMethodEnum.optional(),
  
  customer_email: z
    .string()
    .email('Format email tidak valid')
    .max(255, 'Email maksimal 255 karakter')
    .optional(),
  
  customer_name: z
    .string()
    .max(100, 'Nama customer maksimal 100 karakter')
    .optional(),
  
  metadata: z
    .record(z.string(), z.unknown())
    .optional(),
})
.refine(
  (data) => {
    // Validate provider is enabled (this would need to check env vars)
    // For now, we'll just ensure it's one of the allowed providers
    return ['xendit', 'midtrans'].includes(data.provider)
  },
  {
    message: 'Payment provider tidak didukung',
    path: ['provider'],
  }
)

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>

/**
 * Payment verification schema
 */
export const verifyPaymentSchema = z.object({
  transaction_id: z
    .string()
    .min(1, 'Transaction ID wajib diisi'),
  
  provider: paymentProviderEnum,
  
  provider_payment_id: z
    .string()
    .min(1, 'Provider payment ID wajib diisi')
    .optional(),
})

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>

/**
 * Withdrawal request schema
 */
export const createWithdrawalSchema = z.object({
  worker_id: z
    .string()
    .min(1, 'Worker ID wajib diisi')
    .uuid('Worker ID tidak valid'),
  
  amount: z
    .number({
      message: 'Jumlah withdrawal harus berupa angka',
    })
    .min(50000, 'Withdrawal minimal Rp 50.000')
    .max(50000000, 'Withdrawal maksimal Rp 50.000.000'),
  
  bank_name: z
    .string()
    .min(1, 'Nama bank wajib diisi')
    .max(50, 'Nama bank maksimal 50 karakter'),
  
  bank_account_name: z
    .string()
    .min(1, 'Nama rekening wajib diisi')
    .min(3, 'Nama rekening minimal 3 karakter')
    .max(100, 'Nama rekening maksimal 100 karakter'),
  
  bank_account_number: z
    .string()
    .min(1, 'Nomor rekening wajib diisi')
    .min(5, 'Nomor rekening minimal 5 digit')
    .max(30, 'Nomor rekening maksimal 30 digit')
    .regex(/^\d+$/, 'Nomor rekening hanya boleh berisi angka'),
  
  notes: z
    .string()
    .max(500, 'Catatan maksimal 500 karakter')
    .optional()
    .or(z.literal('')),
})
.refine(
  (data) => {
    // Validate bank name is in supported list
    const supportedBanks = [
      'BCA', 'BNI', 'BRI', 'Mandiri', 'CIMB Niaga',
      'Permata', 'Danamon', 'Panin', 'OCBC NISP',
      'Jenius', 'Bank Jago', 'Seabank', 'DANA',
      'GoPay', 'OVO', 'ShopeePay'
    ]
    return supportedBanks.some(bank => 
      data.bank_name.toUpperCase().includes(bank.toUpperCase())
    )
  },
  {
    message: 'Bank tidak didukung',
    path: ['bank_name'],
  }
)

export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>

/**
 * Withdrawal status update schema
 */
export const updateWithdrawalSchema = z.object({
  withdrawal_id: z
    .string()
    .min(1, 'Withdrawal ID wajib diisi')
    .uuid('Withdrawal ID tidak valid'),
  
  status: z
    .enum(['pending', 'processing', 'completed', 'failed', 'cancelled'], {
      message: 'Status withdrawal tidak valid',
    }),
  
  failure_reason: z
    .string()
    .max(500, 'Alasan kegagalan maksimal 500 karakter')
    .optional()
    .or(z.literal('')),
  
  provider_disbursement_id: z
    .string()
    .max(100, 'Provider disbursement ID maksimal 100 karakter')
    .optional(),
  
  receipt_url: z
    .string()
    .url('URL receipt tidak valid')
    .optional(),
})

export type UpdateWithdrawalInput = z.infer<typeof updateWithdrawalSchema>

/**
 * Payment search/filter schema
 */
export const paymentSearchSchema = z.object({
  search: z
    .string()
    .max(100, 'Pencarian maksimal 100 karakter')
    .optional(),
  
  business_id: z
    .string()
    .uuid('Business ID tidak valid')
    .optional(),
  
  worker_id: z
    .string()
    .uuid('Worker ID tidak valid')
    .optional(),
  
  status: paymentStatusEnum.optional(),
  
  provider: paymentProviderEnum.optional(),
  
  payment_method: paymentMethodEnum.optional(),
  
  amount_min: z
    .string()
    .regex(/^\d+$/, 'Amount minimum harus berupa angka')
    .optional(),
  
  amount_max: z
    .string()
    .regex(/^\d+$/, 'Amount maksimum harus berupa angka')
    .optional(),
  
  date_from: z
    .string()
    .datetime('Format tanggal tidak valid')
    .optional(),
  
  date_to: z
    .string()
    .datetime('Format tanggal tidak valid')
    .optional(),
  
  sort: z
    .enum(['newest', 'oldest', 'amount_asc', 'amount_desc'], {
      message: 'Sort tidak valid',
    })
    .optional(),
  
  page: z
    .string()
    .regex(/^\d+$/, 'Halaman harus berupa angka')
    .optional(),
  
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit harus berupa angka')
    .refine(
      (val) => {
        const num = parseInt(val)
        return num >= 1 && num <= 100
      },
      { message: 'Limit harus antara 1-100' }
    )
    .optional(),
})

export type PaymentSearchInput = z.infer<typeof paymentSearchSchema>

/**
 * Wallet top-up validation (for GET request)
 */
export const walletTopUpValidationSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+$/, 'Amount harus berupa angka')
    .transform((val) => parseInt(val))
    .refine(
      (val) => val >= 50000,
      { message: 'Top-up minimal Rp 50.000' }
    )
    .refine(
      (val) => val <= 100000000,
      { message: 'Top-up maksimal Rp 100.000.000' }
    ),
  
  provider: paymentProviderEnum
    .default('xendit'),
  
  payment_method: paymentMethodEnum.optional(),
})

export type WalletTopUpValidationInput = z.infer<typeof walletTopUpValidationSchema>

/**
 * Refund payment schema
 */
export const refundPaymentSchema = z.object({
  transaction_id: z
    .string()
    .min(1, 'Transaction ID wajib diisi'),
  
  amount: z
    .number({
      message: 'Jumlah refund harus berupa angka',
    })
    .min(1, 'Refund minimal Rp 1')
    .optional(),
  
  reason: z
    .string()
    .min(1, 'Alasan refund wajib diisi')
    .min(10, 'Alasan minimal 10 karakter')
    .max(500, 'Alasan maksimal 500 karakter'),
})

export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>
