"use client"

import * as React from "react"
import { AlertCircle } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  getActiveCancellationReasons,
  cancelBookingWithReason,
  type CancellationReasonsListResult,
  type CancellationResult,
} from "@/lib/actions/cancellations"

export interface EmergencyCancellationDialogProps {
  bookingId: string
  workerId: string
  jobTitle: string
  businessName?: string
  onCancel?: () => void
  onSuccess?: () => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function EmergencyCancellationDialog({
  bookingId,
  workerId,
  jobTitle,
  businessName,
  onCancel,
  onSuccess,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: EmergencyCancellationDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [selectedReasonId, setSelectedReasonId] = React.useState<string>("")
  const [note, setNote] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isLoadingReasons, setIsLoadingReasons] = React.useState(true)
  const [reasons, setReasons] = React.useState<CancellationReasonsListResult["data"]>([])
  const [error, setError] = React.useState<string | null>(null)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  // Fetch cancellation reasons on mount
  React.useEffect(() => {
    async function fetchReasons() {
      setIsLoadingReasons(true)
      const result = await getActiveCancellationReasons()
      if (result.success && result.data) {
        setReasons(result.data)
      } else {
        setError(result.error || "Gagal memuat alasan pembatalan")
      }
      setIsLoadingReasons(false)
    }
    fetchReasons()
  }, [])

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (isControlled && onOpenChange) {
        onOpenChange(newOpen)
      } else {
        setInternalOpen(newOpen)
      }

      // Reset form when dialog closes
      if (!newOpen) {
        setSelectedReasonId("")
        setNote("")
        setError(null)
        onCancel?.()
      }
    },
    [isControlled, onOpenChange, onCancel]
  )

  const selectedReason = React.useMemo(() => {
    if (!selectedReasonId || !reasons) return null
    return reasons.find((r) => r.id === selectedReasonId)
  }, [selectedReasonId, reasons])

  const handleSubmit = async () => {
    if (!selectedReasonId) {
      setError("Silakan pilih alasan pembatalan")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result: CancellationResult = await cancelBookingWithReason(
        bookingId,
        selectedReasonId,
        note.trim() || undefined,
        { workerId }
      )

      if (result.success) {
        handleOpenChange(false)
        onSuccess?.()
      } else {
        setError(result.error || "Gagal membatalkan booking")
      }
    } catch (err) {
      setError("Terjadi kesalahan saat membatalkan booking")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setSelectedReasonId("")
    setNote("")
    setError(null)
    handleOpenChange(false)
  }

  const getPenaltyInfo = (penaltyPercentage: number) => {
    if (penaltyPercentage === 0) {
      return {
        text: "Tidak ada penalti",
        color: "text-green-600",
        bgColor: "bg-green-50 border-green-200",
      }
    } else if (penaltyPercentage <= 10) {
      return {
        text: `Penalti ringan ${penaltyPercentage}%`,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50 border-yellow-200",
      }
    } else {
      return {
        text: `Penalti ${penaltyPercentage}%`,
        color: "text-orange-600",
        bgColor: "bg-orange-50 border-orange-200",
      }
    }
  }

  const penaltyInfo = selectedReason
    ? getPenaltyInfo(selectedReason.penalty_percentage)
    : null

  // Group reasons by category
  const groupedReasons = React.useMemo(() => {
    if (!reasons) return {}
    return reasons.reduce((acc, reason) => {
      if (!acc[reason.category]) {
        acc[reason.category] = []
      }
      acc[reason.category].push(reason)
      return acc
    }, {} as Record<string, typeof reasons>)
  }, [reasons])

  const categoryLabels: Record<string, string> = {
    illness: "Sakit",
    family_emergency: "Keluarga Darurat",
    personal_emergency: "Pribadi Darurat",
    weather: "Cuaca",
    transportation: "Transportasi",
    schedule_conflict: "Konflik Jadwal",
    other: "Lainnya",
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Batalkan Booking - Darurat</DialogTitle>
          <DialogDescription>
            Pilih alasan pembatalan untuk booking "{jobTitle}"
            {businessName && ` di ${businessName}`}. Pembatalan darurat akan
            diberlakukan dengan penalti yang sesuai.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor="reason">Alasan Pembatalan</Label>
            <Select
              value={selectedReasonId}
              onValueChange={setSelectedReasonId}
              disabled={isSubmitting || isLoadingReasons}
            >
              <SelectTrigger id="reason">
                <SelectValue
                  placeholder={
                    isLoadingReasons
                      ? "Memuat alasan..."
                      : "Pilih alasan pembatalan"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedReasons).map(([category, categoryReasons]) => (
                  <React.Fragment key={category}>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                      {categoryLabels[category] || category}
                    </div>
                    {categoryReasons.map((reason) => (
                      <SelectItem key={reason.id} value={reason.id}>
                        {reason.name}
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Penalty Info */}
          {penaltyInfo && selectedReason && (
            <div
              className={cn(
                "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                penaltyInfo.bgColor
              )}
            >
              <AlertCircle className={cn("h-4 w-4 mt-0.5 flex-shrink-0", penaltyInfo.color)} />
              <div>
                <p className={cn("font-medium", penaltyInfo.color)}>
                  {penaltyInfo.text}
                </p>
                {selectedReason.description && (
                  <p className="text-muted-foreground text-xs mt-1">
                    {selectedReason.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Catatan (Opsional)</Label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tambahkan penjelasan tentang pembatalan ini..."
              className={cn(
                "flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y",
                "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30"
              )}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {note.length} karakter
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
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
            disabled={isSubmitting || !selectedReasonId || isLoadingReasons}
          >
            {isSubmitting ? "Membatalkan..." : "Konfirmasi Pembatalan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { EmergencyCancellationDialog }
