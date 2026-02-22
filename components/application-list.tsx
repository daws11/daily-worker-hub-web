import * as React from "react"
import { Calendar, Building2, MapPin, Wallet, X, MoreVertical } from "lucide-react"

import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"
import { cn } from "@/lib/utils"
import type { ApplicationWithDetails } from "@/lib/data/jobs"

export interface ApplicationListProps extends React.HTMLAttributes<HTMLDivElement> {
  applications: ApplicationWithDetails[]
  onCancel?: (applicationId: string) => void
  isLoading?: boolean
}

const ApplicationList = React.forwardRef<HTMLDivElement, ApplicationListProps>(
  ({ applications, onCancel, isLoading = false, className, ...props }, ref) => {
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

    // Format budget to Indonesian Rupiah
    const formatBudget = (amount: number) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)
    }

    // Get status badge variant
    const getStatusVariant = (
      status: ApplicationWithDetails["status"]
    ): "default" | "secondary" | "destructive" | "outline" => {
      switch (status) {
        case "pending":
          return "outline"
        case "accepted":
          return "default"
        case "rejected":
          return "destructive"
        case "in_progress":
          return "secondary"
        case "completed":
          return "default"
        case "cancelled":
          return "destructive"
        default:
          return "outline"
      }
    }

    // Get status label in Indonesian
    const getStatusLabel = (status: ApplicationWithDetails["status"]): string => {
      switch (status) {
        case "pending":
          return "Menunggu"
        case "accepted":
          return "Diterima"
        case "rejected":
          return "Ditolak"
        case "in_progress":
          return "Sedang Berjalan"
        case "completed":
          return "Selesai"
        case "cancelled":
          return "Dibatalkan"
        default:
          return status
      }
    }

    // Check if application can be cancelled
    const canCancel = (application: ApplicationWithDetails) => {
      return application.status === "pending" && onCancel
    }

    if (isLoading) {
      return (
        <Card ref={ref} className={cn("w-full", className)} {...props}>
          <CardHeader>
            <CardTitle>Riwayat Lamaran</CardTitle>
            <CardDescription>Memuat data lamaran...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (!applications || applications.length === 0) {
      return (
        <Card ref={ref} className={cn("w-full", className)} {...props}>
          <CardHeader>
            <CardTitle>Riwayat Lamaran</CardTitle>
            <CardDescription>
              Anda belum memiliki lamaran pekerjaan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BriefcaseIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Belum ada lamaran. Mulai cari pekerjaan dan lamar sekarang!
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card ref={ref} className={cn("w-full", className)} {...props}>
        <CardHeader>
          <CardTitle>Riwayat Lamaran</CardTitle>
          <CardDescription>
            Daftar pekerjaan yang Anda lamar ({applications.length} lamaran)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pekerjaan</TableHead>
                  <TableHead>Perusahaan</TableHead>
                  <TableHead>Tanggal Lamar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div className="font-medium">{application.jobs.title}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Wallet className="h-3 w-3" />
                          <span>
                            {formatBudget(application.jobs.budget_min)}
                            {application.jobs.budget_max > application.jobs.budget_min &&
                              ` - ${formatBudget(application.jobs.budget_max)}`}
                          </span>
                        </div>
                        {application.jobs.address && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="line-clamp-1">
                              {application.jobs.address}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{application.businesses.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(application.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(application.status)}>
                        {getStatusLabel(application.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canCancel(application) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCancel?.(application.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Batalkan Lamaran</span>
                        </Button>
                      )}
                      {!canCancel(application) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Tidak ada aksi</span>
                        </Button>
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
ApplicationList.displayName = "ApplicationList"

// Helper component for the empty state icon
function BriefcaseIcon({ className }: { className?: string }) {
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
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

export { ApplicationList }
