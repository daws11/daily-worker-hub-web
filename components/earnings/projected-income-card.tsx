import * as React from "react"
import { TrendingUp, AlertCircle } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatIDR } from "@/lib/utils/currency"
import type { IncomeProjection } from "@/lib/types/earnings"

export interface ProjectedIncomeCardProps extends React.HTMLAttributes<HTMLDivElement> {
  projection?: IncomeProjection | null
  isLoading?: boolean
  title?: string
  description?: string
  showIcon?: boolean
  showConfidence?: boolean
  showFactors?: boolean
}

const ProjectedIncomeCard = React.forwardRef<HTMLDivElement, ProjectedIncomeCardProps>(
  (
    {
      projection,
      isLoading = false,
      title = "Proyeksi Pendapatan",
      description = "Perkiraan pendapatan berdasarkan performa Anda",
      showIcon = true,
      showConfidence = true,
      showFactors = true,
      className,
      ...props
    },
    ref
  ) => {
    // Get period label
    const getPeriodLabel = (period: 'week' | 'month' | 'quarter'): string => {
      switch (period) {
        case 'week':
          return 'Minggu ini'
        case 'month':
          return 'Bulan ini'
        case 'quarter':
          return 'Kuartal ini'
        default:
          return ''
      }
    }

    // Get confidence label and color
    const getConfidenceInfo = (confidence: 'low' | 'medium' | 'high') => {
      switch (confidence) {
        case 'high':
          return { label: 'Tinggi', color: 'text-green-600', bgColor: 'bg-green-100' }
        case 'medium':
          return { label: 'Sedang', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
        case 'low':
          return { label: 'Rendah', color: 'text-orange-600', bgColor: 'bg-orange-100' }
        default:
          return { label: '-', color: 'text-gray-600', bgColor: 'bg-gray-100' }
      }
    }

    // Get calculation method label
    const getMethodLabel = (method: 'simple_average' | 'trend_based' | 'booking_based'): string => {
      switch (method) {
        case 'simple_average':
          return 'Rata-rata Sederhana'
        case 'trend_based':
          return 'Berdasarkan Tren'
        case 'booking_based':
          return 'Berdasarkan Pekerjaan'
        default:
          return '-'
      }
    }

    // Loading state
    if (isLoading) {
      return (
        <Card ref={ref} className={cn("w-full", className)} {...props}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {showIcon && <TrendingUp className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
              <CardTitle>{title}</CardTitle>
            </div>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Empty state (no projection)
    if (!projection) {
      return (
        <Card ref={ref} className={cn("w-full", className)} {...props}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {showIcon && <TrendingUp className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
              <CardTitle>{title}</CardTitle>
            </div>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Data tidak cukup untuk membuat proyeksi
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Selesaikan lebih banyak pekerjaan untuk melihat proyeksi
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    const confidenceInfo = getConfidenceInfo(projection.confidence)
    const periodLabel = getPeriodLabel(projection.period)
    const methodLabel = getMethodLabel(projection.calculation_method)

    // Normal state with projection data
    return (
      <Card ref={ref} className={cn("w-full", className)} {...props}>
        <CardHeader>
          <div className="flex items-center gap-2">
            {showIcon && <TrendingUp className="h-5 w-5 text-muted-foreground" />}
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Projected Income */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{periodLabel}</p>
              <p className="text-3xl font-semibold tracking-tight">
                {formatIDR(projection.projected_income)}
              </p>
            </div>

            {/* Confidence Badge */}
            {showConfidence && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Tingkat Keyakinan:</span>
                <span className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full",
                  confidenceInfo.bgColor,
                  confidenceInfo.color
                )}>
                  {confidenceInfo.label}
                </span>
              </div>
            )}

            {/* Calculation Method */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Metode:</span>
              <span className="text-sm font-medium">{methodLabel}</span>
            </div>

            {/* Trend Indicator */}
            {projection.factors.trend_percentage !== 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Tren:</span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    projection.factors.trend_percentage > 0 ? "text-green-600" : "text-red-600"
                  )}
                  aria-label={`${
                    projection.factors.trend_percentage > 0 ? "Kenaikan" : "Penurunan"
                  } ${Math.abs(projection.factors.trend_percentage).toFixed(1)}%`}
                >
                  {projection.factors.trend_percentage > 0 ? "+" : ""}
                  {projection.factors.trend_percentage.toFixed(1)}%
                </span>
              </div>
            )}

            {/* Factors Details */}
            {showFactors && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground">Faktor Perhitungan</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Pekerjaan Terakhir</p>
                    <p className="text-sm font-semibold">{projection.factors.recent_bookings_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rata-rata/Pekerjaan</p>
                    <p className="text-sm font-semibold">{formatIDR(projection.factors.average_earning_per_booking)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Frekuensi</p>
                    <p className="text-sm font-semibold">
                      {projection.factors.booking_frequency.toFixed(1)}/minggu
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Dihitung Pada</p>
                    <p className="text-sm font-semibold">
                      {new Date(projection.calculated_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Disclaimer for low confidence */}
            {projection.confidence === 'low' && (
              <div className="flex items-start gap-2 p-3 bg-muted rounded-md" role="alert" aria-live="polite">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">
                  Proyeksi ini memiliki tingkat keyakinan rendah. Selesaikan lebih banyak pekerjaan untuk meningkatkan akurasi.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
)
ProjectedIncomeCard.displayName = "ProjectedIncomeCard"

export { ProjectedIncomeCard }
