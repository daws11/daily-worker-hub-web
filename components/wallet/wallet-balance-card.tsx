"use client"

import * as React from "react"
import { Wallet, Clock, CheckCircle2, AlertCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface WalletBalance {
  pending_balance: number
  available_balance: number
}

export interface WalletBalanceCardProps {
  balance?: WalletBalance | null
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

export function WalletBalanceCard({
  balance,
  isLoading = false,
  error,
  className,
  showLabel = true,
}: WalletBalanceCardProps) {
  const pendingBalance = balance?.pending_balance ?? 0
  const availableBalance = balance?.available_balance ?? 0
  const totalBalance = pendingBalance + availableBalance

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          {showLabel && (
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Saldo Dompet
            </CardTitle>
          )}
          {!isLoading && !error && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Saldo</p>
              <p className="text-lg font-bold">{formatCurrency(totalBalance)}</p>
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
            {/* Available Balance */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Tersedia</p>
                  <p className="text-base font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(availableBalance)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dana siap untuk ditarik
                </p>
              </div>
            </div>

            {/* Pending Balance */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Dalam Proses</p>
                  <p className="text-base font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(pendingBalance)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Menunggu periode review 24 jam
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
