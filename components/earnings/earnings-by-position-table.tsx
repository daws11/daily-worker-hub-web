import * as React from "react"
import { Briefcase, Calendar, TrendingUp, TrendingDown } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatIDR } from "@/lib/utils/currency"
import type { PositionEarnings } from "@/lib/types/earnings"

export interface EarningsByPositionTableProps extends React.HTMLAttributes<HTMLDivElement> {
  data?: PositionEarnings[] | null
  isLoading?: boolean
  title?: string
  description?: string
  showIcon?: boolean
  showEmptyState?: boolean
  bestPerformingPosition?: PositionEarnings | null
}

const EarningsByPositionTable = React.forwardRef<HTMLDivElement, EarningsByPositionTableProps>(
  (
    {
      data,
      isLoading = false,
      title = "Pendapatan Berdasarkan Posisi",
      description = "Lihat posisi pekerjaan dengan pendapatan terbaik",
      showIcon = true,
      showEmptyState = true,
      bestPerformingPosition = null,
      className,
      ...props
    },
    ref
  ) => {
    // Format date to Indonesian locale
    const formatDate = (dateString: string | null) => {
      if (!dateString) return "-"
      return new Date(dateString).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    }

    // Get rank badge variant
    const getRankBadgeVariant = (index: number): "default" | "secondary" | "outline" => {
      if (index === 0) return "default" // Gold - first place
      if (index === 1) return "secondary" // Silver - second place
      if (index === 2) return "outline" // Bronze - third place
      return "outline"
    }

    // Get rank label
    const getRankLabel = (index: number): string => {
      const rank = index + 1
      if (rank === 1) return "🥇"
      if (rank === 2) return "🥈"
      if (rank === 3) return "🥉"
      return `#${rank}`
    }

    // Loading state
    if (isLoading) {
      return (
        <Card ref={ref} className={cn("w-full", className)} {...props}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {showIcon && <Briefcase className="h-5 w-5 text-muted-foreground" />}
              <CardTitle>{title}</CardTitle>
            </div>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Empty state (no data)
    if (!data || data.length === 0) {
      if (showEmptyState) {
        return (
          <Card ref={ref} className={cn("w-full", className)} {...props}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {showIcon && <Briefcase className="h-5 w-5 text-muted-foreground" />}
                <CardTitle>{title}</CardTitle>
              </div>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Belum ada data pendapatan berdasarkan posisi
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Data pendapatan per posisi akan muncul di sini setelah Anda menyelesaikan pekerjaan
                </p>
              </div>
            </CardContent>
          </Card>
        )
      }
      return null
    }

    return (
      <Card ref={ref} className={cn("w-full", className)} {...props}>
        <CardHeader>
          <div className="flex items-center gap-2">
            {showIcon && <Briefcase className="h-5 w-5 text-muted-foreground" />}
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>
            {data.length} posisi pekerjaan dengan pendapatan tertinggi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Best performing position highlight */}
            {bestPerformingPosition && (
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Posisi Terbaik</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{bestPerformingPosition.position_title}</p>
                    {bestPerformingPosition.category_name && (
                      <p className="text-xs text-muted-foreground">
                        {bestPerformingPosition.category_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">
                      {formatIDR(bestPerformingPosition.total_earnings)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {bestPerformingPosition.bookings_count}{" "}
                      {bestPerformingPosition.bookings_count === 1 ? "pekerjaan" : "pekerjaan"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Peringkat</TableHead>
                    <TableHead>Posisi Pekerjaan</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Total Pendapatan</TableHead>
                    <TableHead className="text-right">Pekerjaan</TableHead>
                    <TableHead className="text-right">Rata-rata</TableHead>
                    <TableHead>Pekerjaan Terakhir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((position, index) => {
                    const isBestPerforming =
                      bestPerformingPosition &&
                      position.position_title === bestPerformingPosition.position_title

                    return (
                      <TableRow
                        key={position.position_title}
                        className={isBestPerforming ? "bg-primary/5" : undefined}
                      >
                        <TableCell>
                          <Badge variant={getRankBadgeVariant(index)}>
                            {getRankLabel(index)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {isBestPerforming && (
                              <TrendingUp className="h-4 w-4 text-primary" />
                            )}
                            <span>{position.position_title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {position.category_name || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatIDR(position.total_earnings)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm">{position.bookings_count}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm text-muted-foreground">
                            {formatIDR(position.average_earning)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(position.last_booking_date)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Summary statistics */}
            <div className="flex items-center justify-between pt-2 border-t text-sm">
              <div className="text-center flex-1">
                <p className="text-xs text-muted-foreground">Total Pendapatan</p>
                <p className="font-semibold">
                  {formatIDR(data.reduce((sum, item) => sum + item.total_earnings, 0))}
                </p>
              </div>
              <div className="text-center flex-1 border-x px-4">
                <p className="text-xs text-muted-foreground">Total Pekerjaan</p>
                <p className="font-semibold">
                  {data.reduce((sum, item) => sum + item.bookings_count, 0)}
                </p>
              </div>
              <div className="text-center flex-1">
                <p className="text-xs text-muted-foreground">Rata-rata per Posisi</p>
                <p className="font-semibold">
                  {formatIDR(
                    data.reduce((sum, item) => sum + item.total_earnings, 0) / data.length
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
)
EarningsByPositionTable.displayName = "EarningsByPositionTable"

export { EarningsByPositionTable }
