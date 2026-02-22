import * as React from "react"
import { Wallet } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatIDR } from "@/lib/utils/currency"
import type { Wallet, WalletType } from "@/lib/types/payment"

export interface WalletBalanceProps extends React.HTMLAttributes<HTMLDivElement> {
  wallet?: Wallet | null
  isLoading?: boolean
  walletType?: WalletType
  title?: string
  description?: string
  showIcon?: boolean
  balanceLabel?: string
}

const WalletBalance = React.forwardRef<HTMLDivElement, WalletBalanceProps>(
  (
    {
      wallet,
      isLoading = false,
      walletType = "business",
      title,
      description,
      showIcon = true,
      balanceLabel = "Saldo",
      className,
      ...props
    },
    ref
  ) => {
    // Get default title based on wallet type
    const getDefaultTitle = (): string => {
      if (title) return title
      return walletType === "business" ? "Dompet Bisnis" : "Dompet Pekerja"
    }

    // Get default description based on wallet type
    const getDefaultDescription = (): string => {
      if (description) return description
      return walletType === "business"
        ? "Saldo dompet bisnis Anda"
        : "Saldo dompet pendapatan Anda"
    }

    // Loading state
    if (isLoading) {
      return (
        <Card ref={ref} className={cn("w-full", className)} {...props}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {showIcon && <Wallet className="h-5 w-5 text-muted-foreground" />}
              <CardTitle>{getDefaultTitle()}</CardTitle>
            </div>
            <CardDescription>{getDefaultDescription()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Empty state (no wallet)
    if (!wallet) {
      return (
        <Card ref={ref} className={cn("w-full", className)} {...props}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {showIcon && <Wallet className="h-5 w-5 text-muted-foreground" />}
              <CardTitle>{getDefaultTitle()}</CardTitle>
            </div>
            <CardDescription>{getDefaultDescription()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{balanceLabel}</p>
              <p className="text-2xl font-semibold text-muted-foreground">
                {formatIDR(0)}
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Normal state with wallet data
    return (
      <Card ref={ref} className={cn("w-full", className)} {...props}>
        <CardHeader>
          <div className="flex items-center gap-2">
            {showIcon && <Wallet className="h-5 w-5 text-muted-foreground" />}
            <CardTitle>{getDefaultTitle()}</CardTitle>
          </div>
          <CardDescription>{getDefaultDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{balanceLabel}</p>
            <p className="text-3xl font-semibold tracking-tight">
              {formatIDR(wallet.balance)}
            </p>
            {wallet.currency && wallet.currency !== "IDR" && (
              <p className="text-xs text-muted-foreground">
                Mata uang: {wallet.currency}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
)
WalletBalance.displayName = "WalletBalance"

export { WalletBalance }
