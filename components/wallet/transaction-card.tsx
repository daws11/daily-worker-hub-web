"use client"

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

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

function isAmountPositive(type: WalletTransactionWithDetails['type']): boolean {
  return type === 'earn' || type === 'release' || type === 'hold'
}

export function TransactionCard({ transaction, onClick, className }: TransactionCardProps) {
  const { icon: Icon, color, bg } = getTransactionTypeIcon(transaction.type)
  const isPositive = isAmountPositive(transaction.type)
  const displayAmount = Math.abs(transaction.amount)

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        onClick && 'cursor-pointer hover:border-primary/50',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn('flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full', bg)}>
              <Icon className={cn('h-5 w-5 sm:h-6 sm:w-6', color)} />
            </div>

            <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-semibold truncate">
                  {transaction.description || getTransactionLabel(transaction.type)}
                </h4>
                {getStatusBadge(transaction.status)}
              </div>

              {transaction.booking?.job && (
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                  <Briefcase className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                  <span className="truncate">{transaction.booking.job.title}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground">{formatTime(transaction.created_at)}</p>
            </div>
          </div>

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
    </Card>
  )
}
