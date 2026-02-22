"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, Briefcase, Hash, ArrowDownLeft, ArrowUpRight, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type WalletTransactionRow = Database["public"]["Tables"]["wallet_transactions"]["Row"]
type WalletTransactionType = WalletTransactionRow["type"]

export interface TransactionDetailDialogProps {
  transaction: {
    id: string
    amount: number
    type: WalletTransactionType
    description: string | null
    created_at: string
    bookings?: {
      id: string
      jobs: {
        id: string
        title: string
      }
    } | null
  } | null
  trigger?: React.ReactNode
  triggerClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const transactionTypeConfig: Record<
  WalletTransactionType,
  {
    variant: "default" | "secondary" | "destructive" | "outline"
    label: string
    icon: React.ReactNode
    amountColor: string
    amountPrefix: string
    description: string
  }
> = {
  credit: {
    variant: "default",
    label: "Pemasukan",
    icon: <ArrowDownLeft className="h-5 w-5" />,
    amountColor: "text-green-600",
    amountPrefix: "+",
    description: "Uang masuk ke dompet Anda"
  },
  debit: {
    variant: "destructive",
    label: "Pengeluaran",
    icon: <ArrowUpRight className="h-5 w-5" />,
    amountColor: "text-red-600",
    amountPrefix: "-",
    description: "Uang keluar dari dompet Anda"
  },
  pending: {
    variant: "secondary",
    label: "Tertahan",
    icon: <Clock className="h-5 w-5" />,
    amountColor: "text-yellow-600",
    amountPrefix: "",
    description: "Dana ditahan sementara sampai pekerjaan selesai"
  },
  released: {
    variant: "default",
    label: "Diterbitkan",
    icon: <ArrowDownLeft className="h-5 w-5" />,
    amountColor: "text-green-600",
    amountPrefix: "+",
    description: "Dana diterbitkan setelah pekerjaan selesai"
  },
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateString
  }
}

export function TransactionDetailDialog({
  transaction,
  trigger,
  triggerClassName,
  open: controlledOpen,
  onOpenChange,
}: TransactionDetailDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (isControlled && onOpenChange) {
        onOpenChange(newOpen)
      } else {
        setInternalOpen(newOpen)
      }
    },
    [isControlled, onOpenChange]
  )

  if (!transaction) {
    return null
  }

  const { type, amount, description, created_at, bookings } = transaction
  const config = transactionTypeConfig[type]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && (
        <DialogTrigger asChild className={triggerClassName}>
          {trigger}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Detail Transaksi</DialogTitle>
          <DialogDescription>
            Informasi lengkap mengenai transaksi dompet Anda
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Amount and Type */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("flex items-center justify-center h-12 w-12 rounded-full", config.variant === "default" ? "bg-green-100" : config.variant === "destructive" ? "bg-red-100" : "bg-yellow-100")}>
                <div className={cn(config.variant === "default" ? "text-green-600" : config.variant === "destructive" ? "text-red-600" : "text-yellow-600")}>
                  {config.icon}
                </div>
              </div>
              <div>
                <Badge variant={config.variant}>{config.label}</Badge>
                <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
              </div>
            </div>
            <span className={cn("text-2xl font-bold", config.amountColor)}>
              {config.amountPrefix}{formatAmount(amount)}
            </span>
          </div>

          <Separator />

          {/* Transaction Details */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Tanggal & Waktu</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(created_at)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Hash className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">ID Transaksi</p>
                <p className="text-sm text-muted-foreground font-mono">{transaction.id}</p>
              </div>
            </div>

            {bookings?.jobs && (
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Pekerjaan Terkait</p>
                  <p className="text-sm text-muted-foreground">{bookings.jobs.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Booking ID: {bookings.id}</p>
                </div>
              </div>
            )}

            {description && (
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5 flex items-center justify-center text-xs font-bold">
                  ?
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Keterangan</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
