"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"

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
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { raiseDispute } from "@/lib/actions/disputes"
import { toast } from "sonner"

type PaymentStatus = "pending" | "pending_review" | "available" | "released" | "disputed" | "cancelled"

export interface DisputeDialogProps {
  bookingId: string
  businessId: string
  paymentStatus: PaymentStatus
  jobTitle?: string
  workerName?: string
  onDisputeRaised?: (bookingId: string) => void
  trigger?: React.ReactNode
  triggerClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DisputeDialog({
  bookingId,
  businessId,
  paymentStatus,
  jobTitle,
  workerName,
  onDisputeRaised,
  trigger,
  triggerClassName,
  open: controlledOpen,
  onOpenChange,
}: DisputeDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const canDispute = paymentStatus === "pending_review"

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (isControlled && onOpenChange) {
        onOpenChange(newOpen)
      } else {
        setInternalOpen(newOpen)
      }

      // Reset reason when dialog closes
      if (!newOpen) {
        setReason("")
      }
    },
    [isControlled, onOpenChange]
  )

  const handleSubmit = async () => {
    if (!canDispute || isSubmitting) return

    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      toast.error("Alasan wajib diisi", {
        description: "Silakan jelaskan alasan sengketa Anda.",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await raiseDispute(bookingId, businessId, trimmedReason)

      if (result.success) {
        toast.success("Sengketa berhasil dibuat!", {
          description: "Pembayaran akan ditahan singga sengketa diselesaikan.",
        })
        handleOpenChange(false)
        onDisputeRaised?.(bookingId)
      } else {
        toast.error("Gagal membuat sengketa", {
          description: result.error || "Terjadi kesalahan saat membuat sengketa.",
        })
      }
    } catch {
      toast.error("Gagal membuat sengketa", {
        description: "Terjadi kesalahan tak terduga. Silakan coba lagi.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setReason("")
    handleOpenChange(false)
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
          <DialogTitle>Laporkan Masalah</DialogTitle>
          <DialogDescription>
            {workerName
              ? `Laporkan masalah untuk pekerjaan ${jobTitle || "ini"} dengan ${workerName}.`
              : `Laporkan masalah untuk pekerjaan ${jobTitle || "ini"}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dispute Impact Notice */}
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                <span className="font-semibold">Pembayaran akan ditahan:</span> Pembayaran
                akan dibekukan sampai sengketa diselesaikan. Tim kami akan menginvestigasi
                masalah ini sebelum keputusan final dibuat.
              </p>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Alasan Sengketa <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan masalah yang Anda alami (contoh: kualitas kerja tidak sesuai, pekerja tidak datang, dll.)"
              className={cn(
                "flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y",
                "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30"
              )}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length} karakter
            </p>
          </div>

          {/* Warning for non-disputable status */}
          {!canDispute && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
              <p className="text-xs text-red-800 dark:text-red-200">
                Sengketa hanya dapat dibuat untuk pembayaran dengan status{" "}
                <span className="font-semibold">Sedang Ditinjau</span>.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={!canDispute || isSubmitting || reason.trim() === ""}
          >
            {isSubmitting ? "Memproses..." : "Laporkan Masalah"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
