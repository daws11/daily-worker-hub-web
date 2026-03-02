"use client"

import * as React from "react"
import { useAuth } from "@/app/providers/auth-provider"
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

import { KycReviewDialog } from "@/components/admin/kyc-review-dialog"
import { getKYCVerifications } from "@/lib/supabase/queries/admin"
import type { KYCVerificationFilters, KYCVerificationItem, PaginatedAdminResponse } from "@/lib/types/admin"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface KycsPageProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export default function KycsPage({ className, ...props }: KycsPageProps) {
  const { user } = useAuth()
  const [kycs, setKycs] = React.useState<KYCVerificationItem[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  })

  const [filters, setFilters] = React.useState<KYCVerificationFilters>({
    sortBy: "submitted_at",
    sortOrder: "desc",
  })
  const [searchInput, setSearchInput] = React.useState("")

  // Dialog state
  const [selectedKyc, setSelectedKyc] = React.useState<KYCVerificationItem | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const fetchKycs = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await getKYCVerifications(
      filters,
      pagination.page,
      pagination.limit
    )

    if (fetchError) {
      setError(fetchError)
      setKycs([])
    } else if (data) {
      setKycs(data.items)
      setPagination((prev) => ({
        ...prev,
        total: data.total,
        totalPages: data.totalPages,
      }))
    }

    setLoading(false)
  }, [filters, pagination.page, pagination.limit])

  React.useEffect(() => {
    fetchKycs()
  }, [fetchKycs])

  const handleSearch = React.useCallback(
    (value: string) => {
      setSearchInput(value)
      setFilters((prev) => ({ ...prev, search: value || undefined }))
      setPagination((prev) => ({ ...prev, page: 1 }))
    },
    [setFilters, setPagination]
  )

  const handleStatusFilter = React.useCallback(
    (value: string) => {
      setFilters((prev) => ({
        ...prev,
        status: value === "all" ? undefined : (value as "pending" | "verified" | "rejected"),
      }))
      setPagination((prev) => ({ ...prev, page: 1 }))
    },
    [setFilters, setPagination]
  )

  const goToPage = React.useCallback(
    (page: number) => {
      setPagination((prev) => ({ ...prev, page: Math.max(1, Math.min(page, pagination.totalPages)) }))
    },
    [pagination.totalPages, setPagination]
  )

  const handleReview = (kyc: KYCVerificationItem) => {
    setSelectedKyc(kyc)
    setDialogOpen(true)
  }

  const handleDialogUpdate = () => {
    fetchKycs()
    setSelectedKyc(null)
    setDialogOpen(false)
  }

  return (
    <div className={cn("space-y-6", className)} {...props}>
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Verifikasi KYC
        </h1>
        <p className="text-muted-foreground mt-2">
          Review dan verifikasi dokumen KYC worker
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari nama worker..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select defaultValue="all" onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl border bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
          <p className="text-destructive font-medium">{error}</p>
        </div>
      ) : kycs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">Tidak ada verifikasi KYC ditemukan</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kycs.map((kyc) => (
              <KycCard
                key={kyc.id}
                kyc={kyc}
                onReview={handleReview}
              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <div className="text-sm text-muted-foreground">
                Menampilkan {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} hingga{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} verifikasi
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => goToPage(1)}
                  disabled={pagination.page === 1 || loading}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page === 1 || loading}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => goToPage(pagination.totalPages)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <KycReviewDialog
        kyc={selectedKyc}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={handleDialogUpdate}
        adminId={user?.id}
      />
    </div>
  )
}

// ============================================================================
// KYC CARD COMPONENT
// ============================================================================

interface KycCardProps {
  kyc: KYCVerificationItem
  onReview: (kyc: KYCVerificationItem) => void
}

function KycCard({ kyc, onReview }: KycCardProps) {
  const formatDate = React.useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }, [])

  const isPending = kyc.status === "pending"
  const statusColors = {
    pending: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
    verified: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30",
    rejected: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-5 space-y-4 transition-colors hover:bg-muted/20",
        statusColors[kyc.status]
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold text-base">
            {kyc.worker?.full_name || "Unknown Worker"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {kyc.user?.email || "No email"}
          </p>
        </div>
      </div>

      {/* KTP Number */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Nomor KTP</p>
        <p className="text-sm font-mono font-medium">
          {kyc.ktp_number || "-"}
        </p>
      </div>

      {/* Submitted Date & Pending Days */}
      <div className="flex items-center justify-between text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Submitted</p>
          <p className="font-medium">{formatDate(kyc.submittedAt)}</p>
        </div>
        {isPending && kyc.pendingDays > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Menunggu</p>
            <p className={cn(
              "font-medium",
              kyc.pendingDays > 3 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
            )}>
              {kyc.pendingDays} hari
            </p>
          </div>
        )}
      </div>

      {/* Rejection Reason */}
      {kyc.status === "rejected" && kyc.rejection_reason && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
          <p className="text-xs font-medium text-red-800 dark:text-red-300 mb-1">Alasan Penolakan</p>
          <p className="text-xs text-red-700 dark:text-red-400">{kyc.rejection_reason}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {isPending ? (
          <Button
            onClick={() => onReview(kyc)}
            className="flex-1"
            size="sm"
          >
            Review
          </Button>
        ) : (
          <Button
            onClick={() => onReview(kyc)}
            variant="outline"
            className="flex-1"
            size="sm"
          >
            Lihat Detail
          </Button>
        )}
      </div>
    </div>
  )
}
