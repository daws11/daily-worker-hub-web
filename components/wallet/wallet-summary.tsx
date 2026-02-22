"use client"

import * as React from "react"
import { Wallet, Clock, TrendingUp, AlertCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface PendingPayment {
  booking_id: string
  job_title: string
  amount: number
  review_deadline: string
  hours_until_release: number
}

export interface WalletSummaryProps {
  totalEarnings?: number
  pendingPayments?: PendingPayment[] | null
  isLoading?: boolean
  error?: string | null
  className?: string
  showLabel?: boolean
}

/**
 * Formats a number as Indonesian Rupiah currency
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "Rp 1.500.000")
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formats hours until release as a readable countdown
 * @param hours - Number of hours until release
 * @returns Formatted countdown string (e.g., "23 jam 30 menit")
 */
function formatCountdown(hours: number): string {
  if (hours <= 0) {
    return "Sekarang"
  }

  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)

  if (h > 24) {
    const days = Math.floor(h / 24)
    const remainingHours = h % 24
    if (remainingHours > 0) {
      return `${days} hari ${remainingHours} jam`
    }
    return `${days} hari`
  }

  if (h > 0 && m > 0) {
    return `${h} jam ${m} menit`
  }

  if (h > 0) {
    return `${h} jam`
  }

  if (m > 0) {
    return `${m} menit`
  }

  return "Sekarang"
}

/**
 * Calculates the next release time from pending payments
 * @param pendingPayments - Array of pending payment info
 * @returns The next payment to be released, or null if none
 */
function getNextRelease(pendingPayments?: PendingPayment[] | null): PendingPayment | null {
  if (!pendingPayments || pendingPayments.length === 0) {
    return null
  }

  // Sort by hours_until_release ascending (soonest first)
  const sorted = [...pendingPayments].sort((a, b) => a.hours_until_release - b.hours_until_release)
  return sorted[0]
}

export function WalletSummary({
  totalEarnings,
  pendingPayments,
  isLoading = false,
  error,
  className,
  showLabel = true,
}: WalletSummaryProps) {
  const nextRelease = getNextRelease(pendingPayments)

  // Calculate pending total
  const pendingTotal = pendingPayments?.reduce((sum, p) => sum + p.amount, 0) ?? 0

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          {showLabel && (
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Ringkasan Dompet
            </CardTitle>
          )}
          {!isLoading && !error && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Pendapatan</p>
              <p className="text-lg font-bold">{formatCurrency(totalEarnings ?? 0)}</p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-2" />
              <div className="h-6 bg-muted rounded w-32" />
            </div>
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-2" />
              <div className="h-6 bg-muted rounded w-32" />
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Total Earnings */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Total Pendapatan</p>
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(totalEarnings ?? 0)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Semua pendapatan dari pekerjaan selesai
                </p>
              </div>
            </div>

            {/* Next Release Countdown */}
            {nextRelease && nextRelease.hours_until_release > 0 ? (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Dana Akan Cair Dalam</p>
                    <p className="text-base font-bold text-purple-600 dark:text-purple-400">
                      {formatCountdown(nextRelease.hours_until_release)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(pendingTotal)} dalam proses review
                  </p>
                </div>
              </div>
            ) : pendingTotal > 0 ? (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Dana Tersedia</p>
                    <p className="text-base font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(pendingTotal)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Siap untuk ditarik ke rekening
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                <p>Belum ada pendapatan</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
