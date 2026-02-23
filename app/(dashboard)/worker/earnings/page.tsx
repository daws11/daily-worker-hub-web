"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/app/providers/auth-provider"
import { Loader2, TrendingUp } from "lucide-react"
import { EarningsSummaryCard } from "@/components/earnings/earnings-summary-card"
import { MonthlyEarningsChart } from "@/components/earnings/monthly-earnings-chart"
import { EarningsByPositionTable } from "@/components/earnings/earnings-by-position-table"
import { TransactionHistoryTable } from "@/components/earnings/transaction-history-table"
import { ProjectedIncomeCard } from "@/components/earnings/projected-income-card"
import { EarningsExportButton } from "@/components/earnings/earnings-export-button"
import { getEarningsDashboardData } from "@/lib/actions/earnings"

type EarningsSummary = {
  total_earnings: number
  current_month_earnings: number
  previous_month_earnings: number
  month_over_month_change: number
  total_bookings_completed: number
  average_earnings_per_booking: number
  currency: string
  period_start: string
  period_end: string
}

type MonthlyEarnings = {
  month: string
  month_name: string
  earnings: number
  bookings_count: number
  average_earning: number
}

type PositionEarnings = {
  position_title: string
  category_name: string | null
  total_earnings: number
  bookings_count: number
  average_earning: number
  highest_single_earning: number
  lowest_single_earning: number
  last_booking_date: string | null
}

type EarningsTransaction = {
  id: string
  amount: number
  type: "payment" | "refund"
  status: "pending" | "success" | "failed"
  booking_id: string
  job_title: string
  business_name: string
  created_at: string
  completed_at: string | null
}

type IncomeProjection = {
  period: "week" | "month" | "quarter"
  projected_income: number
  confidence: "low" | "medium" | "high"
  calculation_method: "simple_average" | "trend_based" | "booking_based"
  factors: {
    recent_bookings_count: number
    average_earning_per_booking: number
    booking_frequency: number
    trend_percentage: number
  }
  calculated_at: string
}

type EarningsDashboardData = {
  summary: EarningsSummary
  monthly_earnings: MonthlyEarnings[]
  earnings_by_position: PositionEarnings[]
  recent_transactions: EarningsTransaction[]
  projection: IncomeProjection | null
}

export default function WorkerEarningsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<EarningsDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch earnings dashboard data
  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) {
        router.push("/login")
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // We need to get the worker ID first
        const { createClient } = await import("@/lib/supabase/server")
        const supabase = await createClient()

        const { data: worker, error: workerError } = await supabase
          .from("workers")
          .select("id")
          .eq("user_id", user.id)
          .single()

        if (workerError || !worker) {
          toast.error("Profil worker tidak ditemukan")
          router.push("/dashboard")
          return
        }

        // Fetch dashboard data
        const result = await getEarningsDashboardData(worker.id, 12, true, "month")

        if (!result.success || !result.data) {
          setError(result.error || "Gagal memuat data pendapatan")
          toast.error(result.error || "Gagal memuat data pendapatan")
          return
        }

        setDashboardData(result.data as EarningsDashboardData)
      } catch (err) {
        const errorMessage = "Terjadi kesalahan saat memuat data pendapatan"
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [user, router])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat data pendapatan...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Analitika Pendapatan</h1>
            <p className="text-[#666]">
              Pantau dan analisis pendapatan Anda
            </p>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">
              {error || "Gagal memuat data pendapatan"}
            </p>
            <p className="text-sm text-muted-foreground">
              Silakan refresh halaman atau coba lagi nanti
            </p>
          </div>
        </div>
      </div>
    )
  }

  const { summary, monthly_earnings, earnings_by_position, recent_transactions, projection } = dashboardData

  // Find best performing position
  const bestPerformingPosition = earnings_by_position.length > 0 ? earnings_by_position[0] : null

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analitika Pendapatan</h1>
            <p className="text-[#666]">
              Pantau dan analisis pendapatan Anda
            </p>
          </div>
          <EarningsExportButton
            transactions={recent_transactions}
            exportLabel="Ekspor CSV"
            size="default"
            variant="outline"
          />
        </div>

        {/* Summary Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <EarningsSummaryCard
            summary={summary}
            isLoading={false}
            title="Ringkasan Pendapatan"
            description="Pendapatan Anda dari pekerjaan yang diselesaikan"
          />
          <ProjectedIncomeCard
            projection={projection}
            isLoading={false}
            title="Proyeksi Pendapatan"
            description="Perkiraan pendapatan berdasarkan performa Anda"
          />
        </div>

        {/* Monthly Earnings Chart */}
        <div className="mb-4">
          <MonthlyEarningsChart
            data={monthly_earnings}
            isLoading={false}
            title="Grafik Pendapatan Bulanan"
            description="Tren pendapatan Anda dalam beberapa bulan terakhir"
            maxBars={12}
          />
        </div>

        {/* Earnings by Position */}
        <div className="mb-4">
          <EarningsByPositionTable
            data={earnings_by_position}
            isLoading={false}
            title="Pendapatan Berdasarkan Posisi"
            description="Lihat posisi pekerjaan dengan pendapatan terbaik"
            bestPerformingPosition={bestPerformingPosition}
          />
        </div>

        {/* Transaction History */}
        <div>
          <TransactionHistoryTable
            transactions={recent_transactions}
            isLoading={false}
            title="Riwayat Transaksi Pendapatan"
            description="Daftar transaksi pendapatan Anda terakhir"
          />
        </div>
      </div>
    </div>
  )
}
