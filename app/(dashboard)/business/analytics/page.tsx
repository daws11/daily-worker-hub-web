"use client"

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'
import {
  getBusinessSpending,
  getUniqueWorkerCount,
  getPopularPositions,
  getAverageReliabilityScore,
  getSeasonalTrends,
  getComplianceStatus,
  type BusinessSpending,
  type WorkerCountAnalytics,
  type PopularPosition,
  type ReliabilityScoreAnalytics,
  type MonthlyTrend,
  type ComplianceStatus,
  type DateRange
} from '@/lib/supabase/queries/analytics'
import { DateRange as DateRangeType } from '@/lib/types/analytics'
import { AnalyticsStatsCard } from '@/components/analytics/analytics-stats-card'
import { AnalyticsSpendingChart } from '@/components/analytics/analytics-spending-chart'
import { AnalyticsPositionsChart } from '@/components/analytics/analytics-positions-chart'
import { AnalyticsReliabilityChart } from '@/components/analytics/analytics-reliability-chart'
import { AnalyticsTrendsChart } from '@/components/analytics/analytics-trends-chart'
import { ComplianceBadge } from '@/components/analytics/analytics-compliance-badge'
import { AnalyticsDateFilter } from '@/components/analytics/analytics-date-filter'
import { AnalyticsCsvExport } from '@/components/analytics/analytics-csv-export'
import { type AnalyticsExportData } from '@/lib/types/analytics'
import {
  Loader2,
  AlertCircle,
  DollarSign,
  Users,
  TrendingUp,
  Award,
  Shield
} from 'lucide-react'
import { toast } from 'sonner'

interface AnalyticsData {
  spending: BusinessSpending | null
  workers: WorkerCountAnalytics | null
  positions: PopularPosition[] | null
  reliability: ReliabilityScoreAnalytics | null
  trends: MonthlyTrend[] | null
  compliance: ComplianceStatus | null
}

