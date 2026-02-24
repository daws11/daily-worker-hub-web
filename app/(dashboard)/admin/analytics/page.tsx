"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/app/providers/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3,
  Users,
  Briefcase,
  CreditCard,
  MapPin,
  TrendingUp,
  Shield,
  DollarSign,
  Calendar,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { getAnalyticsDashboard } from "@/lib/actions/analytics"
import type { DateRangeFilter } from "@/lib/types/analytics"

type DashboardData = {
  user_growth: { metrics: Array<{ date: string; new_workers: number; new_businesses: number; total_new_users: number; cumulative_users: number }> }
  job_completion: { metrics: Array<{ date: string; total_jobs: number; completed_jobs: number; completion_rate_percentage: number }> }
  transaction_volume: { metrics: Array<{ date: string; total_transactions: number; successful_transactions: number; success_rate_percentage: number; total_payment_volume: number }> }
  geographic_distribution: { data: Array<{ location_name: string; worker_count: number; job_count: number; booking_count: number }> }
  trending_categories: { data: Array<{ category_name: string; job_count: number; booking_count: number; demand_ratio: number }> }
  compliance: { metrics: Array<{ date: string; total_kyc_submissions: number; verified_workers: number; pending_verifications: number; verification_success_rate: number }> }
  revenue: { metrics: Array<{ date: string; gross_revenue: number; net_revenue: number; platform_fee: number }> }
}

