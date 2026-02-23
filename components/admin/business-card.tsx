"use client"

import * as React from "react"
import { Building2, MapPin, Phone, Mail, Globe, Check, X, FileText } from "lucide-react"

import { cn } from "@/lib/utils"
import { VerificationBadge } from "@/components/business/verification-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { BusinessVerificationItem } from "@/lib/types/admin"
import { processBusinessVerification } from "@/lib/supabase/queries/admin"

interface BusinessCardProps extends React.HTMLAttributes<HTMLDivElement> {
  business: BusinessVerificationItem
  onUpdate?: () => void
}

function BusinessCard({ business, className, onUpdate, ...props }: BusinessCardProps) {
  const [loading, setLoading] = React.useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false)
  const [rejectionReason, setRejectionReason] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  const handleApprove = async () => {
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    const { data, error: verifyError } = await processBusinessVerification({
      business_id: business.id,
      action: "approve",
      admin_id: business.user_id,
    })

    if (verifyError) {
      setError(verifyError)
    } else {
      setSuccessMessage("Business approved successfully")
      setTimeout(() => {
        setSuccessMessage(null)
        onUpdate?.()
      }, 1500)
    }

    setLoading(false)
  }

  const handleReject = async () => {
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    const { data, error: verifyError } = await processBusinessVerification({
      business_id: business.id,
      action: "reject",
      reason: rejectionReason,
      admin_id: business.user_id,
    })

    if (verifyError) {
      setError(verifyError)
    } else {
      setSuccessMessage("Business rejected")
      setRejectDialogOpen(false)
      setRejectionReason("")
      setTimeout(() => {
        setSuccessMessage(null)
        onUpdate?.()
      }, 1500)
    }

    setLoading(false)
  }

  const formatDate = React.useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }, [])

  const getBusinessTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      hotel: "Hotel",
      villa: "Villa",
      restaurant: "Restoran",
      event_company: "Event Organizer",
      other: "Lainnya",
    }
    return labels[type] || type
  }

  return (
    <>
      <Card className={cn("overflow-hidden", className)} {...props}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">{business.name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                {getBusinessTypeLabel(business.business_type)}
              </CardDescription>
            </div>
            <VerificationBadge status={business.verification_status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Area:</span>
              <span className="font-medium">{business.area}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Alamat:</span>
              <span className="text-sm">{business.address}</span>
            </div>
          </div>

          {(business.phone || business.email) && (
            <div className="flex flex-wrap gap-4">
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {business.phone}
                </a>
              )}
              {business.email && (
                <a
                  href={`mailto:${business.email}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {business.email}
                </a>
              )}
              {business.website && (
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Website
                </a>
              )}
            </div>
          )}

          {business.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {business.description}
            </p>
          )}

          {business.business_license_url && (
            <a
              href={business.business_license_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <FileText className="h-3.5 w-3.5" />
              Lihat Lisensi Bisnis
            </a>
          )}

          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pemilik:</span>
              <span className="font-medium">{business.user?.full_name || "-"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Email pemilik:</span>
              <span className="font-medium">{business.user?.email || "-"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Didaftarkan:</span>
              <span className="font-medium">{formatDate(business.created_at)}</span>
            </div>
            {business.verification_status === "pending" && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Menunggu:</span>
                <span className="font-medium">{business.pendingDays} hari</span>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              {successMessage}
            </div>
          )}

          {business.verification_status === "pending" && (
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1"
                size="sm"
              >
                <Check className="h-4 w-4 mr-1" />
                Setujui
              </Button>
              <Button
                onClick={() => setRejectDialogOpen(true)}
                disabled={loading}
                variant="destructive"
                className="flex-1"
                size="sm"
              >
                <X className="h-4 w-4 mr-1" />
                Tolak
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Verifikasi Bisnis</DialogTitle>
            <DialogDescription>
              Sertakan alasan penolakan untuk membantu pemilik bisnis memperbaiki permohonan mereka.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Jelaskan alasan penolakan..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false)
                setRejectionReason("")
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
              Tolak Bisnis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export { BusinessCard }
