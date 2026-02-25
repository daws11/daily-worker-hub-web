"use client"

<<<<<<< HEAD
import * as React from "react"
import { Calendar, Clock, Briefcase, ArrowDownLeft, ArrowUpRight } from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type WalletTransactionRow = {
  id: string
  wallet_id: string
  amount: number
  type: 'credit' | 'debit' | 'pending' | 'released'
  booking_id: string | null
  description: string | null
  created_at: string
}
type WalletTransactionType = WalletTransactionRow["type"]

export interface TransactionCardProps {
  transaction: WalletTransactionRow & {
    bookings?: {
      id: string
      jobs: {
        id: string
        title: string
      }
    } | null
  }
  onSelect?: (transaction: TransactionCardProps["transaction"]) => void
  isSelected?: boolean
}

const transactionTypeConfig: Record<
  WalletTransactionType,
  {
    variant: "default" | "secondary" | "destructive" | "outline"
    label: string
    icon: React.ReactNode
    amountColor: string
    amountPrefix: string
  }
> = {
  credit: {
    variant: "default",
    label: "Pemasukan",
    icon: <ArrowDownLeft className="h-4 w-4" />,
    amountColor: "text-green-600",
    amountPrefix: "+",
  },
  debit: {
    variant: "destructive",
    label: "Pengeluaran",
    icon: <ArrowUpRight className="h-4 w-4" />,
    amountColor: "text-red-600",
    amountPrefix: "-",
  },
  pending: {
    variant: "secondary",
    label: "Tertahan",
    icon: <Clock className="h-4 w-4" />,
    amountColor: "text-yellow-600",
    amountPrefix: "",
  },
  released: {
    variant: "default",
    label: "Diterbitkan",
    icon: <ArrowDownLeft className="h-4 w-4" />,
    amountColor: "text-green-600",
    amountPrefix: "+",
  },
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
=======
import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { WalletTransactionWithDetails } from '@/lib/supabase/queries/wallets'
import {
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  XCircle,
  Briefcase,
  Wallet,
  RefreshCw,
} from 'lucide-react'

interface TransactionCardProps {
  transaction: WalletTransactionWithDetails
  onClick?: () => void
  className?: string
}

/**
 * Formats a number as Indonesian Rupiah currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
>>>>>>> auto-claude/017-job-completion-payment-release
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

<<<<<<< HEAD
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = diffInMs / (1000 * 60 * 60)
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24)

    if (diffInHours < 24) {
      return `Hari ini, ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
    } else if (diffInDays < 2) {
      return `Kemarin, ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
    } else if (diffInDays < 7) {
      return date.toLocaleDateString("id-ID", { weekday: "long", hour: "2-digit", minute: "2-digit" })
    } else {
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    }
  } catch {
    return dateString
  }
}

export function TransactionCard({ transaction, onSelect, isSelected }: TransactionCardProps) {
  const { type, amount, description, created_at, bookings } = transaction
  const config = transactionTypeConfig[type]
=======
/**
 * Formats a date as a readable time string
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Gets the icon and color for a transaction type
 */
function getTransactionTypeIcon(type: WalletTransactionWithDetails['type']) {
  switch (type) {
    case 'hold':
      return { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' }
    case 'release':
      return { icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' }
    case 'earn':
      return { icon: ArrowUpRight, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' }
    case 'payout':
      return { icon: ArrowDownRight, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' }
    case 'refund':
      return { icon: RefreshCw, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' }
    default:
      return { icon: Wallet, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-900/30' }
  }
}

/**
 * Gets the status badge for a transaction
 */
function getStatusBadge(status: WalletTransactionWithDetails['status']) {
  switch (status) {
    case 'pending_review':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
          <Clock className="h-3 w-3" />
          Menunggu Review
        </span>
      )
    case 'available':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
          <CheckCircle2 className="h-3 w-3" />
          Tersedia
        </span>
      )
    case 'released':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          Selesai
        </span>
      )
    case 'disputed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
          <AlertCircle className="h-3 w-3" />
          Disputasi
        </span>
      )
    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400">
          <XCircle className="h-3 w-3" />
          Dibatalkan
        </span>
      )
    default:
      return null
  }
}

/**
 * Gets the transaction label for a transaction type
 */
function getTransactionLabel(type: WalletTransactionWithDetails['type']): string {
  switch (type) {
    case 'hold':
      return 'Dana Ditahan'
    case 'release':
      return 'Dana Dilepas'
    case 'earn':
      return 'Pemasukan'
    case 'payout':
      return 'Penarikan'
    case 'refund':
      return 'Pengembalian'
    default:
      return 'Transaksi'
  }
}

/**
 * Determines if the amount should be displayed as positive or negative
 */
function isAmountPositive(type: WalletTransactionWithDetails['type']): boolean {
  return type === 'earn' || type === 'release' || type === 'hold'
}

export function TransactionCard({ transaction, onClick, className }: TransactionCardProps) {
  const { icon: Icon, color, bg } = getTransactionTypeIcon(transaction.type)
  const isPositive = isAmountPositive(transaction.type)
  const displayAmount = Math.abs(transaction.amount)
>>>>>>> auto-claude/017-job-completion-payment-release

  return (
    <Card
      className={cn(
<<<<<<< HEAD
        "transition-all hover:shadow-md",
        onSelect && "cursor-pointer",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      onClick={() => onSelect?.(transaction)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn("flex items-center justify-center h-10 w-10 rounded-full", config.variant === "default" ? "bg-green-100" : config.variant === "destructive" ? "bg-red-100" : "bg-yellow-100")}>
              <div className={cn(config.variant === "default" ? "text-green-600" : config.variant === "destructive" ? "text-red-600" : "text-yellow-600")}>
                {config.icon}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant={config.variant}>{config.label}</Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{formatDate(created_at)}</span>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={cn("text-lg font-semibold", config.amountColor)}>
              {config.amountPrefix}{formatAmount(amount)}
            </span>
          </div>
        </div>
      </CardHeader>
      {(description || bookings?.jobs) && (
        <CardContent className="space-y-2 pt-0">
          {bookings?.jobs && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="line-clamp-1">{bookings.jobs.title}</span>
            </div>
          )}
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}
        </CardContent>
      )}
=======
        'transition-all hover:shadow-md',
        onClick && 'cursor-pointer hover:border-primary/50',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          {/* Left side: Icon and details */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className={cn('flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full', bg)}>
              <Icon className={cn('h-5 w-5 sm:h-6 sm:w-6', color)} />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
              {/* Title and status */}
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-semibold truncate">
                  {transaction.description || getTransactionLabel(transaction.type)}
                </h4>
                {getStatusBadge(transaction.status)}
              </div>

              {/* Job reference if available */}
              {transaction.booking?.job && (
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                  <Briefcase className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                  <span className="truncate">{transaction.booking.job.title}</span>
                </div>
              )}

              {/* Time */}
              <p className="text-xs text-muted-foreground">{formatTime(transaction.created_at)}</p>
            </div>
          </div>

          {/* Right side: Amount */}
          <div className="text-right shrink-0">
            <p
              className={cn(
                'text-sm sm:text-base font-bold',
                isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              )}
            >
              {isPositive ? '+' : '-'}
              {formatCurrency(displayAmount)}
            </p>
          </div>
        </div>
      </CardContent>
>>>>>>> auto-claude/017-job-completion-payment-release
    </Card>
  )
}
