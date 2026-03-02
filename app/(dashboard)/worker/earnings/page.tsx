"use client"

import * as React from "react"
import { useCallback } from "react"
import { useAuth } from '@/providers/auth-provider'
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { Loader2, AlertCircle, TrendingUp, TrendingDown, DollarSign, Calendar, CreditCard, Wallet, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface EarningsEntry {
  id: string
  booking_id: string
  amount: number
  status: "pending" | "processing" | "completed" | "failed"
  payment_date: string | null
  created_at: string
  booking?: {
    id: string
    job?: {
      title: string
    }
    business?: {
      name: string
    }
  }
}

type EarningsStatusGroup = {
  pending: EarningsEntry[]
  processing: EarningsEntry[]
  completed: EarningsEntry[]
  failed: EarningsEntry[]
}

const statusGroupLabels: Record<keyof EarningsStatusGroup, string> = {
  pending: "Pending Payments",
  processing: "Processing",
  completed: "Completed Payments",
  failed: "Failed Payments",
}

const statusColors: Record<keyof EarningsStatusGroup, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200",
}

function groupEarningsByStatus(earnings: EarningsEntry[]): EarningsStatusGroup {
  return earnings.reduce<EarningsStatusGroup>(
    (groups, entry) => {
      if (entry.status === "pending") {
        groups.pending.push(entry)
      } else if (entry.status === "processing") {
        groups.processing.push(entry)
      } else if (entry.status === "completed") {
        groups.completed.push(entry)
      } else if (entry.status === "failed") {
        groups.failed.push(entry)
      }
      return groups
    },
    { pending: [], processing: [], completed: [], failed: [] }
  )
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price)
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-"
  const date = new Date(dateString)
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

async function fetchEarnings(workerId: string): Promise<EarningsEntry[]> {
  const { data, error } = await supabase
    .from("earnings")
    .select(`
      id,
      booking_id,
      amount,
      status,
      payment_date,
      created_at,
      booking:bookings(
        id,
        job:jobs(
          title
        ),
        business:businesses(
          name
        )
      )
    `)
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data as EarningsEntry[]) || []
}