export default function BusinessAnalyticsPage() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    spending: null,
    workers: null,
    positions: null,
    reliability: null,
    trends: null,
    compliance: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRangeType>({
    from: getDateRangeFromPreset('30d').from,
    to: getDateRangeFromPreset('30d').to,
    preset: '30d',
  })

  // Get date range from preset
  function getDateRangeFromPreset(preset: '7d' | '30d' | '90d' | '6m' | '1y' | 'all'): DateRangeType {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    let from: Date

    switch (preset) {
      case '7d':
        from = new Date(today)
        from.setDate(from.getDate() - 7)
        break
      case '30d':
        from = new Date(today)
        from.setDate(from.getDate() - 30)
        break
      case '90d':
        from = new Date(today)
        from.setDate(from.getDate() - 90)
        break
      case '6m':
        from = new Date(today)
        from.setMonth(from.getMonth() - 6)
        break
      case '1y':
        from = new Date(today)
        from.setFullYear(from.getFullYear() - 1)
        break
      case 'all':
      default:
        from = new Date(2020, 0, 1)
        break
    }

    return {
      from: from.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0],
      preset,
    }
  }

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setError(null)

    try {
      // Convert DateRangeType to DateRange for queries
      const queryDateRange: DateRange = {
        start_date: dateRange.from,
        end_date: dateRange.to,
      }

      // Fetch all analytics data in parallel
      const [
        spendingResult,
        workersResult,
        positionsResult,
        reliabilityResult,
        trendsResult,
        complianceResult,
      ] = await Promise.all([
        getBusinessSpending(user.id, queryDateRange),
        getUniqueWorkerCount(user.id, queryDateRange),
        getPopularPositions(user.id, queryDateRange, 10),
        getAverageReliabilityScore(user.id, queryDateRange),
        getSeasonalTrends(user.id, queryDateRange),
        getComplianceStatus(user.id, queryDateRange),
      ])

      // Check for errors
      if (spendingResult.error) throw spendingResult.error
      if (workersResult.error) throw workersResult.error
      if (positionsResult.error) throw positionsResult.error
      if (reliabilityResult.error) throw reliabilityResult.error
      if (trendsResult.error) throw trendsResult.error
      if (complianceResult.error) throw complianceResult.error

      setAnalytics({
        spending: spendingResult.data,
        workers: workersResult.data,
        positions: positionsResult.data,
        reliability: reliabilityResult.data,
        trends: trendsResult.data,
        compliance: complianceResult.data,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data analitik'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [user?.id, dateRange])

  // Handle date range change
  const handleDateRangeChange = useCallback((newDateRange: DateRangeType) => {
    setDateRange(newDateRange)
  }, [])

  // Handle CSV export
  const handleExportComplete = useCallback((filename: string) => {
    toast.success(`Data berhasil diekspor ke ${filename}`)
  }, [])

  const handleExportError = useCallback((error: Error) => {
    toast.error(`Gagal mengekspor data: ${error.message}`)
  }, [])

  // Prepare CSV export data
  const exportData: AnalyticsExportData[] = []
  if (analytics.trends && analytics.trends.length > 0) {
    for (const trend of analytics.trends) {
      exportData.push({
        date: trend.month,
        worker_name: '-',
        position: '-',
        amount: trend.spending,
        status: 'completed',
        reliability_score: analytics.reliability?.average_score || 0,
      })
    }
  }

  // Get compliance badge status
  const getComplianceBadgeStatus = (): 'compliant' | 'partial' | 'non_compliant' => {
    if (!analytics.compliance) return 'non_compliant'
    if (analytics.compliance.compliance_rate >= 90) return 'compliant'
    if (analytics.compliance.compliance_rate >= 70) return 'partial'
    return 'non_compliant'
  }

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Format month label
  const formatMonthLabel = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
  }

  // Fetch analytics on mount
  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Analitik Bisnis
            </h1>
            <p style={{ color: '#666', fontSize: '0.875rem' }}>
              Pantau performa bisnis dan tenaga kerja Anda
            </p>
          </div>
          <AnalyticsCsvExport
            data={exportData}
            filename="business-analytics"
            onExportComplete={handleExportComplete}
            onExportError={handleExportError}
          />
        </div>

        {/* Error State */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <AlertCircle style={{ width: '1.25rem', height: '1.25rem', color: '#dc2626' }} />
            <div style={{ flex: 1 }}>
              <p style={{ color: '#991b1b', fontWeight: 500, marginBottom: '0.25rem' }}>
                Gagal memuat data
              </p>
              <p style={{ color: '#b91c1c', fontSize: '0.875rem' }}>{error}</p>
            </div>
            <button
              onClick={fetchAnalytics}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Loader2 style={{ width: '1rem', height: '1rem' }} />
              Coba Lagi
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '3rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <Loader2 style={{ width: '2rem', height: '2rem', color: '#2563eb', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#666' }}>Memuat data analitik...</p>
          </div>
        )}

        {/* Analytics Content */}
        {!loading && !error && (
          <>
            {/* Date Filter */}
            <div style={{ marginBottom: '1.5rem' }}>
              <AnalyticsDateFilter
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
              />
            </div>

            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <AnalyticsStatsCard
                title="Total Pengeluaran"
                value={formatCurrency(analytics.spending?.total_spending || 0)}
                icon={DollarSign}
                color="blue"
              />
              <AnalyticsStatsCard
                title="Pekerja Unik"
                value={analytics.workers?.unique_workers || 0}
                icon={Users}
                color="green"
              />
              <AnalyticsStatsCard
                title="Rate Pekerja Ulang"
                value={`${analytics.workers?.repeat_hire_rate || 0}%`}
                icon={TrendingUp}
                color="orange"
              />
              <AnalyticsStatsCard
                title="Skor Reliabilitas"
                value={`${analytics.reliability?.average_score?.toFixed(1) || '0.0'}/5`}
                icon={Award}
                color="purple"
              />
              <div style={{
                padding: '1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                backgroundColor: 'white',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#6b7280',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Status Kepatuhan
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Shield style={{ width: '2rem', height: '2rem', color: '#10b981' }} />
                  <ComplianceBadge status={getComplianceBadgeStatus()} />
                </div>
                {analytics.compliance && (
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                    {analytics.compliance.compliant_jobs} dari {analytics.compliance.total_jobs} pekerjaan sesuai
                  </p>
                )}
              </div>
            </div>

            {/* Charts Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
              gap: '1.5rem'
            }}>
              {/* Spending Chart */}
              {analytics.trends && analytics.trends.length > 0 && (
                <AnalyticsSpendingChart
                  data={analytics.trends.map(t => ({
                    label: formatMonthLabel(t.month),
                    spending: t.spending
                  }))}
                  color="#2563eb"
                  height={320}
                />
              )}

              {/* Positions Chart */}
              {analytics.positions && analytics.positions.length > 0 && (
                <AnalyticsPositionsChart
                  data={analytics.positions.map(p => ({
                    label: p.position_title,
                    count: p.count
                  }))}
                  color="#10b981"
                  height={320}
                />
              )}
            </div>

            {/* Full Width Charts */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
              gap: '1.5rem',
              marginTop: '1.5rem'
            }}>
              {/* Reliability Chart */}
              {analytics.trends && analytics.trends.length > 0 && analytics.reliability && analytics.reliability.worker_count > 0 && (
                <AnalyticsReliabilityChart
                  data={analytics.trends.map(t => ({
                    label: formatMonthLabel(t.month),
                    reliability: analytics.reliability?.average_score || 0
                  }))}
                  color="#8b5cf6"
                  height={320}
                />
              )}

              {/* Trends Chart */}
              {analytics.trends && analytics.trends.length > 0 && (
                <AnalyticsTrendsChart
                  data={analytics.trends.map(t => ({
                    label: formatMonthLabel(t.month),
                    count: t.worker_count
                  }))}
                  color="#f59e0b"
                  height={320}
                />
              )}
            </div>

            {/* Empty State */}
            {!analytics.spending && !analytics.workers && !analytics.positions && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                padding: '3rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                textAlign: 'center',
                border: '1px dashed #d1d5db'
              }}>
                <TrendingUp style={{ width: '3rem', height: '3rem', color: '#9ca3af', margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Belum Ada Data
                </h3>
                <p style={{ color: '#666' }}>
                  Mulai merekrut pekerja untuk melihat analitik bisnis Anda
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
