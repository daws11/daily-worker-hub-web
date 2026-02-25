"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/app/providers/auth-provider"
import { useTranslation } from "@/lib/i18n/hooks"
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

type PayoutRequest = {
  id: string
  worker_id: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  bank_account_id: string | null
  fee_amount: number
  total_amount: number
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

type BankAccount = {
  id: string
  worker_id: string
  bank_code: string
  bank_account_number: string
  bank_account_name: string
  is_default: boolean
  created_at: string
}

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
  // Allow direct access to bank fields when bank_accounts is not joined
  bank_code?: string
  bank_account_number?: string
  bank_account_name?: string
  // Additional fields
  net_amount?: number
}

export default function WorkerWalletPage() {
  const { user } = useAuth()
  const { t, locale } = useTranslation()
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
        toast.error(t('errors.loadFailed'))
        return
      }

      setWorker(data)
    }

    fetchWorker()
  }, [user, router, t])

  // Fetch wallet balance
  useEffect(() => {
    async function fetchWalletBalance() {
      if (!worker) return

      setIsLoadingWallet(true)
      try {
        const result = await getWorkerWalletBalance(worker.id)

        if (!result.success || !result.data) {
          toast.error(result.error || t('errors.loadFailed'))
          return
        }

        setWalletBalance(result.data)
      } finally {
        setIsLoadingWallet(false)
      }
    }

    fetchWalletBalance()
  }, [worker, t])

  // Fetch bank accounts
  useEffect(() => {
    async function fetchBankAccounts() {
      if (!worker) return

      try {
        const { data, error } = await supabase
          .from("bank_accounts" as any)
          .select("*")
          .eq("worker_id", worker.id)
          .order("is_default", { ascending: false })

        if (error) {
          toast.error(t('wallet.withdrawRequestFailed'))
          return
        }

        const bankAccountsData = data as unknown as BankAccount[] | null
        setBankAccounts(bankAccountsData || [])

        // Set primary account as default
        const primaryAccount = bankAccountsData?.find(acc => acc.is_default)
        if (primaryAccount) {
          setSelectedBankAccountId(primaryAccount.id)
        }
      } catch {
        toast.error(t('wallet.withdrawRequestFailed'))
      }
    }

    fetchBankAccounts()
  }, [worker, t])

  // Fetch payout history
  useEffect(() => {
    async function fetchPayouts() {
      if (!worker) return

      setIsLoadingPayouts(true)
      try {
        const { data, error } = await supabase
          .from("payout_requests" as any)
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
          toast.error(t('errors.loadFailed'))
          return
        }

        setPayouts(data as unknown as PayoutWithBankAccount[])
      } finally {
        setIsLoadingPayouts(false)
      }
    }

    fetchPayouts()
  }, [worker, t])

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
      toast.error(t('wallet.withdrawMinimum', { amount: 'Rp 100.000' }))
      return
    }

    if (!selectedBankAccountId) {
      toast.error(t('validation.required', { field: t('wallet.withdrawAccount') }))
      return
    }

    if (!walletBalance || amount > walletBalance.balance) {
      toast.error(t('errors.insufficientFunds'))
      return
    }

    setIsProcessingPayout(true)
    try {
      const result = await requestPayout(worker.id, amount, selectedBankAccountId)

      if (!result.success) {
        toast.error(result.error || t('wallet.withdrawRequestFailed'))
        return
      }

      toast.success(t('wallet.withdrawRequestSubmitted'))

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

  // Format currency to Indonesian Rupiah (for now, always IDR)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'id' ? 'id-ID' : 'en-US', {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format date based on current locale
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Get bank name from bank code
  const getBankName = (bankCode: string) => {
    const bankNames: Record<string, { id: string; en: string }> = {
      BCA: { id: "Bank Central Asia", en: "Bank Central Asia" },
      BRI: { id: "Bank Rakyat Indonesia", en: "Bank Rakyat Indonesia" },
      Mandiri: { id: "Bank Mandiri", en: "Bank Mandiri" },
      BNI: { id: "Bank Nasional Indonesia", en: "Bank Nasional Indonesia" },
    }
    return bankNames[bankCode]?.[locale] || bankCode
  }

  // Get status badge variant and icon
  const getStatusInfo = (status: PayoutRequest["status"]) => {
    switch (status) {
      case "completed":
        return {
          variant: "default" as const,
          label: t('common.completed'),
          icon: CheckCircle2,
          className: "bg-green-100 text-green-800 hover:bg-green-100",
        }
      case "pending":
        return {
          variant: "secondary" as const,
          label: t('common.pending'),
          icon: Clock,
          className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
        }
      case "processing":
        return {
          variant: "secondary" as const,
          label: t('common.processing'),
          icon: Clock,
          className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
        }
      case "failed":
        return {
          variant: "destructive" as const,
          label: t('common.failed'),
          icon: XCircle,
          className: "bg-red-100 text-red-800 hover:bg-red-100",
        }
      case "cancelled":
        return {
          variant: "outline" as const,
          label: t('common.cancelled'),
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
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
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
          <h1 className="text-2xl font-bold">{t('wallet.title')}</h1>
          <p className="text-[#666]">
            {t('wallet.transactionHistory')}
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
                  <CardTitle className="text-xl">{t('wallet.currentBalance')}</CardTitle>
                  <CardDescription>{t('wallet.availableBalance')}</CardDescription>
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
                    {walletBalance ? formatCurrency(walletBalance.balance) : formatCurrency(0)}
                  </span>
                  <span className="text-lg text-muted-foreground">
                    {walletBalance?.currency || "IDR"}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {locale === 'id'
                    ? 'Saldo akan berkurang setelah permintaan penarikan diproses'
                    : 'Balance will be deducted after withdrawal request is processed'
                  }
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
              {t('wallet.withdrawFunds')}
            </CardTitle>
            <CardDescription>
              {hasBankAccounts
                ? (locale === 'id'
                    ? 'Tarik saldo ke rekening bank Anda (minimal Rp 100.000)'
                    : 'Withdraw balance to your bank account (min. Rp 100.000)')
                : (locale === 'id'
                    ? 'Silakan tambahkan rekening bank terlebih dahulu untuk menarik saldo'
                    : 'Please add a bank account first to withdraw funds')
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasBankAccounts ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  {locale === 'id' ? 'Belum ada rekening bank terdaftar' : 'No bank accounts registered'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {locale === 'id'
                    ? 'Hubungi admin untuk menambahkan rekening bank Anda'
                    : 'Contact admin to add your bank account'
                  }
                </p>
              </div>
            ) : (
              <form onSubmit={handleWithdrawal} className="space-y-4">
                {/* Bank Account Selection */}
                {bankAccounts.length > 1 && (
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="bankAccount">{t('wallet.withdrawAccount')}</Label>
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
                          {account.is_default && (locale === 'id' ? " - Utama" : " - Primary")}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {bankAccounts.length === 1 && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm font-medium">{t('wallet.withdrawAccount')}:</div>
                    <div className="text-sm text-muted-foreground">
                      {getBankName(bankAccounts[0].bank_code)} - {bankAccounts[0].bank_account_number}
                    </div>
                    <div className="text-xs text-muted-foreground">{bankAccounts[0].bank_account_name}</div>
                  </div>
                )}

                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="amount">{t('wallet.withdrawAmount')} (Rp)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder={locale === 'id' ? 'Masukkan jumlah penarikan' : 'Enter withdrawal amount'}
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    min={100000}
                    step={1000}
                    disabled={isProcessingPayout}
                  />
                  <p className="text-sm text-muted-foreground">
                    {locale === 'id' ? 'Minimal: Rp 100.000 | Maksimal: Saldo Tersedia' : 'Minimum: Rp 100.000 | Maximum: Available Balance'}
                  </p>
                </div>

                {feeBreakdown && (
                  <div className="bg-green-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('wallet.withdrawAmount')}:</span>
                      <span className="font-medium">{formatCurrency(feeBreakdown.amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{locale === 'id' ? 'Biaya Admin (1% min. Rp 5.000):' : 'Admin Fee (1% min. Rp 5.000):'}</span>
                      <span className="font-medium">{formatCurrency(feeBreakdown.fee_amount)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="font-semibold">{locale === 'id' ? 'Total Diterima:' : 'Total Received:'}</span>
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
                      {t('common.processing')}
                    </>
                  ) : (
                    <>
                      <ArrowDownLeft className="mr-2 h-4 w-4" />
                      {t('wallet.withdrawFunds')}
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
            <CardTitle>{t('wallet.withdrawalHistory')}</CardTitle>
            <CardDescription>
              {locale === 'id' ? 'Daftar semua permintaan penarikan saldo Anda' : 'List of all your withdrawal requests'}
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
                  {locale === 'id' ? 'Belum ada riwayat penarikan' : 'No withdrawal history yet'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.date')}</TableHead>
                      <TableHead>{t('wallet.transactionAmount')}</TableHead>
                      <TableHead>{locale === 'id' ? 'Biaya Admin' : 'Admin Fee'}</TableHead>
                      <TableHead>{locale === 'id' ? 'Diterima' : 'Received'}</TableHead>
                      <TableHead>{locale === 'id' ? 'Bank Tujuan' : 'Destination Bank'}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => {
                      const statusInfo = getStatusInfo(payout.status)
                      const StatusIcon = statusInfo.icon
                      const bankName = payout.bank_accounts
                        ? getBankName(payout.bank_accounts.bank_code)
                        : getBankName(payout.bank_code || '')

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
                            {formatCurrency(payout.net_amount || (payout.amount - payout.fee_amount))}
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
