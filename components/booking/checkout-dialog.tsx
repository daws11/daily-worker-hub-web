"use client"

import * as React from "react"
import { LogOut, Banknote, Clock, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { checkoutBooking } from "@/lib/actions/bookings"
import { toast } from "sonner"

type BookingStatus = "pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled"

export interface JobDetails {
  id: string
  title: string
  description?: string
  budget_max?: number
  address?: string
}

export interface CheckoutDialogProps {
  bookingId: string
  workerId: string
  status: BookingStatus
  job: JobDetails
  finalPrice?: number
  startDate?: string
  endDate?: string
  onCheckoutComplete?: (bookingId: string) => void
  trigger?: React.ReactNode
  triggerClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CheckoutDialog({
  bookingId,
  workerId,
  status,
  job,
  finalPrice,
  startDate,
  endDate,
  onCheckoutComplete,
  trigger,
  triggerClassName,
  open: controlledOpen,
  onOpenChange,
}: CheckoutDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [isCheckingOut, setIsCheckingOut] = React.useState(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const canCheckout = status === "in_progress"

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

  const handleCheckout = async () => {
    if (!canCheckout || isCheckingOut) return

    setIsCheckingOut(true)
    try {
      const result = await checkoutBooking(bookingId, workerId)

      if (result.success) {
        toast.success("Pekerjaan berhasil selesai!", {
          description: "Pembayaran sedang diproses dan akan tersedia dalam 24 jam.",
        })
        handleOpenChange(false)
        onCheckoutComplete?.(bookingId)
      } else {
        toast.error("Gagal checkout", {
          description: result.error || "Terjadi kesalahan saat checkout.",
        })
      }
    } catch {
      toast.error("Gagal checkout", {
        description: "Terjadi kesalahan tak terduga. Silakan coba lagi.",
      })
    } finally {
      setIsCheckingOut(false)
    }
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return "Rp 0"
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && (
        <DialogTrigger asChild className={triggerClassName}>
          {trigger}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Checkout dari Pekerjaan</DialogTitle>
          <DialogDescription>
            Konfirmasi bahwa Anda telah menyelesaikan pekerjaan ini. Pembayaran akan diproses setelah checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Job Title */}
          <div className="space-y-1">
            <h3 className="font-semibold text-base">{job.title}</h3>
            {job.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {job.description}
              </p>
            )}
          </div>

          {/* Job Details */}
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            {/* Payment Amount */}
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Banknote className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">Estimasi Pembayaran</p>
                <p className="text-sm font-semibold">
                  {formatCurrency(finalPrice || job.budget_max)}
                </p>
              </div>
            </div>

            {/* Work Period */}
            {(startDate || endDate) && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">Periode Kerja</p>
                  <p className="text-sm">
                    {formatDate(startDate)} {endDate && ` - ${formatDate(endDate)}`}
                  </p>
                </div>
              </div>
            )}

            {/* Location */}
            {job.address && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">Lokasi</p>
                  <p className="text-sm line-clamp-2">{job.address}</p>
                </div>
              </div>
            )}
          </div>

          {/* Review Period Notice */}
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <span className="font-semibold">Periode Review 24 Jam:</span> Pembayaran akan
              ditahan selama 24 jam untuk memberikan kesempatan kepada bisnis untuk
              meninjau pekerjaan. Setelah periode ini, pembayaran akan otomatis
              tersedia di dompet Anda.
            </p>
          </div>

          {/* Warning for non-in_progress status */}
          {!canCheckout && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Checkout hanya tersedia untuk pekerjaan dengan status{" "}
                <span className="font-semibold">Sedang Berjalan</span>.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCheckingOut}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleCheckout}
            disabled={!canCheckout || isCheckingOut}
          >
            {isCheckingOut ? (
              <>Memproses...</>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Checkout Sekarang
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
