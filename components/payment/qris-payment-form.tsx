"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

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
import { cn } from "@/lib/utils"

// Zod schema for QRIS payment form validation
export const qrisPaymentFormSchema = z.object({
  amount: z.number().min(500000, "Minimum top-up amount is Rp 500.000"),
})

export type QrisPaymentFormValues = z.infer<typeof qrisPaymentFormSchema>

// Format currency to IDR
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Quick amount presets
const PRESET_AMOUNTS = [500000, 1000000, 2000000, 5000000, 10000000]

export interface QrisPaymentFormProps {
  onSubmit?: (values: QrisPaymentFormValues) => void | Promise<void>
  currentBalance?: number
  isLoading?: boolean
  disabled?: boolean
  submitButtonText?: string
  className?: string
  showWalletInfo?: boolean
}

export function QrisPaymentForm({
  onSubmit,
  currentBalance = 0,
  isLoading = false,
  disabled = false,
  submitButtonText = "Pay with QRIS",
  className,
  showWalletInfo = true,
}: QrisPaymentFormProps) {
  const form = useForm<QrisPaymentFormValues>({
    resolver: zodResolver(qrisPaymentFormSchema),
    defaultValues: {
      amount: 0,
    },
  })

  const watchedAmount = form.watch("amount")

  const handleSubmit = async (values: QrisPaymentFormValues) => {
    if (onSubmit) {
      await onSubmit(values)
    }
  }

  const handlePresetAmount = (amount: number) => {
    form.setValue("amount", amount, { shouldValidate: true })
  }

  const handleReset = () => {
    form.reset()
  }

  const projectedBalance = currentBalance + watchedAmount

  return (
    <div className={cn("space-y-6", className)}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Wallet Info Card */}
          {showWalletInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Balance</CardTitle>
                <CardDescription>Your business wallet balance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">Current:</span>
                    <span className="text-2xl font-semibold">{formatCurrency(currentBalance)}</span>
                  </div>
                  {watchedAmount > 0 && (
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">After top-up:</span>
                      <span className="font-medium text-primary">{formatCurrency(projectedBalance)}</span>
                    </div>
                  )}
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
                <FormLabel>Top-up Amount (IDR)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="500000"
                    disabled={disabled}
                    min={500000}
                    step={1000}
                    {...field}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value)
                      field.onChange(isNaN(value) ? 0 : value)
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Enter the amount you want to top up. Minimum Rp 500.000.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Quick Amount Presets */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Quick Select</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {PRESET_AMOUNTS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={watchedAmount === preset ? "default" : "outline"}
                  size="sm"
                  disabled={disabled}
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

          {/* QRIS Info */}
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
                  <p className="font-medium">About QRIS Payment</p>
                  <p className="text-muted-foreground">
                    Scan the QR code with your mobile banking app (GoPay, OVO, Dana, ShopeePay, etc.)
                    to complete the payment. Your wallet will be credited instantly after successful payment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={disabled || isLoading}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={disabled || isLoading || watchedAmount < 500000}
            >
              {isLoading ? "Processing..." : submitButtonText}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
