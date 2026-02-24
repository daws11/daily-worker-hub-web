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
import { getBusinessWalletBalance, getBusinessPaymentHistory, initializeQrisPayment, calculateTopUpFee } from "@/lib/actions/payments"
import { Wallet, Loader2, Plus, ArrowUpRight, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

type BusinessesRow = Database["public"]["Tables"]["businesses"]["Row"]

type PaymentTransaction = {
  id: string
  business_id: string
  amount: number
  fee_amount: number
  type: 'credit' | 'debit' | 'pending' | 'released'
  status: 'success' | 'pending' | 'failed' | 'expired'
  payment_provider: string
  provider_payment_id: string | null
  payment_url: string | null
  qris_expires_at: string | null
  metadata: Record<string, any> | null
  created_at: string
}

type WalletBalance = {
  balance: number
  currency: string
}

export default function BusinessWalletPage() {
  const { user } = useAuth()
  const { t, locale } = useTranslation()
  const router = useRouter()
  const [business, setBusiness] = useState<BusinessesRow | null>(null)
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null)
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true)
  const [isLoadingWallet, setIsLoadingWallet] = useState(true)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState<string>("")
  const [feeBreakdown, setFeeBreakdown] = useState<{ amount: number; fee_amount: number; total_amount: number } | null>(null)

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
        toast.error(t('errors.loadFailed'))
        return
      }

      setBusiness(data)
    }

    fetchBusiness()
  }, [user, router, t])

  // Fetch wallet balance
  useEffect(() => {
    async function fetchWalletBalance() {
      if (!business) return

      setIsLoadingWallet(true)
      try {
        const result = await getBusinessWalletBalance(business.id)

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
  }, [business, t])

  // Fetch payment history
  useEffect(() => {
    async function fetchTransactions() {
      if (!business) return

      setIsLoadingTransactions(true)
      try {
        const result = await getBusinessPaymentHistory(business.id)

        if (!result.success || !result.data) {
          toast.error(result.error || t('errors.loadFailed'))
          return
        }

        setTransactions(result.data)
      } finally {
        setIsLoadingTransactions(false)
      }
    }

    fetchTransactions()
  }, [business, t])

  // Calculate fee when amount changes
  useEffect(() => {
    async function calculateFee() {
      if (!topUpAmount || isNaN(Number(topUpAmount))) {
        setFeeBreakdown(null)
        return
      }

      const amount = Number(topUpAmount)
      if (amount < 500000) return

      try {
        const result = await calculateTopUpFee(amount)
        if (result.success && result.data) {
          setFeeBreakdown({
            amount: result.data.amount,
            fee_amount: result.data.fee_amount,
            total_amount: result.data.total_amount,
          })
        } else {
          setFeeBreakdown(null)
        }
      } catch {
        setFeeBreakdown(null)
      }
    }

    calculateFee()
  }, [topUpAmount])

  // Handle top-up payment
  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!business) return

    const amount = Number(topUpAmount)
    if (isNaN(amount) || amount < 500000) {
      toast.error(locale === 'id' ? 'Minimal top-up Rp 500.000' : 'Minimum top-up Rp 500.000')
      return
    }

    setIsProcessingPayment(true)
    try {
      const result = await initializeQrisPayment(business.id, amount)

      if (!result.success || !result.data) {
        toast.error(result.error || t('wallet.paymentFailed'))
        return
      }

      // Redirect to payment URL
      if (result.data.payment_url) {
        window.open(result.data.payment_url, "_blank")
        toast.success(locale === 'id'
          ? 'Pembayaran QRIS berhasil dibuat. Silakan selesaikan pembayaran.'
          : 'QRIS payment created successfully. Please complete the payment.'
        )
        // Refresh transactions after a delay
        setTimeout(() => {
          window.location.reload()
        }, 3000)
      }
    } finally {
      setIsProcessingPayment(false)
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

  // Get status badge variant and icon
  const getStatusInfo = (status: PaymentTransaction["status"]) => {
    switch (status) {
      case "success":
        return {
          variant: "default" as const,
          label: t('common.success'),
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
      case "failed":
        return {
          variant: "destructive" as const,
          label: t('common.failed'),
          icon: XCircle,
          className: "bg-red-100 text-red-800 hover:bg-red-100",
        }
      case "expired":
        return {
          variant: "outline" as const,
          label: locale === 'id' ? 'Kadaluarsa' : 'Expired',
          icon: AlertCircle,
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

  if (isLoadingBusiness) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{locale === 'id' ? 'Wallet Bisnis' : 'Business Wallet'}</h1>
          <p className="text-[#666]">
            {locale === 'id'
              ? 'Kelola saldo dan riwayat transaksi Anda'
              : 'Manage your balance and transaction history'
            }
          </p>
        </div>

        {/* Wallet Balance Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">{t('wallet.currentBalance')}</CardTitle>
                  <CardDescription>{locale === 'id'
                    ? 'Saldo yang tersedia untuk digunakan'
                    : 'Balance available for use'
                  }</CardDescription>
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
                  <span className="text-4xl font-bold text-blue-600">
                    {walletBalance ? formatCurrency(walletBalance.balance) : formatCurrency(0)}
                  </span>
                  <span className="text-lg text-muted-foreground">
                    {walletBalance?.currency || "IDR"}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {locale === 'id'
                    ? 'Saldo akan bertambah setelah pembayaran QRIS berhasil'
                    : 'Balance will increase after successful QRIS payment'
                  }
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top-up Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {t('wallet.topUp')}
            </CardTitle>
            <CardDescription>
              {locale === 'id'
                ? 'Isi saldo wallet menggunakan QRIS (minimal Rp 500.000)'
                : 'Top up wallet balance using QRIS (min. Rp 500.000)'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTopUp} className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="amount">{t('wallet.topUpAmount')} (Rp)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder={locale === 'id' ? 'Masukkan jumlah top up' : 'Enter top up amount'}
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  min={500000}
                  step={1000}
                  disabled={isProcessingPayment}
                />
                <p className="text-sm text-muted-foreground">
                  {locale === 'id' ? 'Minimal: Rp 500.000 | Maksimal: Rp 100.000.000' : 'Minimum: Rp 500.000 | Maximum: Rp 100.000.000'}
                </p>
              </div>

              {feeBreakdown && (
                <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('wallet.topUpAmount')}:</span>
                    <span className="font-medium">{formatCurrency(feeBreakdown.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{locale === 'id' ? 'Biaya Admin (0.7% + Rp 500):' : 'Admin Fee (0.7% + Rp 500):'}</span>
                    <span className="font-medium">{formatCurrency(feeBreakdown.fee_amount)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">{locale === 'id' ? 'Total Pembayaran:' : 'Total Payment:'}</span>
                      <span className="font-bold text-blue-600">{formatCurrency(feeBreakdown.total_amount)}</span>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={!topUpAmount || isProcessingPayment || Number(topUpAmount) < 500000}
                className="w-full"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.processing')}
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    {locale === 'id' ? 'Bayar dengan QRIS' : 'Pay with QRIS'}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>{t('wallet.transactionHistory')}</CardTitle>
            <CardDescription>
              {locale === 'id'
                ? 'Daftar semua transaksi top up wallet Anda'
                : 'List of all your wallet top up transactions'
              }
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
                  {t('wallet.noTransactions')}
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
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead>Payment Provider</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => {
                      const statusInfo = getStatusInfo(transaction.status)
                      const StatusIcon = statusInfo.icon

                      return (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">
                            {formatDate(transaction.created_at)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(transaction.fee_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusInfo.className} variant={statusInfo.variant}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">
                            {transaction.payment_provider}
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
