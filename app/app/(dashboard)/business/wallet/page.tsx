"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/app/providers/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import { Wallet, Clock, Loader2 } from "lucide-react"
import { TransactionCard } from "@/components/wallet/transaction-card"
import { TransactionFilters } from "@/components/wallet/transaction-filters"
import type { TransactionFilters as TransactionFiltersType } from "@/lib/types/wallet"
import { TransactionDetailDialog } from "@/components/wallet/transaction-detail-dialog"

type BusinessesRow = Database["public"]["Tables"]["businesses"]["Row"]
type WalletRow = Database["public"]["Tables"]["wallets"]["Row"]
type WalletTransactionRow = Database["public"]["Tables"]["wallet_transactions"]["Row"]

type WalletWithBalance = WalletRow

type TransactionWithDetails = WalletTransactionRow & {
  bookings?: {
    id: string
    jobs: {
      id: string
      title: string
    }
  } | null
}

export default function BusinessWalletPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [business, setBusiness] = useState<BusinessesRow | null>(null)
  const [wallet, setWallet] = useState<WalletWithBalance | null>(null)
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionWithDetails[]>([])
  const [isLoadingWallet, setIsLoadingWallet] = useState(true)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null)
  const [filters, setFilters] = useState<TransactionFiltersType>({})

  // Fetch business profile
  useEffect(() => {
    async function fetchBusiness() {
      if (!user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (error || !data) {
        toast.error("Profil bisnis tidak ditemukan")
        return
      }

      setBusiness(data)
    }

    fetchBusiness()
  }, [user, router])

  // Fetch wallet
  useEffect(() => {
    async function fetchWallet() {
      if (!user) return

      setIsLoadingWallet(true)
      try {
        const { data, error } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", user.id)
          .single()

        if (error) {
          // If wallet doesn't exist, create one
          if (error.code === "PGRST116") {
            const { data: newWallet, error: createError } = await supabase
              .from("wallets")
              .insert({
                user_id: user.id,
                balance: 0,
                pending_balance: 0,
              } as any)
              .select()
              .single()

            if (createError) {
              toast.error("Gagal membuat dompet")
              return
            }

            setWallet(newWallet)
            return
          }

          toast.error("Gagal memuat data dompet")
          return
        }

        setWallet(data)
      } finally {
        setIsLoadingWallet(false)
      }
    }

    fetchWallet()
  }, [user])

  // Fetch transactions
  useEffect(() => {
    async function fetchTransactions() {
      if (!wallet) return

      setIsLoadingTransactions(true)
      try {
        const { data, error } = await supabase
          .from("wallet_transactions")
          .select(`
            *,
            bookings (
              id,
              jobs (
                id,
                title
              )
            )
          `)
          .eq("wallet_id", wallet.id)
          .order("created_at", { ascending: false })

        if (error) {
          toast.error("Gagal memuat riwayat transaksi")
          return
        }

        setTransactions(data as TransactionWithDetails[])
      } finally {
        setIsLoadingTransactions(false)
      }
    }

    fetchTransactions()
  }, [wallet])

  // Apply filters to transactions
  useEffect(() => {
    let filtered = [...transactions]

    // Filter by type
    if (filters.type) {
      filtered = filtered.filter((t) => t.type === filters.type)
    }

    // Filter by amount range
    if (filters.amountMin !== undefined) {
      filtered = filtered.filter((t) => t.amount >= filters.amountMin!)
    }
    if (filters.amountMax !== undefined) {
      filtered = filtered.filter((t) => t.amount <= filters.amountMax!)
    }

    // Filter by date range
    if (filters.dateAfter) {
      filtered = filtered.filter((t) => new Date(t.created_at) >= new Date(filters.dateAfter!))
    }
    if (filters.dateBefore) {
      const endDate = new Date(filters.dateBefore!)
      endDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter((t) => new Date(t.created_at) <= endDate)
    }

    setFilteredTransactions(filtered)
  }, [transactions, filters])

  // Format amount to Indonesian Rupiah
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Dompet Bisnis</h1>
          <p className="text-[#666]">
            Kelola saldo dan lihat riwayat transaksi bisnis Anda
          </p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Total Balance Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Saldo Tersedia</CardDescription>
              <CardTitle className="text-3xl text-[#2563eb]">
                {isLoadingWallet ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  formatAmount(wallet?.balance || 0)
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span>Saldo yang dapat digunakan</span>
              </div>
            </CardContent>
          </Card>

          {/* Pending Balance Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Saldo Tertahan</CardDescription>
              <CardTitle className="text-3xl text-[#f59e0b]">
                {isLoadingWallet ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  formatAmount(wallet?.pending_balance || 0)
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Menunggu penyelesaian transaksi</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Transaction List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <TransactionFilters
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>

          {/* Transaction List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Transaksi</CardTitle>
                <CardDescription>
                  {filteredTransactions.length === transactions.length
                    ? `Semua transaksi (${transactions.length} transaksi)`
                    : `${filteredTransactions.length} dari ${transactions.length} transaksi`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTransactions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {transactions.length === 0
                        ? "Belum ada transaksi. Mulai posting pekerjaan dan temukan pekerja terbaik!"
                        : "Tidak ada transaksi yang cocok dengan filter."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTransactions.map((transaction) => (
                      <TransactionCard
                        key={transaction.id}
                        transaction={transaction}
                        onSelect={setSelectedTransaction}
                        isSelected={selectedTransaction?.id === transaction.id}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transaction Detail Dialog */}
        <TransactionDetailDialog
          transaction={selectedTransaction}
          open={selectedTransaction !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedTransaction(null)
          }}
        />
      </div>
    </div>
  )
}
