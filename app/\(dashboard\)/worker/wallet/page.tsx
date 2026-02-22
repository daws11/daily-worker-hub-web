"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/app/providers/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import { getWorkerWalletBalance, requestPayout } from "@/lib/actions/payments"
import { Wallet, Loader2, ArrowDownLeft, Clock, CheckCircle2, XCircle, AlertCircle, Building2 } from "lucide-react"

type WorkersRow = Database["public"]["Tables"]["workers"]["Row"]
type PayoutRequest = Database["public"]["Tables"]["payout_requests"]["Row"]
type BankAccount = Database["public"]["Tables"]["bank_accounts"]["Row"]

type WalletBalance = {
  balance: number
  currency: string
}

type PayoutWithBankAccount = PayoutRequest & {
  bank_accounts?: {
    bank_code: string
    bank_account_number: string
    bank_account_name: string
  } | null
}

export default function WorkerWalletPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [worker, setWorker] = useState<WorkersRow | null>(null)
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null)
  const [payouts, setPayouts] = useState<PayoutWithBankAccount[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [isLoadingWorker, setIsLoadingWorker] = useState(true)
  const [isLoadingWallet, setIsLoadingWallet] = useState(true)
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(true)
  const [isProcessingPayout, setIsProcessingPayout] = useState(false)
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>("")
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("")
  const [feeBreakdown, setFeeBreakdown] = useState<{
    amount: number
    fee_amount: number
    net_amount: number
    bank_name: string
  } | null>(null)

  // Fetch worker profile
  useEffect(() => {
    async function fetchWorker() {
      if (!user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (error || !data) {
        toast.error("Profil worker tidak ditemukan")
        return
      }

      setWorker(data)
    }

    fetchWorker()
  }, [user, router])

  // Fetch wallet balance
  useEffect(() => {
    async function fetchWalletBalance() {
      if (!worker) return

      setIsLoadingWallet(true)
      try {
        const result = await getWorkerWalletBalance(worker.id)

        if (!result.success || !result.data) {
          toast.error(result.error || "Gagal memuat saldo wallet")
          return
        }

        setWalletBalance(result.data)
      } finally {
        setIsLoadingWallet(false)
      }
    }

    fetchWalletBalance()
  }, [worker])

  // Fetch bank accounts
  useEffect(() => {
    async function fetchBankAccounts() {
      if (!worker) return

      try {
        const { data, error } = await supabase
          .from("bank_accounts")
          .select("*")
          .eq("worker_id", worker.id)
          .order("is_primary", { ascending: false })

        if (error) {
          toast.error("Gagal memuat rekening bank")
          return
        }

        setBankAccounts(data || [])

        // Set primary account as default
        const primaryAccount = data?.find(acc => acc.is_primary)
        if (primaryAccount) {
          setSelectedBankAccountId(primaryAccount.id)
        }
      } catch {
        toast.error("Gagal memuat rekening bank")
      }
    }

    fetchBankAccounts()
  }, [worker])

  // Fetch payout history
  useEffect(() => {
    async function fetchPayouts() {
      if (!worker) return

      setIsLoadingPayouts(true)
      try {
        const { data, error } = await supabase
          .from("payout_requests")
          .select(`
            *,
            bank_accounts (
              bank_code,
              bank_account_number,
              bank_account_name
            )
          `)
          .eq("worker_id", worker.id)
          .order("created_at", { ascending: false })

        if (error) {
          toast.error("Gagal memuat riwayat penarikan")
          return
        }

        setPayouts(data as PayoutWithBankAccount[])
      } finally {
        setIsLoadingPayouts(false)
      }
    }

    fetchPayouts()
  }, [worker])

  // Calculate fee when amount changes
  useEffect(() => {
    async function calculateFee() {
      if (!withdrawalAmount || isNaN(Number(withdrawalAmount))) {
        setFeeBreakdown(null)
        return
      }

      const amount = Number(withdrawalAmount)
      if (amount < 100000) return

      // Get selected bank account
      const selectedAccount = bankAccounts.find(acc => acc.id === selectedBankAccountId)
      if (!selectedAccount) {
        setFeeBreakdown(null)
        return
      }

      // Simple fee calculation: 1% or Rp 5.000, whichever is higher
      const feeAmount = Math.max(amount * 0.01, 5000)
      const netAmount = amount - feeAmount

      setFeeBreakdown({
        amount,
        fee_amount: feeAmount,
        net_amount: netAmount,
        bank_name: selectedAccount.bank_code,
      })
    }

    calculateFee()
  }, [withdrawalAmount, selectedBankAccountId, bankAccounts])

  // Handle withdrawal
  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!worker) return

    const amount = Number(withdrawalAmount)
    if (isNaN(amount) || amount < 100000) {
      toast.error("Minimal penarikan Rp 100.000")
      return
    }

    if (!selectedBankAccountId) {
      toast.error("Silakan pilih rekening bank tujuan")
      return
    }

    if (!walletBalance || amount > walletBalance.balance) {
      toast.error("Saldo tidak mencukupi")
      return
    }

    setIsProcessingPayout(true)
    try {
      const result = await requestPayout(worker.id, amount, selectedBankAccountId)

      if (!result.success) {
        toast.error(result.error || "Gagal membuat permintaan penarikan")
        return
      }

      toast.success("Permintaan penarikan berhasil dibuat")

      // Reset form
      setWithdrawalAmount("")
      setFeeBreakdown(null)

      // Refresh data after a delay
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } finally {
      setIsProcessingPayout(false)
    }
  }

  // Format currency to Indonesian Rupiah
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

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

  // Get bank name from bank code
  const getBankName = (bankCode: string) => {
    const bankNames: Record<string, string> = {
      BCA: "Bank Central Asia",
      BRI: "Bank Rakyat Indonesia",
      Mandiri: "Bank Mandiri",
      BNI: "Bank Nasional Indonesia",
    }
    return bankNames[bankCode] || bankCode
  }

  // Get status badge variant and icon
  const getStatusInfo = (status: PayoutRequest["status"]) => {
    switch (status) {
      case "completed":
        return {
          variant: "default" as const,
          label: "Berhasil",
          icon: CheckCircle2,
          className: "bg-green-100 text-green-800 hover:bg-green-100",
        }
      case "pending":
        return {
          variant: "secondary" as const,
          label: "Menunggu",
          icon: Clock,
          className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
        }
      case "processing":
        return {
          variant: "secondary" as const,
          label: "Sedang Diproses",
          icon: Clock,
          className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
        }
      case "failed":
        return {
          variant: "destructive" as const,
          label: "Gagal",
          icon: XCircle,
          className: "bg-red-100 text-red-800 hover:bg-red-100",
        }
      case "cancelled":
        return {
          variant: "outline" as const,
          label: "Dibatalkan",
          icon: XCircle,
          className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
        }
      default:
        return {
          variant: "outline" as const,
          label: status,
          icon: AlertCircle,
          className: "",
        }
    }
  }

  if (isLoadingWorker) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat profil worker...</p>
        </div>
      </div>
    )
  }

  const hasBankAccounts = bankAccounts.length > 0

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Wallet Worker</h1>
          <p className="text-[#666]">
            Kelola saldo dan riwayat penarikan Anda
          </p>
        </div>

        {/* Wallet Balance Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <Wallet className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Saldo Wallet</CardTitle>
                  <CardDescription>Saldo yang tersedia untuk ditarik</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingWallet ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-green-600">
                    {walletBalance ? formatCurrency(walletBalance.balance) : "Rp 0"}
                  </span>
                  <span className="text-lg text-muted-foreground">
                    {walletBalance?.currency || "IDR"}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Saldo akan berkurang setelah permintaan penarikan diproses
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5" />
              Tarik Saldo
            </CardTitle>
            <CardDescription>
              {hasBankAccounts
                ? "Tarik saldo ke rekening bank Anda (minimal Rp 100.000)"
                : "Silakan tambahkan rekening bank terlebih dahulu untuk menarik saldo"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasBankAccounts ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Belum ada rekening bank terdaftar
                </p>
                <p className="text-sm text-muted-foreground">
                  Hubungi admin untuk menambahkan rekening bank Anda
                </p>
              </div>
            ) : (
              <form onSubmit={handleWithdrawal} className="space-y-4">
                {/* Bank Account Selection */}
                {bankAccounts.length > 1 && (
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="bankAccount">Rekening Tujuan</Label>
                    <select
                      id="bankAccount"
                      value={selectedBankAccountId}
                      onChange={(e) => setSelectedBankAccountId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isProcessingPayout}
                    >
                      {bankAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {getBankName(account.bank_code)} - {account.bank_account_number} ({account.bank_account_name})
                          {account.is_primary && " - Utama"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {bankAccounts.length === 1 && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm font-medium">Rekening Tujuan:</div>
                    <div className="text-sm text-muted-foreground">
                      {getBankName(bankAccounts[0].bank_code)} - {bankAccounts[0].bank_account_number}
                    </div>
                    <div className="text-xs text-muted-foreground">{bankAccounts[0].bank_account_name}</div>
                  </div>
                )}

                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="amount">Jumlah Penarikan (Rp)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Masukkan jumlah penarikan"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    min={100000}
                    step={1000}
                    disabled={isProcessingPayout}
                  />
                  <p className="text-sm text-muted-foreground">
                    Minimal: Rp 100.000 | Maksimal: Saldo Tersedia
                  </p>
                </div>

                {feeBreakdown && (
                  <div className="bg-green-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Jumlah Penarikan:</span>
                      <span className="font-medium">{formatCurrency(feeBreakdown.amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Biaya Admin (1% min. Rp 5.000):</span>
                      <span className="font-medium">{formatCurrency(feeBreakdown.fee_amount)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="font-semibold">Total Diterima:</span>
                        <span className="font-bold text-green-600">{formatCurrency(feeBreakdown.net_amount)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={
                    !withdrawalAmount ||
                    isProcessingPayout ||
                    Number(withdrawalAmount) < 100000 ||
                    (walletBalance && Number(withdrawalAmount) > walletBalance.balance)
                  }
                  className="w-full"
                >
                  {isProcessingPayout ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <ArrowDownLeft className="mr-2 h-4 w-4" />
                      Tarik Saldo
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Payout History */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Penarikan</CardTitle>
            <CardDescription>
              Daftar semua permintaan penarikan saldo Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPayouts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : payouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Belum ada riwayat penarikan
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Biaya Admin</TableHead>
                      <TableHead>Diterima</TableHead>
                      <TableHead>Bank Tujuan</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => {
                      const statusInfo = getStatusInfo(payout.status)
                      const StatusIcon = statusInfo.icon
                      const bankName = payout.bank_accounts
                        ? getBankName(payout.bank_accounts.bank_code)
                        : getBankName(payout.bank_code)

                      return (
                        <TableRow key={payout.id}>
                          <TableCell className="font-medium">
                            {formatDate(payout.created_at)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(payout.amount)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(payout.fee_amount)}
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            {formatCurrency(payout.net_amount)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{bankName}</div>
                              <div className="text-xs text-muted-foreground">
                                {payout.bank_accounts?.bank_account_number || payout.bank_account_number}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusInfo.className} variant={statusInfo.variant}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
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
