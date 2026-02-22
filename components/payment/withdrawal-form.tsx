"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { Loader2, Landmark, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { requestPayout, getWorkerWalletBalance } from "@/lib/actions/payments"
import { PAYMENT_CONSTANTS } from "@/lib/types/payment"
import type { Database } from "@/lib/supabase/types"

type BankAccount = Database["public"]["Tables"]["bank_accounts"]["Row"]

// Zod schema for withdrawal form validation
export const withdrawalFormSchema = z.object({
  amount: z.number({
    required_error: "Silakan masukkan jumlah penarikan",
    invalid_type_error: "Jumlah harus berupa angka",
  }).min(PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT, {
    message: `Minimal penarikan Rp ${PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT.toLocaleString("id-ID")}`,
  }),
  bank_account_id: z.string().optional(),
})

export type WithdrawalFormValues = z.infer<typeof withdrawalFormSchema>

// Format currency to IDR
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Calculate payout fee (1% by default, free for first weekly withdrawal)
const calculatePayoutFee = (amount: number, hasFreeWeeklyPayout: boolean): number => {
  if (hasFreeWeeklyPayout) return 0
  return Math.max(Math.floor(amount * 0.01), 0)
}

// Quick amount presets
const PRESET_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000]

export interface WithdrawalFormProps {
  workerId: string
  bankAccounts: BankAccount[]
  currentBalance?: number
  hasFreeWeeklyPayout?: boolean
  onSubmitSuccess?: () => void
  isLoading?: boolean
  disabled?: boolean
  className?: string
}

export function WithdrawalForm({
  workerId,
  bankAccounts,
  currentBalance = 0,
  hasFreeWeeklyPayout = true,
  onSubmitSuccess,
  isLoading = false,
  disabled = false,
  className,
}: WithdrawalFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Determine primary bank account
  const primaryAccount = bankAccounts.find((acc) => acc.is_primary) || bankAccounts[0]
  const selectedBankAccount = primaryAccount

  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalFormSchema),
    defaultValues: {
      amount: 0,
      bank_account_id: selectedBankAccount?.id,
    },
  })

  const watchedAmount = form.watch("amount")

  const handleSubmit = async (values: WithdrawalFormValues) => {
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await requestPayout(
        workerId,
        values.amount,
        values.bank_account_id
      )

      if (result.success) {
        form.reset()
        onSubmitSuccess?.()
        router.refresh()
      } else {
        setError(result.error || "Gagal memproses penarikan")
      }
    } catch {
      setError("Terjadi kesalahan saat memproses penarikan")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePresetAmount = (amount: number) => {
    form.setValue("amount", amount, { shouldValidate: true })
  }

  const handleReset = () => {
    form.reset()
    setError(null)
  }

  // Calculate fee
  const feeAmount = calculatePayoutFee(watchedAmount, hasFreeWeeklyPayout)
  const netAmount = watchedAmount - feeAmount
  const remainingBalance = currentBalance - watchedAmount

  // Check if amount exceeds balance
  const exceedsBalance = watchedAmount > currentBalance

  return (
    <div className={cn("space-y-6", className)}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Wallet Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Saldo Tersedia</CardTitle>
              <CardDescription>Saldo wallet yang dapat ditarik</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Saldo saat ini:</span>
                  <span className="text-2xl font-semibold">{formatCurrency(currentBalance)}</span>
                </div>
                {watchedAmount > 0 && (
                  <>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">Jumlah penarikan:</span>
                      <span className="font-medium">-{formatCurrency(watchedAmount)}</span>
                    </div>
                    {!hasFreeWeeklyPayout && feeAmount > 0 && (
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-muted-foreground">Biaya admin (1%):</span>
                        <span className="font-medium text-destructive">-{formatCurrency(feeAmount)}</span>
                      </div>
                    )}
                    <div className="my-2 border-t border-dashed" />
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">Sisa saldo:</span>
                      <span className={cn(
                        "font-semibold",
                        remainingBalance < 0 ? "text-destructive" : "text-primary"
                      )}>
                        {formatCurrency(Math.max(0, remainingBalance))}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {hasFreeWeeklyPayout && watchedAmount > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
                  <Landmark className="h-4 w-4" />
                  <span>Gratis biaya penarikan minggu ini!</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bank Account Info */}
          {selectedBankAccount && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Landmark className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Rekening Tujuan</p>
                    <p className="text-muted-foreground">
                      {selectedBankAccount.bank_code} - {selectedBankAccount.bank_account_number}
                    </p>
                    <p className="text-muted-foreground">
                      a.n {selectedBankAccount.bank_account_name}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Amount Field */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jumlah Penarikan (IDR)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="100000"
                    disabled={disabled}
                    min={PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT}
                    step={1000}
                    {...field}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value)
                      field.onChange(isNaN(value) ? 0 : value)
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Masukkan jumlah yang ingin ditarik. Minimal Rp 100.000.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Balance Warning */}
          {exceedsBalance && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>Jumlah penarikan melebihi saldo yang tersedia.</p>
            </div>
          )}

          {/* Quick Amount Presets */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Pilih Cepat</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {PRESET_AMOUNTS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={watchedAmount === preset ? "default" : "outline"}
                  size="sm"
                  disabled={disabled || preset > currentBalance}
                  onClick={() => handlePresetAmount(preset)}
                  className="text-sm"
                >
                  {preset >= 1000000
                    ? `${preset / 1000000}jt`
                    : `${preset / 1000}rb`}
                </Button>
              ))}
            </div>
          </div>

          {/* Fee Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <svg
                    className="h-5 w-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Tentang Penarikan</p>
                  <p className="text-muted-foreground">
                    Dana akan ditransfer ke rekening bank Anda dalam 1-2 hari kerja.
                    Penarikan pertama setiap minggu gratis, penarikan berikutnya dikenakan biaya 1%.
                  </p>
                  {!hasFreeWeeklyPayout && watchedAmount > 0 && (
                    <p className="text-muted-foreground">
                      Biaya penarikan: {formatCurrency(feeAmount)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={disabled || isSubmitting}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={
                disabled ||
                isSubmitting ||
                watchedAmount < PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT ||
                exceedsBalance
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Tarik Dana"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
