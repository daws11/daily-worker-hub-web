"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Receipt, SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WalletTransactionWithDetails } from '@/lib/supabase/queries/wallets'
import { TransactionCard } from './transaction-card'

interface TransactionHistoryProps {
  transactions: WalletTransactionWithDetails[] | null
  loading?: boolean
  onTransactionClick?: (transaction: WalletTransactionWithDetails) => void
  className?: string
  emptyTitle?: string
  emptyDescription?: string
  filterType?: WalletTransactionWithDetails['type'] | 'all'
}

/**
 * Formats a number as Indonesian Rupiah currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formats a date as a relative time string
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Baru saja'
  if (diffMins < 60) return `${diffMins} menit yang lalu`
  if (diffHours < 24) return `${diffHours} jam yang lalu`
  if (diffDays === 1) return 'Kemarin'
  if (diffDays < 7) return `${diffDays} hari yang lalu`

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export function TransactionHistory({
  transactions,
  loading = false,
  onTransactionClick,
  className,
  emptyTitle = 'Belum ada transaksi',
  emptyDescription = 'Transaksi dompet Anda akan muncul di sini',
  filterType = 'all',
}: TransactionHistoryProps) {
  // Filter transactions by type if specified
  const filteredTransactions = React.useMemo(() => {
    if (!transactions) return null
    if (filterType === 'all') return transactions
    return transactions.filter((t) => t.type === filterType)
  }, [transactions, filterType])

  // Show loading state
  if (loading) {
    return (
      <div className={cn('space-y-3 sm:space-y-4', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="h-4 sm:h-5 w-32 sm:w-48 bg-muted rounded" />
                    <div className="h-3 sm:h-4 w-24 sm:w-32 bg-muted rounded" />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="h-5 sm:h-6 w-24 sm:w-32 bg-muted rounded ml-auto" />
                  <div className="h-3 sm:h-4 w-16 sm:w-20 bg-muted rounded ml-auto mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Show empty state
  if (!filteredTransactions || filteredTransactions.length === 0) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center">
          <div className="rounded-full bg-muted p-3 sm:p-4 mb-3 sm:mb-4">
            <SearchX className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold mb-2">{emptyTitle}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">{emptyDescription}</p>
        </CardContent>
      </Card>
    )
  }

  // Group transactions by date
  const groupedTransactions = React.useMemo(() => {
    const groups: Record<string, WalletTransactionWithDetails[]> = {}

    filteredTransactions.forEach((transaction) => {
      const date = new Date(transaction.created_at)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      let dateKey = ''

      if (date.toDateString() === today.toDateString()) {
        dateKey = 'Hari Ini'
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = 'Kemarin'
      } else if (diffDays(date, today) < 7) {
        dateKey = '7 Hari Terakhir'
      } else {
        dateKey = date.toLocaleDateString('id-ID', {
          month: 'long',
          year: 'numeric',
        })
      }

      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(transaction)
    })

    return groups
  }, [filteredTransactions])

  function diffDays(date1: Date, date2: Date): number {
    return Math.floor((date2.getTime() - date1.getTime()) / 86400000)
  }

  // Show transaction list grouped by date
  return (
    <div className={cn('space-y-4 sm:space-y-6', className)}>
      {Object.entries(groupedTransactions).map(([dateGroup, groupTransactions]) => (
        <div key={dateGroup} className="space-y-3">
          <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground px-1">
            {dateGroup}
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {groupTransactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onClick={onTransactionClick ? () => onTransactionClick(transaction) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

interface TransactionHistoryWithHeaderProps {
  transactions: WalletTransactionWithDetails[] | null
  loading?: boolean
  onTransactionClick?: (transaction: WalletTransactionWithDetails) => void
  className?: string
  title?: string
  subtitle?: string
  emptyTitle?: string
  emptyDescription?: string
  filterType?: WalletTransactionWithDetails['type'] | 'all'
  onFilterChange?: (type: WalletTransactionWithDetails['type'] | 'all') => void
}

export function TransactionHistoryWithHeader({
  transactions,
  loading = false,
  onTransactionClick,
  className,
  title,
  subtitle,
  emptyTitle,
  emptyDescription,
  filterType = 'all',
  onFilterChange,
}: TransactionHistoryWithHeaderProps) {
  // Calculate total for filtered transactions
  const totalAmount = React.useMemo(() => {
    if (!transactions) return 0
    if (filterType === 'all') {
      // For all types, show net total (earnings - payouts)
      return transactions.reduce((sum, t) => {
        if (t.type === 'earn' || t.type === 'release') return sum + t.amount
        if (t.type === 'payout' || t.type === 'refund') return sum - t.amount
        return sum
      }, 0)
    }
    return transactions
      .filter((t) => t.type === filterType)
      .reduce((sum, t) => (t.type === 'payout' || t.type === 'refund' ? sum - t.amount : sum + t.amount), 0)
  }, [transactions, filterType])

  return (
    <div className={cn('space-y-3 sm:space-y-4', className)}>
      {(title || subtitle) && (
        <div className="space-y-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              <h2 className="text-lg sm:text-xl font-semibold">{title || 'Riwayat Transaksi'}</h2>
              {!loading && transactions && transactions.length > 0 && (
                <span className="text-xs sm:text-sm text-muted-foreground">
                  ({transactions.length} {transactions.length === 1 ? 'transaksi' : 'transaksi'})
                </span>
              )}
            </div>
            {!loading && transactions && transactions.length > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-base sm:text-lg font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}

      {/* Filter tabs */}
      {onFilterChange && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {(['all', 'hold', 'release', 'earn', 'payout'] as const).map((type) => (
            <button
              key={type}
              onClick={() => onFilterChange(type)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors',
                filterType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {type === 'all' && 'Semua'}
              {type === 'hold' && 'Ditahan'}
              {type === 'release' && 'Dilepas'}
              {type === 'earn' && 'Pemasukan'}
              {type === 'payout' && 'Penarikan'}
            </button>
          ))}
        </div>
      )}

      <TransactionHistory
        transactions={transactions}
        loading={loading}
        onTransactionClick={onTransactionClick}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        filterType={filterType}
      />
    </div>
  )
}
