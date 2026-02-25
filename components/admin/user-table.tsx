"use client"

import * as React from "react"
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { getUsers } from "@/lib/supabase/queries/admin"
import type { UserManagementFilters, UserManagementItem, PaginatedAdminResponse } from "@/lib/types/admin"
import type { Database } from "@/lib/supabase/types"

type UserRow = Database['public']['Tables']['users']['Row']

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface UserTableProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

interface UserWithInitials extends UserManagementItem {
  initials: string
}

function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2)
}

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  switch (role) {
    case "admin":
      return "default"
    case "business":
      return "secondary"
    case "worker":
      return "outline"
    default:
      return "outline"
  }
}

export function UserTable({ className, ...props }: UserTableProps) {
  const [users, setUsers] = React.useState<UserWithInitials[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const [filters, setFilters] = React.useState<UserManagementFilters>({
    sortBy: "created_at",
    sortOrder: "desc",
  })
  const [searchInput, setSearchInput] = React.useState("")

  const fetchUsers = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await getUsers(filters, pagination.page, pagination.limit)

    if (fetchError) {
      setError(fetchError)
      setUsers([])
    } else if (data) {
      const usersWithInitials: UserWithInitials[] = data.items.map((item) => ({
        ...item,
        initials: getInitials(item.user.full_name),
      }))
      setUsers(usersWithInitials)
      setPagination((prev) => ({
        ...prev,
        total: data.total,
        totalPages: data.totalPages,
      }))
    }

    setLoading(false)
  }, [filters, pagination.page, pagination.limit])

  React.useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = React.useCallback(
    (value: string) => {
      setSearchInput(value)
      setFilters((prev) => ({ ...prev, search: value || undefined }))
      setPagination((prev) => ({ ...prev, page: 1 }))
    },
    [setFilters, setPagination]
  )

  const handleRoleFilter = React.useCallback(
    (value: string) => {
      setFilters((prev) => ({
        ...prev,
        role: value === "all" ? undefined : (value as "worker" | "business" | "admin"),
      }))
      setPagination((prev) => ({ ...prev, page: 1 }))
    },
    [setFilters, setPagination]
  )

  const handleSort = React.useCallback(
    (sortBy: UserManagementFilters["sortBy"]) => {
      setFilters((prev) => ({
        ...prev,
        sortBy,
        sortOrder: prev.sortBy === sortBy && prev.sortOrder === "desc" ? "asc" : "desc",
      }))
    },
    [setFilters]
  )

  const goToPage = React.useCallback(
    (page: number) => {
      setPagination((prev) => ({ ...prev, page: Math.max(1, Math.min(page, pagination.totalPages)) }))
    },
    [pagination.totalPages, setPagination]
  )

  const formatDate = React.useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }, [])

  return (
    <div className={cn("space-y-4", className)} {...props}>
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or email..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Select
          defaultValue="all"
          onValueChange={handleRoleFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="worker">Workers</SelectItem>
            <SelectItem value="business">Businesses</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead
                className="cursor-pointer hover:text-accent-foreground"
                onClick={() => handleSort("email")}
              >
                Email
              </TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Bookings</TableHead>
              <TableHead>Reviews</TableHead>
              <TableHead>Reports</TableHead>
              <TableHead
                className="cursor-pointer hover:text-accent-foreground"
                onClick={() => handleSort("created_at")}
              >
                Joined
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((userItem) => (
                <TableRow key={userItem.user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userItem.user.avatar_url} alt={userItem.user.full_name} />
                        <AvatarFallback>{userItem.initials}</AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[150px]">{userItem.user.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{userItem.user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(userItem.user.role)}>
                      {userItem.user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{userItem.bookingCount ?? 0}</TableCell>
                  <TableCell>{userItem.reviewCount ?? 0}</TableCell>
                  <TableCell>{userItem.reportCount ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(userItem.user.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
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
    </div>
  )
}
