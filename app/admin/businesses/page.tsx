"use client"

import * as React from "react"
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

import { BusinessCard } from "@/components/admin/business-card"
import { getBusinessesForVerification } from "@/lib/supabase/queries/admin"
import type { BusinessVerificationFilters, BusinessVerificationItem, PaginatedAdminResponse } from "@/lib/types/admin"

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

interface BusinessesPageProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export default function BusinessesPage({ className, ...props }: BusinessesPageProps) {
  const [businesses, setBusinesses] = React.useState<BusinessVerificationItem[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  })

  const [filters, setFilters] = React.useState<BusinessVerificationFilters>({
    sortBy: "submitted_at",
    sortOrder: "desc",
  })
  const [searchInput, setSearchInput] = React.useState("")

  const fetchBusinesses = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await getBusinessesForVerification(
        filters,
        pagination.page,
        pagination.limit
      )

      if (fetchError) {
        throw new Error(fetchError)
      }

      const { items, total, totalPages } = data

      setBusinesses(items)
      setPagination((prev) => ({
        ...prev,
        total,
        totalPages,
      }))
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Terjadi kesalahan")
      setBusinesses([])
    }

    setLoading(false)
  }, [filters, pagination.page, pagination.limit])

  React.useEffect(() => {
    fetchBusinesses()
  }, [fetchBusinesses])

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
        verificationStatus: value === "all" ? undefined : (value as "pending" | "verified" | "rejected"),
      }))
      setPagination((prev) => ({ ...prev, page: 1 }))
    },
    [setFilters, setPagination]
  )

  const handleBusinessTypeFilter = React.useCallback(
    (value: string) => {
      setFilters((prev) => ({
        ...prev,
        businessType: value === "all" ? undefined : (value as "hotel" | "villa" | "restaurant" | "event_company" | "other"),
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

  return (
    <div className={cn("space-y-6", className)} {...props}>
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Business Verification
        </h1>
        <p className="text-muted-foreground mt-2">
          Review and verify business registrations on the platform
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select defaultValue="all" onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all" onValueChange={handleBusinessTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="hotel">Hotel</SelectItem>
              <SelectItem value="villa">Villa</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="event_company">Event Organizer</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 rounded-xl border bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
          <p className="text-destructive font-medium">{error}</p>
        </div>
      ) : businesses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No businesses found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
                onUpdate={fetchBusinesses}
              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} businesses
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
    </div>
  )
}
