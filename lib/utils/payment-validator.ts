import { z } from "zod"
import { PAYMENT_CONSTANTS } from "../types/payment"

/**
 * Zod validation schemas for payment transactions, bank accounts, and payouts
 */

// Bank code enum (supported Indonesian banks)
export const bankCodeSchema = z.enum(["BCA", "BRI", "Mandiri", "BNI"], {
  errorMap: () => ({ message: "Bank harus dipilih (BCA, BRI, Mandiri, atau BNI)" }),
})

// Bank account number validation with bank-specific length requirements
export const bankAccountNumberSchema = z
  .string()
  .min(10, { message: "Nomor rekening minimal 10 digit" })
  .max(16, { message: "Nomor rekening maksimal 16 digit" })
  .regex(/^\d+$/, { message: "Nomor rekening harus berupa angka" })
  .refine(
    (accountNumber) => {
      // Additional validation: check for common invalid patterns
      // Reject all same digits (e.g., 1111111111, 0000000000)
      return !/^(.)\1+$/.test(accountNumber)
    },
    { message: "Nomor rekening tidak valid" }
  )

// Bank account holder name validation
export const bankAccountNameSchema = z
  .string()
  .min(3, { message: "Nama pemilik rekening minimal 3 karakter" })
  .max(100, { message: "Nama pemilik rekening maksimal 100 karakter" })
  .regex(/^[a-zA-Z\s.,'-]+$/, {
    message: "Nama pemilik rekening hanya boleh mengandung huruf, spasi, dan karakter standar (.,'-)",
  })

// Payment amount validation for business top-ups
export const topUpAmountSchema = z
  .number()
  .int({ message: "Jumlah top up harus berupa angka bulat" })
  .min(PAYMENT_CONSTANTS.MIN_TOP_UP_AMOUNT, {
    message: `Minimal top up Rp ${PAYMENT_CONSTANTS.MIN_TOP_UP_AMOUNT.toLocaleString("id-ID")}`,
  })
  .max(PAYMENT_CONSTANTS.MAX_TOP_UP_AMOUNT, {
    message: `Maksimal top up Rp ${PAYMENT_CONSTANTS.MAX_TOP_UP_AMOUNT.toLocaleString("id-ID")}`,
  })

// Payout amount validation for worker withdrawals
export const payoutAmountSchema = z
  .number()
  .int({ message: "Jumlah penarikan harus berupa angka bulat" })
  .min(PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT, {
    message: `Minimal penarikan Rp ${PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT.toLocaleString("id-ID")}`,
  })
  .max(PAYMENT_CONSTANTS.MAX_PAYOUT_AMOUNT, {
    message: `Maksimal penarikan Rp ${PAYMENT_CONSTANTS.MAX_PAYOUT_AMOUNT.toLocaleString("id-ID")}`,
  })

// Fee amount validation (must be positive)
export const feeAmountSchema = z
  .number()
  .int({ message: "Biaya admin harus berupa angka bulat" })
  .min(0, { message: "Biaya admin tidak boleh negatif" })
  .max(100000, { message: "Biaya admin maksimal Rp 100.000" })

// Bank account creation schema
export const createBankAccountSchema = z.object({
  bank_code: bankCodeSchema,
  bank_account_number: bankAccountNumberSchema,
  bank_account_name: bankAccountNameSchema,
  is_primary: z.boolean().optional().default(false),
})

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>

// Bank account update schema (all fields optional)
export const updateBankAccountSchema = z
  .object({
    bank_account_number: bankAccountNumberSchema.optional(),
    bank_account_name: bankAccountNameSchema.optional(),
    is_primary: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // At least one field must be provided
      return (
        data.bank_account_number !== undefined ||
        data.bank_account_name !== undefined ||
        data.is_primary !== undefined
      )
    },
    { message: "Minimal satu field harus diisi untuk update" }
  )

export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>

// Payment transaction creation schema (QRIS top-up)
export const createPaymentTransactionSchema = z.object({
  business_id: z.string().uuid({ message: "Business ID tidak valid" }),
  amount: topUpAmountSchema,
  payment_provider: z.enum(["xendit", "midtrans"], {
    errorMap: () => ({ message: "Payment provider harus dipilih" }),
  }),
  metadata: z.record(z.unknown()).optional(),
})

export type CreatePaymentTransactionInput = z.infer<typeof createPaymentTransactionSchema>

// Payout request creation schema
export const createPayoutRequestSchema = z.object({
  worker_id: z.string().uuid({ message: "Worker ID tidak valid" }),
  amount: payoutAmountSchema,
  bank_account_id: z.string().uuid({ message: "Bank account ID tidak valid" }).optional(),
})

export type CreatePayoutRequestInput = z.infer<typeof createPayoutRequestSchema>

