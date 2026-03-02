"use client"

import * as React from "react"
import { useAuth } from "@/app/providers/auth-provider"
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertTriangle } from "lucide-react"

import { DisputeResolveDialog } from "@/components/admin/dispute-resolve-dialog"
import { getDisputes } from "@/lib/supabase/queries/admin"
import type { DisputeFilters, DisputeItem, PaginatedAdminResponse } from "@/lib/types/admin"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DisputesPageProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export default function DisputesPage({ className, ...props }: DisputesPageProps) {
  const { user } = useAuth()
  const [disputes, setDisputes] = React.useState<DisputeItem[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const [filters, setFilters] = React.useState<DisputeFilters>({
    sortBy: "created_at",
    sortOrder: "desc",
  })
  const [searchInput, setSearchInput] = React.useState("")

  // Dialog state
  const [selectedDispute, setSelectedDispute] = React.useState<DisputeItem | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const fetchDisputes = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await getDisputes(
      filters,
      pagination.page,
      pagination.limit
    )

    if (fetchError) {
      setError(fetchError)
      setDisputes([])
    } else if (data) {
      setDisputes(data.items)
      setPagination((prev) => ({
        ...prev,
        total: data.total,
        totalPages: data.totalPages,
      }))
    }

    setLoading(false)
  }, [filters, pagination.page, pagination.limit])

  React.useEffect(() => {
    fetchDisputes()
  }, [fetchDisputes])

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
        status: value === "all" ? undefined : (value as "pending" | "reviewing" | "resolved" | "dismissed"),
      }))
      setPagination((prev) => ({ ...prev, page: 1 }))
    },
    [setFilters, setPagination]
  )

  const handleTypeFilter = React.useCallback(
    (value: string) => {
      setFilters((prev) => ({
        ...prev,
        type: value === "all" ? undefined : (value as "booking" | "payment" | "behavior" | "quality" | "other"),
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

  const handleResolve = (dispute: DisputeItem) => {
    setSelectedDispute(dispute)
    setDialogOpen(true)
  }

  const handleDialogUpdate = () => {
    fetchDisputes()
    setSelectedDispute(null)
    setDialogOpen(false)
  }

  const formatDate = React.useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
      case "reviewing":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
      case "resolved":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
      case "dismissed":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
      case "medium":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
      case "high":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
      case "urgent":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const canResolve = (status: string) => status === "pending" || status === "reviewing"

  return (
    <div className={cn("space-y-6", className)} {...props}>
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Kelola Sengketa
        </h1>
        <p className="text-muted-foreground mt-2">
          Tinjau dan selesaikan sengketa antara pekerja dan bisnis
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari deskripsi sengketa..."
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
              <SelectItem value="reviewing">Reviewing</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all" onValueChange={handleTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="booking">Booking</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="behavior">Behavior</SelectItem>
              <SelectItem value="quality">Quality</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Memuat sengketa...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
          <p className="text-destructive font-medium">{error}</p>
        </div>
      ) : disputes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Tidak ada sengketa ditemukan</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Booking</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Bisnis</TableHead>
                  <TableHead>Pekerja</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioritas</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((dispute) => (
                  <TableRow key={dispute.id}>
                    <TableCell className="font-mono text-xs">
                      {dispute.booking_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {dispute.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(dispute.reporter as any)?.full_name ||
                        (dispute.booking as any)?.business?.name ||
                        dispute.reporter?.email ||
                        "-"}
                    </TableCell>
                    <TableCell>
                      {(dispute.reported as any)?.full_name ||
                        (dispute.booking as any)?.worker?.full_name ||
                        dispute.reported?.email ||
                        "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(getStatusColor(dispute.status))}>
                        {dispute.status === "pending"
                          ? "Pending"
                          : dispute.status === "reviewing"
                            ? "Reviewing"
                            : dispute.status === "resolved"
                              ? "Resolved"
                              : "Dismissed"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(getPriorityColor(dispute.priority))}>
                        {dispute.priority === "low"
                          ? "Low"
                          : dispute.priority === "medium"
                            ? "Medium"
                            : dispute.priority === "high"
                              ? "High"
                              : "Urgent"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(dispute.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canResolve(dispute.status) ? (
                        <Button
                          onClick={() => handleResolve(dispute)}
                          size="sm"
                          variant="default"
                        >
                          Resolve
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleResolve(dispute)}
                          size="sm"
                          variant="outline"
                        >
                          Lihat
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <div className="text-sm text-muted-foreground">
                Menampilkan {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} hingga{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} sengketa
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

      <DisputeResolveDialog
        dispute={selectedDispute}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={handleDialogUpdate}
        adminId={user?.id}
      />
    </div>
  )
}
