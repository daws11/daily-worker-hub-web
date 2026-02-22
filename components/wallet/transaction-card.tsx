"use client"

import * as React from "react"
import { Calendar, Clock, Briefcase, ArrowDownLeft, ArrowUpRight } from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type WalletTransactionRow = {
  id: string
  wallet_id: string
  amount: number
  type: 'credit' | 'debit' | 'pending' | 'released'
  booking_id: string | null
  description: string | null
  created_at: string
}
type WalletTransactionType = WalletTransactionRow["type"]

export interface TransactionCardProps {
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
  }
  onSelect?: (transactionId: string) => void
  isSelected?: boolean
}

const transactionTypeConfig: Record<
  WalletTransactionType,
  {
    variant: "default" | "secondary" | "destructive" | "outline"
    label: string
    icon: React.ReactNode
    amountColor: string
    amountPrefix: string
  }
> = {
  credit: {
    variant: "default",
    label: "Pemasukan",
    icon: <ArrowDownLeft className="h-4 w-4" />,
    amountColor: "text-green-600",
    amountPrefix: "+",
  },
  debit: {
    variant: "destructive",
    label: "Pengeluaran",
    icon: <ArrowUpRight className="h-4 w-4" />,
    amountColor: "text-red-600",
    amountPrefix: "-",
  },
  pending: {
    variant: "secondary",
    label: "Tertahan",
    icon: <Clock className="h-4 w-4" />,
    amountColor: "text-yellow-600",
    amountPrefix: "",
  },
  released: {
    variant: "default",
    label: "Diterbitkan",
    icon: <ArrowDownLeft className="h-4 w-4" />,
    amountColor: "text-green-600",
    amountPrefix: "+",
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

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = diffInMs / (1000 * 60 * 60)
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24)

    if (diffInHours < 24) {
      return `Hari ini, ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
    } else if (diffInDays < 2) {
      return `Kemarin, ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
    } else if (diffInDays < 7) {
      return date.toLocaleDateString("id-ID", { weekday: "long", hour: "2-digit", minute: "2-digit" })
    } else {
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    }
  } catch {
    return dateString
  }
}

export function TransactionCard({ transaction, onSelect, isSelected }: TransactionCardProps) {
  const { type, amount, description, created_at, bookings } = transaction
  const config = transactionTypeConfig[type]

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        onSelect && "cursor-pointer",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      onClick={() => onSelect?.(transaction.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn("flex items-center justify-center h-10 w-10 rounded-full", config.variant === "default" ? "bg-green-100" : config.variant === "destructive" ? "bg-red-100" : "bg-yellow-100")}>
              <div className={cn(config.variant === "default" ? "text-green-600" : config.variant === "destructive" ? "text-red-600" : "text-yellow-600")}>
                {config.icon}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant={config.variant}>{config.label}</Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{formatDate(created_at)}</span>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={cn("text-lg font-semibold", config.amountColor)}>
              {config.amountPrefix}{formatAmount(amount)}
            </span>
          </div>
        </div>
      </CardHeader>
      {(description || bookings?.jobs) && (
        <CardContent className="space-y-2 pt-0">
          {bookings?.jobs && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="line-clamp-1">{bookings.jobs.title}</span>
            </div>
          )}
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
