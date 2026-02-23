"use client"

import * as React from "react"
import Image from "next/image"
import { Check, X, FileText, User, Calendar, AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { KycStatusBadge } from "@/components/worker/kyc-status-badge"
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
import type { KYCVerificationItem } from "@/lib/types/admin"
import { processKYCVerification } from "@/lib/supabase/queries/admin"
import { toast } from "sonner"

interface KycReviewDialogProps {
  kyc: KYCVerificationItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
  adminId?: string
}

export function KycReviewDialog({
  kyc,
  open,
  onOpenChange,
  onUpdate,
  adminId,
}: KycReviewDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [rejectMode, setRejectMode] = React.useState(false)
  const [rejectionReason, setRejectionReason] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setRejectMode(false)
      setRejectionReason("")
      setError(null)
    }
  }, [open])

  const handleApprove = async () => {
    if (!kyc || !adminId) {
      setError("Admin ID is required for approval")
      return
    }

    setLoading(true)
    setError(null)

    const { error: verifyError } = await processKYCVerification({
      kyc_id: kyc.id,
      action: "approve",
      admin_id: adminId,
    })

    if (verifyError) {
      setError(verifyError)
      toast.error("Gagal menyetujui KYC: " + verifyError)
    } else {
      toast.success("KYC berhasil disetujui")
      onOpenChange(false)
      onUpdate?.()
    }

    setLoading(false)
  }

  const handleReject = async () => {
    if (!kyc || !adminId) {
      setError("Admin ID is required for rejection")
      return
    }

    if (!rejectionReason.trim()) {
      setError("Alasan penolakan harus diisi")
      return
    }

    setLoading(true)
    setError(null)

    const { error: verifyError } = await processKYCVerification({
      kyc_id: kyc.id,
      action: "reject",
      rejection_reason: rejectionReason,
      admin_id: adminId,
    })

    if (verifyError) {
      setError(verifyError)
      toast.error("Gagal menolak KYC: " + verifyError)
    } else {
      toast.success("KYC berhasil ditolak")
      onOpenChange(false)
      onUpdate?.()
    }

    setLoading(false)
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

  if (!kyc) {
    return null
  }

  const isPending = kyc.status === "pending"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Review Verifikasi KYC</DialogTitle>
              <DialogDescription className="mt-2">
                Review dokumen KYC untuk verifikasi identitas worker
              </DialogDescription>
            </div>
            <KycStatusBadge status={kyc.status} />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Worker Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Informasi Worker
            </h3>
            <div className="rounded-lg border bg-muted/20 p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Nama:</span>
                <span className="font-medium">{kyc.worker?.full_name || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{kyc.user?.email || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Nomor KTP:</span>
                <span className="font-medium font-mono">{kyc.ktp_number || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Submitted:
                </span>
                <span className="font-medium">{formatDate(kyc.submittedAt)}</span>
              </div>
              {isPending && kyc.pendingDays > 0 && (
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-500">
                  <span>Menunggu:</span>
                  <span className="font-medium">{kyc.pendingDays} hari</span>
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Dokumen KYC
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* KTP Image */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Foto KTP</p>
                {kyc.ktp_image_url ? (
                  <div className="relative aspect-[3/2] rounded-lg border bg-muted overflow-hidden">
                    <Image
                      src={kyc.ktp_image_url}
                      alt="Foto KTP"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/2] rounded-lg border border-dashed flex items-center justify-center text-muted-foreground text-sm">
                    Tidak ada foto KTP
                  </div>
                )}
              </div>

              {/* Selfie Image */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Foto Selfie</p>
                {kyc.selfie_image_url ? (
                  <div className="relative aspect-[3/2] rounded-lg border bg-muted overflow-hidden">
                    <Image
                      src={kyc.selfie_image_url}
                      alt="Foto Selfie"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/2] rounded-lg border border-dashed flex items-center justify-center text-muted-foreground text-sm">
                    Tidak ada foto selfie
                  </div>
                )}
              </div>
            </div>

            {/* Open in new tab links */}
            {(kyc.ktp_image_url || kyc.selfie_image_url) && (
              <div className="flex flex-wrap gap-2">
                {kyc.ktp_image_url && (
                  <a
                    href={kyc.ktp_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Buka KTP di tab baru
                  </a>
                )}
                {kyc.selfie_image_url && (
                  <a
                    href={kyc.selfie_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Buka Selfie di tab baru
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Previous rejection reason */}
          {kyc.status === "rejected" && kyc.rejection_reason && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Alasan Penolakan Sebelumnya:</p>
                <p className="text-sm mt-1">{kyc.rejection_reason}</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Rejection reason input */}
          {isPending && rejectMode && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Alasan Penolakan</label>
              <Textarea
                placeholder="Jelaskan alasan penolakan untuk membantu worker memperbaiki permohonan mereka..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className={cn(!rejectionReason.trim() && error && "border-destructive")}
              />
              {!rejectionReason.trim() && error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          )}

          {/* Error message */}
          {error && !rejectMode && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isPending ? (
            rejectMode ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectMode(false)
                    setRejectionReason("")
                    setError(null)
                  }}
                  disabled={loading}
                >
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={loading || !rejectionReason.trim()}
                >
                  <X className="h-4 w-4 mr-1" />
                  Konfirmasi Penolakan
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Tutup
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRejectMode(true)}
                  disabled={loading}
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Tolak
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Setujui
                </Button>
              </>
            )
          ) : (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Tutup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
