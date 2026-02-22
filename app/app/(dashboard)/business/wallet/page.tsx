"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/app/providers/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import { Wallet, Clock, ArrowDownLeft, ArrowUpRight, Loader2, Briefcase } from "lucide-react"

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
  const [isLoadingWallet, setIsLoadingWallet] = useState(true)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)

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
              })
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

  // Format date to Indonesian locale
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Format amount to Indonesian Rupiah
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Get transaction type badge variant
  const getTransactionTypeVariant = (
    type: WalletTransactionRow["type"]
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case "credit":
        return "default"
      case "debit":
        return "destructive"
      case "pending":
        return "secondary"
      case "released":
        return "default"
      default:
        return "outline"
    }
  }

  // Get transaction type label in Indonesian
  const getTransactionTypeLabel = (type: WalletTransactionRow["type"]): string => {
    switch (type) {
      case "credit":
        return "Pemasukan"
      case "debit":
        return "Pengeluaran"
      case "pending":
        return "Tertahan"
      case "released":
        return "Diterbitkan"
      default:
        return type
    }
  }

  // Get transaction icon
  const getTransactionIcon = (type: WalletTransactionRow["type"]) => {
    switch (type) {
      case "credit":
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />
      case "debit":
        return <ArrowUpRight className="h-4 w-4 text-red-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "released":
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />
      default:
        return null
    }
  }

  // Get amount display with sign
  const getAmountDisplay = (type: WalletTransactionRow["type"], amount: number) => {
    const formatted = formatAmount(amount)
    switch (type) {
      case "credit":
      case "released":
        return `+${formatted}`
      case "debit":
        return `-${formatted}`
      case "pending":
        return formatted
      default:
        return formatted
    }
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

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Transaksi</CardTitle>
            <CardDescription>
              Daftar semua transaksi dompet ({transactions.length} transaksi)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Belum ada transaksi. Mulai posting pekerjaan dan temukan pekerja terbaik!
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Pekerjaan</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            {getTransactionIcon(transaction.type)}
                            <span className="text-muted-foreground">
                              {formatDate(transaction.created_at)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTransactionTypeVariant(transaction.type)}>
                            {getTransactionTypeLabel(transaction.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {transaction.bookings?.jobs ? (
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              <span className="line-clamp-1">
                                {transaction.bookings.jobs.title}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {transaction.description || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-medium ${
                              transaction.type === "credit" || transaction.type === "released"
                                ? "text-green-600"
                                : transaction.type === "debit"
                                ? "text-red-600"
                                : "text-yellow-600"
                            }`}
                          >
                            {getAmountDisplay(transaction.type, transaction.amount)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