export default function WorkerEarningsPage() {
  const { signOut, user, isLoading: authLoading } = useAuth()
  const [earnings, setEarnings] = React.useState<EarningsEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchEarningsData = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const earningsData = await fetchEarnings(user.id)
      setEarnings(earningsData)
    } catch (err: any) {
      const message = err.message || "Gagal memuat data penghasilan"
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  React.useEffect(() => {
    fetchEarningsData()
  }, [fetchEarningsData])

  const handleLogout = async () => {
    await signOut()
  }

  // Calculate statistics
  const totalEarnings = earnings
    .filter(e => e.status === "completed")
    .reduce((sum, e) => sum + e.amount, 0)

  const pendingEarnings = earnings
    .filter(e => e.status === "pending" || e.status === "processing")
    .reduce((sum, e) => sum + e.amount, 0)

  const completedPayments = earnings.filter(e => e.status === "completed").length
  const pendingPayments = earnings.filter(e => e.status === "pending" || e.status === "processing").length

  // Get recent completed payments (last 5)
  const recentPayments = earnings
    .filter(e => e.status === "completed")
    .slice(0, 5)

  const groupedEarnings = groupEarningsByStatus(earnings)
  const hasEarnings = Object.values(groupedEarnings).some((group) => group.length > 0)

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-900 font-medium">
            Error: Tidak dapat memuat informasi pengguna. Silakan refresh halaman.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Penghasilan
            </h1>
            <p className="text-sm text-gray-600 m-0">
              Pantau penghasilan dan riwayat pembayaran Anda
            </p>
          </div>
          <Button
            onClick={handleLogout}
            disabled={authLoading}
            variant="destructive"
            size="sm"
          >
            {authLoading ? 'Memproses...' : 'Keluar'}
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="text-red-900 font-medium mb-1">
                Gagal memuat data
              </p>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
            <Button
              onClick={fetchEarningsData}
              size="sm"
            >
              <Loader2 className="h-4 w-4 mr-2" />
              Coba Lagi
            </Button>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Earnings */}
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">
                Total Penghasilan
              </CardTitle>
              <Wallet className="h-4 w-4 text-blue-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalEarnings)}</div>
              <p className="text-xs text-blue-100 mt-1">
                {completedPayments} pembayaran berhasil
              </p>
            </CardContent>
          </Card>

          {/* Pending Earnings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Menunggu Pembayaran
              </CardTitle>
              <Clock className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{formatPrice(pendingEarnings)}</div>
              <p className="text-xs text-gray-600 mt-1">
                {pendingPayments} pembayaran dalam proses
              </p>
            </CardContent>
          </Card>

          {/* Completed Payments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pembayaran Selesai
              </CardTitle>
              <CreditCard className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedPayments}</div>
              <p className="text-xs text-gray-600 mt-1">
                Transaksi berhasil
              </p>
            </CardContent>
          </Card>

          {/* Total Earnings Count */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Transaksi
              </CardTitle>
              <DollarSign className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{earnings.length}</div>
              <p className="text-xs text-gray-600 mt-1">
                Semua transaksi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && !error && (
          <Card>
            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="h-8 w-8 text-blue-600 mb-4 animate-spin" />
              <p className="text-gray-600">Memuat data penghasilan...</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && !hasEarnings && (
          <Card>
            <CardContent className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-300">
              <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Belum Ada Penghasilan
              </h3>
              <p className="text-gray-600">
                Penghasilan akan muncul di sini setelah Anda menyelesaikan pekerjaan
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recent Payments */}
        {!isLoading && !error && recentPayments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Pembayaran Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentPayments.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {entry.booking?.job?.title || "Unknown Job"}
                      </p>
                      <p className="text-xs text-gray-600">
                        {entry.booking?.business?.name || "Unknown Business"} • {formatDateTime(entry.payment_date || entry.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-green-600 text-sm">
                          +{formatPrice(entry.amount)}
                        </p>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200 text-xs">
                          Selesai
                        </Badge>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Earnings List by Status */}
        {!isLoading && !error && hasEarnings && (
          <div className="space-y-8">
            {(Object.keys(groupedEarnings) as Array<keyof EarningsStatusGroup>).map(
              (status) => {
                const groupEarnings = groupedEarnings[status]
                if (groupEarnings.length === 0) return null

                const totalAmount = groupEarnings.reduce((sum, e) => sum + e.amount, 0)

                return (
                  <Card key={status}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {statusGroupLabels[status]}
                        </CardTitle>
                        <Badge className={statusColors[status]}>
                          {groupEarnings.length} transaksi • {formatPrice(totalAmount)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {groupEarnings.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${
                                  status === 'completed' ? 'bg-green-100' :
                                  status === 'processing' ? 'bg-blue-100' :
                                  status === 'pending' ? 'bg-yellow-100' :
                                  'bg-red-100'
                                }`}>
                                  {status === 'completed' ? (
                                    <CreditCard className="h-4 w-4 text-green-600" />
                                  ) : status === 'processing' ? (
                                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                                  ) : status === 'pending' ? (
                                    <Clock className="h-4 w-4 text-yellow-600" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm mb-1">
                                    {entry.booking?.job?.title || "Unknown Job"}
                                  </p>
                                  <p className="text-xs text-gray-600 mb-1">
                                    {entry.booking?.business?.name || "Unknown Business"}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDateTime(entry.created_at)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className={`font-bold ${
                                status === 'completed' ? 'text-green-600' :
                                status === 'processing' ? 'text-blue-600' :
                                status === 'pending' ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {formatPrice(entry.amount)}
                              </p>
                              {entry.payment_date && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Dibayar: {formatDate(entry.payment_date)}
                                </p>
                              )}
                              <Badge
                                className={`mt-2 ${statusColors[status]}`}
                              >
                                {status === 'pending' ? 'Menunggu' :
                                 status === 'processing' ? 'Memproses' :
                                 status === 'completed' ? 'Selesai' :
                                 'Gagal'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              }
            )}
          </div>
        )}
      </div>
    </div>
  )
}
