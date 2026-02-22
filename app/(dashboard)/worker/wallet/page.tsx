"use client"

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/app/providers/auth-provider'
import { useWallet } from '@/lib/hooks/useWallet'
import { WalletBalanceCard } from '@/components/wallet/wallet-balance-card'
import { WalletSummary } from '@/components/wallet/wallet-summary'
import { TransactionHistoryWithHeader } from '@/components/wallet/transaction-history'
import { getOrCreateWalletAction, getWalletTransactionsAction } from '@/lib/actions/wallets'
import { toast } from 'sonner'
import { Wallet, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/supabase/types'
import type { WalletTransactionWithDetails } from '@/lib/supabase/queries/wallets'

type WalletTransaction = Database['public']['Tables']['wallet_transactions']['Row']
type WalletTransactionWithBooking = WalletTransaction & {
  booking?: {
    id: string
    job: {
      id: string
      title: string
    }
  }
}

export default function WorkerWalletPage() {
  const { user } = useAuth()

  // Local state for wallet data (using server actions)
  const [walletBalance, setWalletBalance] = useState<{
    pending_balance: number
    available_balance: number
  } | null>(null)
  const [transactions, setTransactions] = useState<WalletTransactionWithDetails[] | null>(null)
  const [walletId, setWalletId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter state for transactions
  const [filterType, setFilterType] = useState<'all' | 'hold' | 'release' | 'earn' | 'payout'>('all')

  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      // First, ensure wallet exists
      const walletResult = await getOrCreateWalletAction(user.id)

      if (!walletResult.success || !walletResult.data) {
        setError(walletResult.error || 'Gagal mengambil data dompet')
        return
      }

      // Set wallet balance and ID
      setWalletBalance({
        pending_balance: walletResult.data.pending_balance,
        available_balance: walletResult.data.available_balance,
      })
      setWalletId(walletResult.data.id)

      // Fetch transactions
      const transactionsResult = await getWalletTransactionsAction(user.id, 50)

      if (!transactionsResult.success) {
        setError(transactionsResult.error || 'Gagal mengambil riwayat transaksi')
        return
      }

      // Transform transactions to include wallet property for WalletTransactionWithDetails compatibility
      const transformedTransactions: WalletTransactionWithDetails[] = (transactionsResult.data || []).map(t => ({
        ...t,
        wallet: {
          id: walletResult.data.id,
          user_id: walletResult.data.user_id,
          pending_balance: walletResult.data.pending_balance,
          available_balance: walletResult.data.available_balance,
          created_at: walletResult.data.created_at,
          updated_at: walletResult.data.updated_at,
        },
      }))

      setTransactions(transformedTransactions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Fetch wallet data on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchWalletData()
    }
  }, [user, fetchWalletData])

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchWalletData()
  }, [fetchWalletData])

  // Handle transaction click
  const handleTransactionClick = useCallback((transaction: WalletTransactionWithDetails) => {
    // Can be extended to open a detail dialog
    toast.info(`Transaksi: ${transaction.description}`)
  }, [])

  // Handle filter change
  const handleFilterChange = useCallback((type: 'all' | 'hold' | 'release' | 'earn' | 'payout') => {
    setFilterType(type)
  }, [])

  // Calculate total earnings
  const totalEarnings = transactions?.reduce((sum, t) => {
    if (t.type === 'earn' || t.type === 'release' || t.type === 'hold') {
      return sum + t.amount
    }
    return sum
  }, 0) || 0

  // Calculate pending payments
  const pendingPayments = transactions
    ?.filter(t => t.status === 'pending_review')
    .map(t => ({
      booking_id: t.booking_id || '',
      job_title: t.booking?.job?.title || 'Pekerjaan',
      amount: t.amount,
      review_deadline: new Date(new Date(t.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      hours_until_release: Math.max(0, 24 - (Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60)),
    })) || []

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-2xl font-bold">Dompet Saya</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <Loader2 className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Kelola saldo dan lihat riwayat transaksi Anda
          </p>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-4">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Wallet Balance Card */}
          <div className="md:col-span-1">
            <WalletBalanceCard
              balance={walletBalance}
              isLoading={isLoading}
              error={error}
            />
          </div>

          {/* Wallet Summary Card */}
          <div className="md:col-span-1">
            <WalletSummary
              totalEarnings={totalEarnings}
              pendingPayments={pendingPayments}
              isLoading={isLoading}
              error={error}
            />
          </div>

          {/* Quick Stats Card */}
          <div className="md:col-span-2 lg:col-span-1">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Transaksi</p>
                  <p className="text-2xl font-bold">{transactions?.length || 0}</p>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Saldo Tersedia</p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {walletBalance ? new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(walletBalance.available_balance) : '-'}
                  </p>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Menunggu Review</p>
                  <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                    {walletBalance ? new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(walletBalance.pending_balance) : '-'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transaction History */}
        <div className="space-y-4">
          <TransactionHistoryWithHeader
            transactions={transactions}
            loading={isLoading}
            onTransactionClick={handleTransactionClick}
            title="Riwayat Transaksi"
            subtitle="Semua transaksi dompet Anda"
            emptyTitle="Belum ada transaksi"
            emptyDescription="Selesaikan pekerjaan untuk mulai mendapatkan pendapatan"
            filterType={filterType}
            onFilterChange={handleFilterChange}
          />
        </div>
      </div>
    </div>
  )
}