export default function AdminAnalyticsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dateRangePreset, setDateRangePreset] = useState<string>("last_30_days")

  // Fetch analytics dashboard data
  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) {
        router.push("/login")
        return
      }

      setIsLoading(true)
      try {
        const dateRange: DateRangeFilter = { preset: dateRangePreset as any }
        const result = await getAnalyticsDashboard(dateRange)

        if (!result.success || !result.data) {
          toast.error(result.error || "Gagal memuat data analytics")
          return
        }

        setDashboardData(result.data as DashboardData)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [user, router, dateRangePreset])

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const dateRange: DateRangeFilter = { preset: dateRangePreset as any }
      const result = await getAnalyticsDashboard(dateRange)

      if (!result.success || !result.data) {
        toast.error(result.error || "Gagal memuat data analytics")
        return
      }

      setDashboardData(result.data as DashboardData)
      toast.success("Data analytics berhasil diperbarui")
    } finally {
      setIsRefreshing(false)
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
    })
  }

  // Format number with thousand separator
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("id-ID").format(num)
  }

  // Calculate summary statistics
  const calculateUserGrowthSummary = () => {
    if (!dashboardData?.user_growth?.metrics.length) return null
    const metrics = dashboardData.user_growth.metrics
    const latest = metrics[metrics.length - 1]
    return {
      totalUsers: latest.cumulative_users,
      newUsersToday: metrics.reduce((sum, m) => sum + m.total_new_users, 0),
    }
  }

  const calculateJobCompletionSummary = () => {
    if (!dashboardData?.job_completion?.metrics.length) return null
    const metrics = dashboardData.job_completion.metrics
    const totalJobs = metrics.reduce((sum, m) => sum + m.total_jobs, 0)
    const completedJobs = metrics.reduce((sum, m) => sum + m.completed_jobs, 0)
    const avgCompletionRate = metrics.reduce((sum, m) => sum + m.completion_rate_percentage, 0) / metrics.length
    return { totalJobs, completedJobs, avgCompletionRate: Math.round(avgCompletionRate) }
  }

  const calculateTransactionSummary = () => {
    if (!dashboardData?.transaction_volume?.metrics.length) return null
    const metrics = dashboardData.transaction_volume.metrics
    const totalTransactions = metrics.reduce((sum, m) => sum + m.total_transactions, 0)
    const totalVolume = metrics.reduce((sum, m) => sum + m.total_payment_volume, 0)
    const avgSuccessRate = metrics.reduce((sum, m) => sum + m.success_rate_percentage, 0) / metrics.length
    return { totalTransactions, totalVolume, avgSuccessRate: Math.round(avgSuccessRate) }
  }

  const calculateRevenueSummary = () => {
    if (!dashboardData?.revenue?.metrics.length) return null
    const metrics = dashboardData.revenue.metrics
    const grossRevenue = metrics.reduce((sum, m) => sum + m.gross_revenue, 0)
    const netRevenue = metrics.reduce((sum, m) => sum + m.net_revenue, 0)
    const platformFees = metrics.reduce((sum, m) => sum + m.platform_fee, 0)
    return { grossRevenue, netRevenue, platformFees }
  }

  const calculateComplianceSummary = () => {
    if (!dashboardData?.compliance?.metrics.length) return null
    const metrics = dashboardData.compliance.metrics
    const verifiedWorkers = metrics.reduce((sum, m) => sum + m.verified_workers, 0)
    const pendingVerifications = metrics[metrics.length - 1]?.pending_verifications || 0
    return { verifiedWorkers, pendingVerifications }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat data analytics...</p>
        </div>
      </div>
    )
  }

  const userGrowthSummary = calculateUserGrowthSummary()
  const jobCompletionSummary = calculateJobCompletionSummary()
  const transactionSummary = calculateTransactionSummary()
  const revenueSummary = calculateRevenueSummary()
  const complianceSummary = calculateComplianceSummary()

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Analitik Platform</h1>
            <p className="text-[#666]">
              Pantau metrik kunci dan performa platform
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memuat...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>

        {/* Date Range Filter */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Rentang Tanggal:</span>
              </div>
              <Select value={dateRangePreset} onValueChange={setDateRangePreset}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="yesterday">Kemarin</SelectItem>
                  <SelectItem value="last_7_days">7 Hari Terakhir</SelectItem>
                  <SelectItem value="last_30_days">30 Hari Terakhir</SelectItem>
                  <SelectItem value="last_90_days">90 Hari Terakhir</SelectItem>
                  <SelectItem value="this_month">Bulan Ini</SelectItem>
                  <SelectItem value="last_month">Bulan Lalu</SelectItem>
                  <SelectItem value="this_year">Tahun Ini</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* User Growth Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Pertumbuhan Pengguna</CardTitle>
                <CardDescription>Registrasi pengguna baru dan total kumulatif</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {userGrowthSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Pengguna</p>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(userGrowthSummary.totalUsers)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Pengguna Baru</p>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(userGrowthSummary.newUsersToday)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Pekerja Baru</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatNumber(dashboardData?.user_growth?.metrics.reduce((sum, m) => sum + m.new_workers, 0) || 0)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Data tidak tersedia</p>
            )}
          </CardContent>
        </Card>

        {/* Job Completion Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-full">
                <Briefcase className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Job Completion</CardTitle>
                <CardDescription>Status penyelesaian lowongan pekerjaan</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {jobCompletionSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Job</p>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(jobCompletionSummary.totalJobs)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Job Selesai</p>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(jobCompletionSummary.completedJobs)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Rata-rata Completion Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{jobCompletionSummary.avgCompletionRate}%</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Data tidak tersedia</p>
            )}
          </CardContent>
        </Card>

        {/* Transaction Volume Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-full">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Volume Transaksi</CardTitle>
                <CardDescription>Jumlah dan nilai transaksi yang berhasil</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {transactionSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Transaksi</p>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(transactionSummary.totalTransactions)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Volume</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(transactionSummary.totalVolume)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Rata-rata Success Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{transactionSummary.avgSuccessRate}%</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Data tidak tersedia</p>
            )}
          </CardContent>
        </Card>

        {/* Geographic Distribution Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-full">
                <MapPin className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Distribusi Geografis</CardTitle>
                <CardDescription>Sebaran pekerja dan lowongan berdasarkan lokasi</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData?.geographic_distribution?.data && dashboardData.geographic_distribution.data.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.geographic_distribution.data.slice(0, 5).map((location) => (
                  <div key={location.location_name} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium">{location.location_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(location.worker_count)} pekerja • {formatNumber(location.job_count)} lowongan
                      </p>
                    </div>
                    <Badge variant="secondary">{formatNumber(location.booking_count)} booking</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Data tidak tersedia</p>
            )}
          </CardContent>
        </Card>

        {/* Trending Categories Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Kategori Populer</CardTitle>
                <CardDescription>Kategori lowongan dengan permintaan tertinggi</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData?.trending_categories?.data && dashboardData.trending_categories.data.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.trending_categories.data.slice(0, 5).map((category) => (
                  <div key={category.category_name} className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                    <div>
                      <p className="font-medium">{category.category_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(category.job_count)} lowongan • {formatNumber(category.booking_count)} booking
                      </p>
                    </div>
                    <Badge variant="secondary">Demand: {category.demand_ratio.toFixed(1)}x</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Data tidak tersedia</p>
            )}
          </CardContent>
        </Card>

        {/* Compliance Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-100 rounded-full">
                <Shield className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Verifikasi KYC</CardTitle>
                <CardDescription>Status verifikasi identitas pekerja</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {complianceSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Pekerja Terverifikasi</p>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(complianceSummary.verifiedWorkers)}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Menunggu Verifikasi</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatNumber(complianceSummary.pendingVerifications)}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Data tidak tersedia</p>
            )}
          </CardContent>
        </Card>

        {/* Revenue Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-full">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Pendapatan Platform</CardTitle>
                <CardDescription>Revenue dan biaya platform dari transaksi</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {revenueSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Gross Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(revenueSummary.grossRevenue)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Net Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(revenueSummary.netRevenue)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Biaya Platform</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(revenueSummary.platformFees)}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Data tidak tersedia</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
