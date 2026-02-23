import * as React from "react"
import { Calendar, Wallet, ArrowUpCircle, AlertCircle, Briefcase, Building2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"
import { formatIDR } from "@/lib/utils/currency"
import type { EarningsTransaction } from "@/lib/types/earnings"

export interface TransactionHistoryTableProps extends React.HTMLAttributes<HTMLDivElement> {
  transactions?: EarningsTransaction[] | null
  isLoading?: boolean
  title?: string
  description?: string
  showEmptyState?: boolean
}

const TransactionHistoryTable = React.forwardRef<HTMLDivElement, TransactionHistoryTableProps>(
  (
    {
      transactions,
      isLoading = false,
      title = "Riwayat Transaksi Pendapatan",
      description = "Daftar transaksi pendapatan Anda",
      showEmptyState = true,
      className,
      ...props
    },
    ref
  ) => {
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

    // Get status badge variant
    const getStatusVariant = (
      status: EarningsTransaction["status"]
    ): "default" | "secondary" | "destructive" | "outline" => {
      switch (status) {
        case "pending":
          return "outline"
        case "success":
          return "default"
        case "failed":
          return "destructive"
        default:
          return "outline"
      }
    }

    // Get status label in Indonesian
    const getStatusLabel = (status: EarningsTransaction["status"]): string => {
      switch (status) {
        case "pending":
          return "Menunggu"
        case "success":
          return "Berhasil"
        case "failed":
          return "Gagal"
        default:
          return status
      }
    }

    // Get transaction type label in Indonesian
    const getTypeLabel = (type: EarningsTransaction["type"]): string => {
      switch (type) {
        case "payment":
          return "Pembayaran"
        case "refund":
          return "Pengembalian Dana"
        default:
          return type
      }
    }

    // Get transaction icon
    const getTransactionIcon = (type: EarningsTransaction["type"]) => {
      switch (type) {
        case "payment":
          return <ArrowUpCircle className="h-4 w-4 text-green-600" />
        case "refund":
          return <AlertCircle className="h-4 w-4 text-orange-600" />
        default:
          return <Wallet className="h-4 w-4 text-muted-foreground" />
      }
    }

    // Get amount text color based on transaction type
    const getAmountColor = (type: EarningsTransaction["type"]): string => {
      switch (type) {
        case "payment":
          return "text-green-600"
        case "refund":
          return "text-orange-600"
        default:
          return "text-foreground"
      }
    }

    // Get amount prefix based on transaction type
    const getAmountPrefix = (type: EarningsTransaction["type"]): string => {
      switch (type) {
        case "payment":
          return "+"
        case "refund":
          return "-"
        default:
          return ""
      }
    }

    // Loading state
    if (isLoading) {
      return (
        <Card ref={ref} className={cn("w-full", className)} {...props}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Memuat data transaksi...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Empty state
    if (!transactions || transactions.length === 0) {
      if (showEmptyState) {
        return (
          <Card ref={ref} className={cn("w-full", className)} {...props}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>Anda belum memiliki transaksi pendapatan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <WalletIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Belum ada transaksi pendapatan. Pendapatan Anda akan muncul di sini setelah menyelesaikan pekerjaan.
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
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description} ({transactions.length} transaksi)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis Transaksi</TableHead>
                  <TableHead>Pekerjaan</TableHead>
                  <TableHead>Bisnis</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.type)}
                        <span>{getTypeLabel(transaction.type)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{transaction.job_title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{transaction.business_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(transaction.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(transaction.status)}>
                        {getStatusLabel(transaction.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${getAmountColor(transaction.type)}`}>
                      {getAmountPrefix(transaction.type)}
                      {formatIDR(transaction.amount)}
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
TransactionHistoryTable.displayName = "TransactionHistoryTable"

// Helper component for the empty state icon
function WalletIcon({ className }: { className?: string }) {
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
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  )
}

export { TransactionHistoryTable }