// Payout fee calculation validation
export const payoutFeeCalculationSchema = z.object({
  amount: payoutAmountSchema,
  fee_percentage: z
    .number()
    .min(0, { message: "Persentase biaya tidak boleh negatif" })
    .max(0.1, { message: "Persentase biaya maksimal 10%" })
    .optional(),
})

export type PayoutFeeCalculationInput = z.infer<typeof payoutFeeCalculationSchema>

// Payment fee calculation validation
export const paymentFeeCalculationSchema = z.object({
  amount: topUpAmountSchema,
  fee_percentage: z
    .number()
    .min(0, { message: "Persentase biaya tidak boleh negatif" })
    .max(0.05, { message: "Persentase biaya maksimal 5%" })
    .optional(),
})

export type PaymentFeeCalculationInput = z.infer<typeof paymentFeeCalculationSchema>

/**
 * Validate bank account number format for specific bank
 * @param accountNumber - Bank account number
 * @param bankCode - Bank code (BCA, BRI, Mandiri, BNI)
 * @returns True if valid for the specific bank, false otherwise
 */
export function validateBankAccountFormat(
  accountNumber: string,
  bankCode: string
): boolean {
  const cleanNumber = accountNumber.replace(/\D/g, "")

  switch (bankCode.toUpperCase()) {
    case "BCA":
      // BCA: typically 10 digits
      return cleanNumber.length >= 10 && cleanNumber.length <= 10
    case "BRI":
      // BRI: typically 15 digits
      return cleanNumber.length >= 15 && cleanNumber.length <= 15
    case "MANDIRI":
      // Mandiri: typically 13 digits
      return cleanNumber.length >= 13 && cleanNumber.length <= 13
    case "BNI":
      // BNI: 10-16 digits
      return cleanNumber.length >= 10 && cleanNumber.length <= 16
    default:
      return false
  }
}

/**
 * Validate payment amount against available balance
 * @param amount - Payment amount
 * @param availableBalance - Available wallet balance
 * @returns Validation result with error message if invalid
 */
export function validatePaymentAmount(
  amount: number,
  availableBalance: number
): { valid: boolean; error?: string } {
  if (amount > availableBalance) {
    return {
      valid: false,
      error: `Saldo tidak mencukupi. Saldo tersedia: Rp ${availableBalance.toLocaleString("id-ID")}`,
    }
  }

  if (amount < PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT) {
    return {
      valid: false,
      error: `Minimal penarikan Rp ${PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT.toLocaleString("id-ID")}`,
    }
  }

  return { valid: true }
}

/**
 * Validate top-up amount
 * @param amount - Top-up amount
 * @returns Validation result with error message if invalid
 */
export function validateTopUpAmount(
  amount: number
): { valid: boolean; error?: string } {
  if (amount < PAYMENT_CONSTANTS.MIN_TOP_UP_AMOUNT) {
    return {
      valid: false,
      error: `Minimal top up Rp ${PAYMENT_CONSTANTS.MIN_TOP_UP_AMOUNT.toLocaleString("id-ID")}`,
    }
  }

  if (amount > PAYMENT_CONSTANTS.MAX_TOP_UP_AMOUNT) {
    return {
      valid: false,
      error: `Maksimal top up Rp ${PAYMENT_CONSTANTS.MAX_TOP_UP_AMOUNT.toLocaleString("id-ID")}`,
    }
  }

  return { valid: true }
}

/**
 * Calculate payout fee based on amount and bank code
 * @param amount - Payout amount
 * @param bankCode - Bank code
 * @param feePercentage - Optional fee percentage (default: 1%)
 * @returns Fee amount and net amount
 */
export function calculatePayoutFeeDetails(
  amount: number,
  bankCode: string,
  feePercentage: number = 0.01
): { feeAmount: number; netAmount: number } {
  // Calculate percentage-based fee
  const feeAmount = Math.max(Math.floor(amount * feePercentage), 0)
  const netAmount = amount - feeAmount

  return {
    feeAmount,
    netAmount,
  }
}

/**
 * Calculate payment fee for top-up
 * @param amount - Top-up amount
 * @param feePercentage - Optional fee percentage (default: 0.7% for QRIS)
 * @param fixedFee - Optional fixed fee in IDR (default: Rp 500)
 * @returns Fee amount and total amount
 */
export function calculatePaymentFeeDetails(
  amount: number,
  feePercentage: number = 0.007,
  fixedFee: number = 500
): { feeAmount: number; totalAmount: number } {
  const variableFee = Math.floor(amount * feePercentage)
  const feeAmount = variableFee + fixedFee
  const totalAmount = amount + feeAmount

  return {
    feeAmount,
    totalAmount,
  }
}
