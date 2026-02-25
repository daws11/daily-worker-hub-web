"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { FileText, AlertCircle, Award, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

import {
  badgeVerificationRequestSchema,
  type BadgeVerificationRequestInput,
} from "@/lib/schemas/badge"
import { uploadBadgeVerificationDocument } from "@/lib/supabase/storage"
import { requestBadge } from "@/lib/supabase/queries/badges"
import type { Badge } from "@/lib/types/badge"

interface BadgeVerificationFormProps {
  workerId: string
  availableBadges: Badge[]
  onSuccess?: () => void
}

export function BadgeVerificationForm({
  workerId,
  availableBadges,
  onSuccess,
}: BadgeVerificationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [documentFileName, setDocumentFileName] = useState<string | undefined>()
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [isUploadingDocument, setIsUploadingDocument] = useState(false)
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)

  const form = useForm<BadgeVerificationRequestInput>({
    resolver: zodResolver(badgeVerificationRequestSchema),
    mode: "onBlur",
    defaultValues: {
      badge_id: "",
      verification_document_url: "",
      notes: "",
    },
  })

  const {
    formState: { errors, isValid },
  } = form

  // Focus on first error field when form is submitted with errors
  useEffect(() => {
    if (hasSubmitted && Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0] as keyof BadgeVerificationRequestInput
      const fieldElement = document.querySelector(
        `[name="${firstErrorField}"]`
      ) as HTMLElement
      fieldElement?.focus()
    }
  }, [hasSubmitted, errors])

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Clear previous error
    setDocumentError(null)

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if (!allowedTypes.includes(file.type)) {
      const errorMsg = "File harus berupa PDF atau gambar (JPEG, PNG)"
      setDocumentError(errorMsg)
      toast.error(errorMsg)
      return
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      const errorMsg = "Ukuran file maksimal 10MB"
      setDocumentError(errorMsg)
      toast.error(errorMsg)
      return
    }

    setDocumentFile(file)
    setDocumentFileName(file.name)
    toast.success("Dokumen berhasil dipilih")
  }

  const handleBadgeChange = (badgeId: string) => {
    const badge = availableBadges.find((b) => b.id === badgeId)
    setSelectedBadge(badge || null)
    form.setValue("badge_id", badgeId)
  }

  const handleSubmit = async (data: BadgeVerificationRequestInput) => {
    setHasSubmitted(true)
    setSubmitError(null)

    // Sanitize data - convert empty strings to undefined
    const sanitizedData: BadgeVerificationRequestInput = {
      badge_id: data.badge_id,
      verification_document_url: data.verification_document_url?.trim() || "",
      notes: data.notes?.trim() || undefined,
    }

    setIsSubmitting(true)

    try {
      let documentUrl = sanitizedData.verification_document_url

      // Upload verification document if a file was selected
      if (documentFile) {
        setIsUploadingDocument(true)
        try {
          const uploadResult = await uploadBadgeVerificationDocument(
            workerId,
            sanitizedData.badge_id,
            documentFile
          )

          if (uploadResult.error) {
            setDocumentError(uploadResult.error)
            toast.error(`Gagal upload dokumen: ${uploadResult.error}`)
            setIsUploadingDocument(false)
            setIsSubmitting(false)
            return
          }

          documentUrl = uploadResult.url
          setIsUploadingDocument(false)
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Gagal upload dokumen"
          setDocumentError(errorMsg)
          toast.error(errorMsg)
          setIsUploadingDocument(false)
          setIsSubmitting(false)
          return
        }
      }

      // Request the badge
      try {
        await requestBadge(workerId, sanitizedData.badge_id)

        toast.success("Permintaan badge berhasil dikirim")
        form.reset()
        setDocumentFile(null)
        setDocumentFileName(undefined)
        setSelectedBadge(null)
        setHasSubmitted(false)

        if (onSuccess) {
          onSuccess()
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Gagal mengirim permintaan badge"
        setSubmitError(errorMsg)
        toast.error(errorMsg)
        setIsSubmitting(false)
        return
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Terjadi kesalahan tak terduga"
      setSubmitError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter out badges the worker might already have (you can extend this logic)
  const filteredBadges = availableBadges

  // Group badges by category for better UX
  const badgesByCategory = filteredBadges.reduce((acc, badge) => {
    if (!acc[badge.category]) {
      acc[badge.category] = []
    }
    acc[badge.category].push(badge)
    return acc
  }, {} as Record<string, Badge[]>)

  const categoryLabels: Record<string, string> = {
    skill: "Keahlian",
    training: "Pelatihan",
    certification: "Sertifikasi",
    specialization: "Spesialisasi",
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Request Badge
        </CardTitle>
        <CardDescription>
          Pilih badge yang ingin Anda miliki dan upload dokumen verifikasi
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Submit Error Alert */}
        {hasSubmitted && submitError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Form-level validation error summary */}
        {hasSubmitted && Object.keys(errors).length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Mohon perbaiki {Object.keys(errors).length} error pada formulir.
            </AlertDescription>
          </Alert>
        )}

        {/* Selected Badge Info */}
        {selectedBadge && (
          <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/20">
            <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-300">
              <span className="font-medium">{selectedBadge.name}</span>
              {selectedBadge.description && `: ${selectedBadge.description}`}
              {selectedBadge.is_certified && (
                <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                  Certified
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
            noValidate
          >
            {/* Badge Selection */}
            <FormField
              control={form.control}
              name="badge_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pilih Badge *</FormLabel>
                  <Select
                    onValueChange={handleBadgeChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger
                        aria-invalid={hasSubmitted && !!errors.badge_id}
                      >
                        <SelectValue placeholder="Pilih badge yang ingin diminta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(badgesByCategory).map(([category, badges]) => (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                            {categoryLabels[category] || category}
                          </div>
                          {badges.map((badge) => (
                            <SelectItem key={badge.id} value={badge.id}>
                              <div className="flex items-center gap-2">
                                <span>{badge.name}</span>
                                {badge.is_certified && (
                                  <span className="text-xs text-muted-foreground">
                                    (Certified)
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Pilih badge yang sesuai dengan keahlian atau sertifikasi yang Anda miliki
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Verification Document Upload */}
            <div className="space-y-2">
              <Label htmlFor="document-upload">
                Dokumen Verifikasi {selectedBadge?.is_certified && "*"}
              </Label>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="document-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  {documentFileName ? "Ganti File" : "Upload Dokumen"}
                </Label>
                <Input
                  id="document-upload"
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/jpg"
                  onChange={handleDocumentChange}
                  className="hidden"
                  disabled={isSubmitting || isUploadingDocument}
                />
                {documentFileName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDocumentFile(null)
                      setDocumentFileName(undefined)
                      setDocumentError(null)
                    }}
                    disabled={isSubmitting || isUploadingDocument}
                  >
                    Hapus
                  </Button>
                )}
              </div>
              {isUploadingDocument && (
                <p className="text-xs text-muted-foreground animate-pulse">
                  Mengupload dokumen...
                </p>
              )}
              {documentError && (
                <p className="text-xs text-destructive">{documentError}</p>
              )}
              {documentFileName && (
                <p className="text-sm text-muted-foreground">
                  {documentFileName}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Format: PDF, JPG, PNG. Maksimal 10MB.
                {selectedBadge?.is_certified ? " Wajib untuk badge certified." : " Opsional."}
              </p>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y"
                      placeholder="Tambahkan catatan atau penjelasan tentang badge yang Anda minta..."
                      {...field}
                      disabled={isSubmitting}
                      aria-invalid={hasSubmitted && !!errors.notes}
                    />
                  </FormControl>
                  <FormDescription>
                    Jelaskan pengalaman atau kualifikasi Anda terkait badge ini (opsional, max 1000 karakter)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset()
                  setHasSubmitted(false)
                  setSubmitError(null)
                  setDocumentError(null)
                  setDocumentFile(null)
                  setDocumentFileName(undefined)
                  setSelectedBadge(null)
                }}
                disabled={isSubmitting}
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isUploadingDocument}
              >
                {isSubmitting || isUploadingDocument
                  ? "Mengirim..."
                  : "Kirim Permintaan"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
