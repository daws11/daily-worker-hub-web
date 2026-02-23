"use client"

import * as React from "react"
import {
  Check,
  X,
  FileText,
  User,
  Users,
  Calendar,
  AlertCircle,
  Briefcase,
  MapPin,
  Clock,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import type { DisputeItem } from "@/lib/types/admin"
import { resolveDispute } from "@/lib/supabase/queries/admin"
import { toast } from "sonner"

interface DisputeResolveDialogProps {
  dispute: DisputeItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
  adminId?: string
}

type ResolutionAction = "resolve_completed" | "resolve_cancelled" | "dismiss"

export function DisputeResolveDialog({
  dispute,
  open,
  onOpenChange,
  onUpdate,
  adminId,
}: DisputeResolveDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [resolutionAction, setResolutionAction] =
    React.useState<ResolutionAction | null>(null)
  const [resolutionNotes, setResolutionNotes] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setResolutionAction(null)
      setResolutionNotes("")
      setError(null)
    }
  }, [open])

  const handleResolveCompleted = async () => {
    if (!dispute || !adminId) {
      setError("Admin ID is required for resolution")
      return
    }

    if (!resolutionNotes.trim()) {
      setError("Catatan resolusi harus diisi")
      return
    }

    setLoading(true)
    setError(null)

    const { error: resolveError } = await resolveDispute(
      dispute.booking_id,
      {
        status: "completed",
        resolution_notes: resolutionNotes,
      }
    )

    if (resolveError) {
      setError(resolveError)
      toast.error("Gagal menyelesaikan sengketa: " + resolveError)
    } else {
      toast.success("Sengketa berhasil diselesaikan")
      onOpenChange(false)
      onUpdate?.()
    }

    setLoading(false)
  }

  const handleResolveCancelled = async () => {
    if (!dispute || !adminId) {
      setError("Admin ID is required for resolution")
      return
    }

    if (!resolutionNotes.trim()) {
      setError("Catatan resolusi harus diisi")
      return
    }

    setLoading(true)
    setError(null)

    const { error: resolveError } = await resolveDispute(
      dispute.booking_id,
      {
        status: "cancelled",
        resolution_notes: resolutionNotes,
      }
    )

    if (resolveError) {
      setError(resolveError)
      toast.error("Gagal menyelesaikan sengketa: " + resolveError)
    } else {
      toast.success("Sengketa berhasil dibatalkan")
      onOpenChange(false)
      onUpdate?.()
    }

    setLoading(false)
  }

  const handleDismiss = () => {
    onOpenChange(false)
  }

  const formatDate = React.useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [])

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

  if (!dispute) {
    return null
  }

  const canResolve = dispute.status === "pending" || dispute.status === "reviewing"
  const booking = dispute.booking

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Resolusi Sengketa</DialogTitle>
              <DialogDescription className="mt-2">
                Tinjau dan selesaikan sengketa antara pekerja dan bisnis
              </DialogDescription>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge className={cn(getStatusColor(dispute.status))}>
                {dispute.status === "pending"
                  ? "Menunggu"
                  : dispute.status === "reviewing"
                    ? "Dalam Tinjauan"
                    : dispute.status === "resolved"
                      ? "Selesai"
                      : "Ditolak"}
              </Badge>
              <Badge className={cn(getPriorityColor(dispute.priority))}>
                {dispute.priority === "low"
                  ? "Rendah"
                  : dispute.priority === "medium"
                    ? "Sedang"
                    : dispute.priority === "high"
                      ? "Tinggi"
                      : "Urgent"}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Information */}
          {booking && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Informasi Booking
              </h3>
              <div className="rounded-lg border bg-muted/20 p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ID Booking:</span>
                  <span className="font-medium font-mono">
                    {booking.id.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      booking.status === "pending" && "border-amber-500 text-amber-700",
                      booking.status === "in_progress" && "border-blue-500 text-blue-700",
                      booking.status === "completed" && "border-green-500 text-green-700",
                      booking.status === "cancelled" && "border-red-500 text-red-700"
                    )}
                  >
                    {booking.status === "pending"
                      ? "Menunggu"
                      : booking.status === "in_progress"
                        ? "Dalam Pengerjaan"
                        : booking.status === "completed"
                          ? "Selesai"
                          : "Dibatalkan"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Tanggal Dibuat:
                  </span>
                  <span className="font-medium">
                    {formatDate(booking.created_at)}
                  </span>
                </div>
                {booking.area && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Area:
                    </span>
                    <span className="font-medium">{booking.area}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parties Involved */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pihak Terlibat
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Business */}
              <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Bisnis</p>
                <p className="font-medium">
                  {booking?.business?.name ||
                    (dispute.reporter && (dispute.reporter as any).full_name) ||
                    "-"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dispute.reporter?.email || "-"}
                </p>
              </div>

              {/* Worker */}
              <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Pekerja</p>
                <p className="font-medium">
                  {booking?.worker?.full_name ||
                    (dispute.reported && (dispute.reported as any).full_name) ||
                    "-"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dispute.reported?.email || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Dispute Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Detail Sengketa
            </h3>
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tipe Sengketa:</span>
                <span className="font-medium capitalize">
                  {dispute.type || "booking"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Dibuat:
                </span>
                <span className="font-medium">{formatDate(dispute.created_at)}</span>
              </div>
              {dispute.description && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Deskripsi:
                  </p>
                  <p className="text-sm">{dispute.description}</p>
                </div>
              )}
              {booking?.booking_notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Catatan Booking:
                  </p>
                  <p className="text-sm">{booking.booking_notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Resolution Notes Input */}
          {canResolve && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Catatan Resolusi
                <span className="text-destructive ml-1">*</span>
              </label>
              <Textarea
                placeholder="Jelaskan keputusan resolusi sengketa ini..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
                className={cn(
                  !resolutionNotes.trim() && error && "border-destructive"
                )}
              />
              {!resolutionNotes.trim() && error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          )}

          {/* Previous resolution */}
          {!canResolve && (dispute.resolution || dispute.resolution_notes) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Resolusi Sebelumnya:</p>
                {dispute.resolution && (
                  <p className="text-sm mt-1">
                    Status:{" "}
                    <span className="font-medium capitalize">
                      {dispute.resolution}
                    </span>
                  </p>
                )}
                {dispute.resolution_notes && (
                  <p className="text-sm mt-1">{dispute.resolution_notes}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Error message */}
          {error && canResolve && resolutionAction === null && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {canResolve ? (
            resolutionAction ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setResolutionAction(null)
                    setError(null)
                  }}
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Batal
                </Button>
                {resolutionAction === "resolve_completed" && (
                  <Button
                    onClick={handleResolveCompleted}
                    disabled={loading || !resolutionNotes.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Konfirmasi Selesaikan
                  </Button>
                )}
                {resolutionAction === "resolve_cancelled" && (
                  <Button
                    variant="destructive"
                    onClick={handleResolveCancelled}
                    disabled={loading || !resolutionNotes.trim()}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Konfirmasi Batalkan
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleDismiss}
                  disabled={loading}
                >
                  Tutup
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setResolutionAction("resolve_cancelled")}
                  disabled={loading}
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Batalkan Booking
                </Button>
                <Button
                  onClick={() => setResolutionAction("resolve_completed")}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Selesaikan
                </Button>
              </>
            )
          ) : (
            <Button variant="outline" onClick={handleDismiss} disabled={loading}>
              Tutup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
