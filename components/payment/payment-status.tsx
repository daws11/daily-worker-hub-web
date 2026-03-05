"use client"

import * as React from "react"
import { toast } from "sonner"
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink,
  RefreshCw,
  QrCode,
  Loader2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatIDR } from "@/lib/utils/currency"
import type { PaymentProvider } from "@/lib/payments"

export interface PaymentTransaction {
  id: string
  amount: number
  status: "pending" | "success" | "failed" | "expired" | "cancelled"
  payment_provider: PaymentProvider
  payment_url?: string | null
  qris_expires_at?: string | null
  paid_at?: string | null
  failure_reason?: string | null
  fee_amount?: number
  created_at: string
  updated_at: string
  metadata?: Record<string, unknown>
}

export interface PaymentStatusProps {
  transaction: PaymentTransaction
  onRefresh?: () => void
  isRefreshing?: boolean
  showActions?: boolean
  compact?: boolean
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950",
    badgeVariant: "secondary" as const,
    label: "Pending Payment",
    description: "Waiting for payment completion",
  },
  success: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950",
    badgeVariant: "default" as const,
    label: "Payment Successful",
    description: "Payment has been completed successfully",
  },
  failed: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950",
    badgeVariant: "destructive" as const,
    label: "Payment Failed",
    description: "Payment processing failed",
  },
  expired: {
    icon: AlertCircle,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    badgeVariant: "destructive" as const,
    label: "Payment Expired",
    description: "Payment window has expired",
  },
  cancelled: {
    icon: XCircle,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-950",
    badgeVariant: "outline" as const,
    label: "Payment Cancelled",
    description: "Payment was cancelled",
  },
}

export function PaymentStatus({
  transaction,
  onRefresh,
  isRefreshing = false,
  showActions = true,
  compact = false,
}: PaymentStatusProps) {
  const config = STATUS_CONFIG[transaction.status]
  const StatusIcon = config.icon

  // Calculate remaining time for pending payments
  const [timeRemaining, setTimeRemaining] = React.useState<string>("")

  React.useEffect(() => {
    if (transaction.status === "pending" && transaction.qris_expires_at) {
      const updateRemaining = () => {
        const now = new Date().getTime()
        const expiry = new Date(transaction.qris_expires_at!).getTime()
        const remaining = expiry - now

        if (remaining <= 0) {
          setTimeRemaining("Expired")
          return
        }

        const minutes = Math.floor(remaining / 60000)
        const seconds = Math.floor((remaining % 60000) / 1000)
        setTimeRemaining(`${minutes}m ${seconds}s`)
      }

      updateRemaining()
      const interval = setInterval(updateRemaining, 1000)
      return () => clearInterval(interval)
    }
  }, [transaction.status, transaction.qris_expires_at])

  const handlePayNow = () => {
    if (transaction.payment_url) {
      window.open(transaction.payment_url, "_blank")
    }
  }

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh()
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border">
        <div className={`${config.color} bg-background`}>
          <StatusIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{config.label}</p>
          <p className="text-xs text-muted-foreground truncate">
            {formatIDR(transaction.amount)}
          </p>
        </div>
        <Badge variant={config.badgeVariant}>{transaction.status}</Badge>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <span className={`${config.color} bg-background rounded-full`}>
                <StatusIcon className="h-5 w-5" />
              </span>
              Payment Status
            </CardTitle>
            <CardDescription>
              {config.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={config.badgeVariant} className="font-medium">
              {transaction.status}
            </Badge>
            {showActions && transaction.status === "pending" && onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Transaction Details */}
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Transaction ID</span>
            <span className="text-sm font-mono">{transaction.id.substring(0, 8)}...</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-sm font-semibold">{formatIDR(transaction.amount)}</span>
          </div>

          {transaction.fee_amount && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Fee</span>
              <span className="text-sm">{formatIDR(transaction.fee_amount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Payment Method</span>
            <span className="text-sm font-medium capitalize">{transaction.payment_provider}</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Created</span>
            <span className="text-sm">
              {new Date(transaction.created_at).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>

          {transaction.paid_at && (
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Paid At</span>
              <span className="text-sm">
                {new Date(transaction.paid_at).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}
        </div>

        {/* Pending Payment Info */}
        {transaction.status === "pending" && (
          <div className="space-y-3 pt-4 border-t">
            {transaction.qris_expires_at && timeRemaining && timeRemaining !== "Expired" && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time Remaining</span>
                  <span className="font-medium text-yellow-600 dark:text-yellow-400">
                    {timeRemaining}
                  </span>
                </div>
                <Progress value={calculateProgress(transaction.qris_expires_at)} />
              </div>
            )}

            {transaction.payment_url && showActions && (
              <div className="flex gap-2">
                <Button
                  onClick={handlePayNow}
                  className="flex-1"
                  size="sm"
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Pay Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(transaction.payment_url!)
                    toast.success("Payment link copied to clipboard")
                  }}
                  size="sm"
                >
                  Copy Link
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Failed/Expired/Cancelled Info */}
        {["failed", "expired", "cancelled"].includes(transaction.status) && (
          <div className={`p-4 rounded-lg ${config.bgColor} border border-${config.color.split("-")[1]}-200`}>
            <div className="flex items-start gap-2">
              <StatusIcon className={`h-5 w-5 ${config.color} mt-0.5`} />
              <div className="flex-1">
                <p className="text-sm font-medium">{config.label}</p>
                {transaction.failure_reason && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {transaction.failure_reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success Info */}
        {transaction.status === "success" && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Payment Successful!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  {formatIDR(transaction.amount)} has been added to your wallet.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
          <details className="pt-4 border-t">
            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
              View Details
            </summary>
            <div className="mt-3 space-y-2">
              {Object.entries(transaction.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                  <span className="font-mono text-xs">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  )
}

function calculateProgress(expiresAt: string): number {
  const now = new Date().getTime()
  const expiry = new Date(expiresAt).getTime()
  const total = 60 * 60 * 1000 // 1 hour in milliseconds (assuming standard expiry)
  const elapsed = expiry - now
  return Math.max(0, Math.min(100, (elapsed / total) * 100))
}

/**
 * Payment History Item Component
 */
export interface PaymentHistoryItemProps {
  transaction: PaymentTransaction
  onClick?: () => void
}

export function PaymentHistoryItem({ transaction, onClick }: PaymentHistoryItemProps) {
  const config = STATUS_CONFIG[transaction.status]
  const StatusIcon = config.icon

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
    >
      <div className={`${config.color} bg-background rounded-full`}>
        <StatusIcon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{config.label}</p>
          <Badge variant={config.badgeVariant} className="text-xs">
            {transaction.status}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-sm font-semibold">{formatIDR(transaction.amount)}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(transaction.created_at).toLocaleDateString("id-ID")}
          </p>
        </div>
      </div>
    </button>
  )
}
