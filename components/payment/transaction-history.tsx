import * as React from "react"
import { Calendar, Wallet, ArrowUpCircle, ArrowDownCircle, AlertCircle } from "lucide-react"

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
import type { TransactionHistory } from "@/lib/types/payment"

export interface TransactionHistoryProps extends React.HTMLAttributes<HTMLDivElement> {
  transactions: TransactionHistory[]
  isLoading?: boolean
}

const TransactionHistory = React.forwardRef<HTMLDivElement, TransactionHistoryProps>(
  ({ transactions, isLoading = false, className, ...props }, ref) => {
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

    // Format amount to Indonesian Rupiah
    const formatAmount = (amount: number, type: TransactionHistory["type"]) => {
      const formatted = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.abs(amount))

      // Add +/- indicator based on transaction type
      if (type === "top_up" || type === "refund") {
        return `+${formatted}`
      }
      return `-${formatted}`
    }

    // Get status badge variant
    const getStatusVariant = (
      status: TransactionHistory["status"]
    ): "default" | "secondary" | "destructive" | "outline" => {
      switch (status) {
        case "pending":
          return "outline"
        case "processing":
          return "secondary"
        case "success":
        case "completed":
          return "default"
        case "failed":
        case "expired":
        case "cancelled":
          return "destructive"
        default:
          return "outline"
      }
    }

    // Get status label in Indonesian
    const getStatusLabel = (status: TransactionHistory["status"]): string => {
      switch (status) {
        case "pending":
          return "Menunggu"
        case "processing":
          return "Diproses"
        case "success":
        case "completed":
          return "Berhasil"
        case "failed":
          return "Gagal"
        case "expired":
          return "Kedaluwarsa"
        case "cancelled":
          return "Dibatalkan"
        default:
          return status
      }
    }

    // Get transaction type label in Indonesian
    const getTypeLabel = (type: TransactionHistory["type"]): string => {
      switch (type) {
        case "top_up":
          return "Isi Saldo"
        case "payment":
          return "Pembayaran"
        case "refund":
          return "Pengembalian"
        case "payout":
          return "Penarikan"
        case "payout_failure":
          return "Penarikan Gagal"
        default:
          return type
      }
    }

    // Get transaction icon
    const getTransactionIcon = (type: TransactionHistory["type"]) => {
      switch (type) {
        case "top_up":
        case "refund":
          return <ArrowUpCircle className="h-4 w-4 text-green-600" />
        case "payment":
        case "payout":
          return <ArrowDownCircle className="h-4 w-4 text-blue-600" />
        case "payout_failure":
          return <AlertCircle className="h-4 w-4 text-destructive" />
        default:
          return <Wallet className="h-4 w-4 text-muted-foreground" />
      }
    }

    // Get amount text color based on transaction type
    const getAmountColor = (type: TransactionHistory["type"]): string => {
      switch (type) {
        case "top_up":
        case "refund":
          return "text-green-600"
        case "payment":
        case "payout":
          return "text-blue-600"
        case "payout_failure":
          return "text-destructive"
        default:
          return "text-foreground"
      }
    }

    if (isLoading) {
      return (
        <Card ref={ref} className={cn("w-full", className)} {...props}>
          <CardHeader>
            <CardTitle>Riwayat Transaksi</CardTitle>
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

    if (!transactions || transactions.length === 0) {
      return (
        <Card ref={ref} className={cn("w-full", className)} {...props}>
          <CardHeader>
            <CardTitle>Riwayat Transaksi</CardTitle>
            <CardDescription>
              Anda belum memiliki transaksi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <WalletIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Belum ada transaksi. Mulai lakukan transaksi sekarang!
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card ref={ref} className={cn("w-full", className)} {...props}>
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
          <CardDescription>
            Daftar transaksi dompet Anda ({transactions.length} transaksi)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis Transaksi</TableHead>
                  <TableHead>Deskripsi</TableHead>
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
                      <div className="text-sm">{transaction.description}</div>
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
                      {formatAmount(transaction.amount, transaction.type)}
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
TransactionHistory.displayName = "TransactionHistory"

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

export { TransactionHistory }
