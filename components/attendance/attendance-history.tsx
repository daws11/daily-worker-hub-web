"use client"

import * as React from "react"
import { Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/hooks"
import type { AttendanceWithRelations, AttendanceStats, LocationVerificationStatus } from "@/lib/types/attendance"

export interface AttendanceHistoryProps extends React.HTMLAttributes<HTMLDivElement> {
  records: AttendanceWithRelations[]
  stats?: AttendanceStats
  isLoading?: boolean
  showStats?: boolean
}

const AttendanceHistory = React.forwardRef<HTMLDivElement, AttendanceHistoryProps>(
  ({ records, stats, isLoading = false, showStats = true, className, ...props }, ref) => {
    const { t, locale } = useTranslation()

    // Format date to user's locale
    const formatDate = (dateString: string | null) => {
      if (!dateString) return "-"
      return new Date(dateString).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    }

    // Format time to user's locale
    const formatTime = (dateString: string | null) => {
      if (!dateString) return "-"
      return new Date(dateString).toLocaleTimeString(locale === "id" ? "id-ID" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    }

    // Calculate duration between check-in and check-out
    const calculateDuration = (checkIn: string | null, checkOut: string | null) => {
      if (!checkIn || !checkOut) return "-"
      const start = new Date(checkIn).getTime()
      const end = new Date(checkOut).getTime()
      const diffMs = end - start
      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      const hoursLabel = t("attendance.hours")
      const minutesLabel = t("attendance.minutes")
      return `${hours}${hoursLabel} ${minutes}${minutesLabel}`
    }

    // Get location verification badge variant
    const getLocationVariant = (
      status: LocationVerificationStatus
    ): "default" | "secondary" | "destructive" | "outline" => {
      switch (status) {
        case "verified":
          return "default"
        case "unverified":
          return "outline"
        case "out_of_range":
          return "destructive"
        default:
          return "outline"
      }
    }

    // Get location verification label
    const getLocationLabel = (status: LocationVerificationStatus): string => {
      switch (status) {
        case "verified":
          return t("attendance.locationVerified")
        case "unverified":
          return t("attendance.locationUnverified")
        case "out_of_range":
          return t("attendance.locationOutOfRange")
        default:
          return status
      }
    }

    // Get location verification icon
    const getLocationIcon = (status: LocationVerificationStatus) => {
      switch (status) {
        case "verified":
          return <CheckCircle className="h-3 w-3" />
        case "unverified":
          return <AlertCircle className="h-3 w-3" />
        case "out_of_range":
          return <XCircle className="h-3 w-3" />
        default:
          return <AlertCircle className="h-3 w-3" />
      }
    }

    if (isLoading) {
      return (
        <Card ref={ref} className={cn("w-full", className)} {...props}>
          <CardHeader>
            <CardTitle>{t("attendance.attendanceHistory")}</CardTitle>
            <CardDescription>{t("attendance.loadingAttendanceData")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (!records || records.length === 0) {
      return (
        <Card ref={ref} className={cn("w-full", className)} {...props}>
          <CardHeader>
            <CardTitle>{t("attendance.attendanceHistory")}</CardTitle>
            <CardDescription>
              {t("attendance.noAttendanceData")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {t("attendance.noAttendanceHistory")}
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card ref={ref} className={cn("w-full", className)} {...props}>
        <CardHeader>
          <CardTitle>{t("attendance.attendanceHistory")}</CardTitle>
          <CardDescription>
            {t("bookings.myBookings")} ({records.length} {t("attendance.records")})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {showStats && stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t("attendance.totalJobs")}</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.total_bookings}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t("attendance.present")}</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.checked_in_bookings}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t("attendance.finished")}</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.checked_out_bookings}</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">{t("attendance.attendanceRate")}</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-primary">{stats.attendance_rate}%</p>
              </div>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("attendance.date")}</TableHead>
                  <TableHead>{t("attendance.job")}</TableHead>
                  <TableHead>{t("attendance.checkIn")}</TableHead>
                  <TableHead>{t("attendance.checkOut")}</TableHead>
                  <TableHead>{t("attendance.duration")}</TableHead>
                  <TableHead>{t("attendance.location")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{formatDate(record.start_date)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{record.job.title}</div>
                        {record.job.address && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="line-clamp-1">{record.job.address}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{formatTime(record.check_in_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{formatTime(record.check_out_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{calculateDuration(record.check_in_at, record.check_out_at)}</span>
                    </TableCell>
                    <TableCell>
                      {record.check_in_at ? (
                        <Badge variant={getLocationVariant(record.check_in_location_verified)} className="gap-1">
                          {getLocationIcon(record.check_in_location_verified)}
                          <span>{getLocationLabel(record.check_in_location_verified)}</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          <span>{t("attendance.notCheckedIn")}</span>
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }
)
AttendanceHistory.displayName = "AttendanceHistory"

// Helper component for the empty state icon
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}

export { AttendanceHistory }
