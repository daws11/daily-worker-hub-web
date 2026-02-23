"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Star, MessageSquare, AlertCircle } from "lucide-react"

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ReviewRatingInput } from "./review-rating-input"

import {
  createReviewSchema,
  type CreateReviewInput,
  type ReviewerType,
} from "@/lib/schemas/review"
import { createReview } from "@/lib/supabase/queries/reviews"

interface ReviewFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  workerId: string
  businessId?: string
  reviewer: ReviewerType
  targetName: string
  onSuccess?: () => void
}

export function ReviewFormDialog({
  open,
  onOpenChange,
  bookingId,
  workerId,
  businessId,
  reviewer,
  targetName,
  onSuccess,
}: ReviewFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [ratingValue, setRatingValue] = useState(0)

  const isBusinessReview = reviewer === "business"

  const form = useForm<CreateReviewInput>({
    resolver: zodResolver(createReviewSchema),
    mode: "onBlur",
    defaultValues: {
      booking_id: bookingId,
      worker_id: workerId,
      business_id: businessId,
      reviewer: reviewer,
      rating: 0,
      comment: "",
      would_rehire: isBusinessReview ? false : undefined,
    },
  })

  const {
    formState: { errors, isValid },
  } = form

  const handleRatingChange = (rating: number) => {
    setRatingValue(rating)
    form.setValue("rating", rating, { shouldValidate: true })
  }

  const handleSubmit = async (data: CreateReviewInput) => {
    setHasSubmitted(true)
    setSubmitError(null)

    // Ensure rating is set from our state
    const formData = {
      ...data,
      rating: ratingValue,
    }

    // Validate rating is provided
    if (formData.rating === 0) {
      form.setError("rating", {
        type: "manual",
        message: "Rating harus dipilih",
      })
      return
    }

    // Sanitize optional fields - convert empty strings to undefined
    const sanitizedData: CreateReviewInput = {
      ...formData,
      comment: formData.comment?.trim() || undefined,
      would_rehire: isBusinessReview ? formData.would_rehire : undefined,
    }

    setIsSubmitting(true)

    try {
      const result = await createReview({
        booking_id: sanitizedData.booking_id,
        worker_id: sanitizedData.worker_id,
        business_id: sanitizedData.business_id,
        reviewer: sanitizedData.reviewer,
        rating: sanitizedData.rating,
        comment: sanitizedData.comment,
        would_rehire: sanitizedData.would_rehire,
      })

      if (result.error) {
        setSubmitError(result.error.message || "Gagal menyimpan ulasan")
        toast.error(result.error.message || "Gagal menyimpan ulasan")
        setIsSubmitting(false)
        return
      }

      toast.success("Ulasan berhasil disimpan")
      onOpenChange(false)

      // Reset form after successful submission
      form.reset()
      setRatingValue(0)
      setHasSubmitted(false)
      setSubmitError(null)

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Terjadi kesalahan tak terduga"
      setSubmitError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      // Reset form when dialog closes
      form.reset()
      setRatingValue(0)
      setHasSubmitted(false)
      setSubmitError(null)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            {isBusinessReview
              ? `Beri Ulasan untuk ${targetName}`
              : `Beri Ulasan untuk ${targetName}`}
          </DialogTitle>
          <DialogDescription>
            {isBusinessReview
              ? "Bagikan pengalaman Anda dengan pekerja ini"
              : "Bagikan pengalaman Anda dengan bisnis ini"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
            noValidate
          >
            {/* Submit Error Alert */}
            {hasSubmitted && submitError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* Form-level validation error summary */}
            {hasSubmitted && Object.keys(errors).length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Mohon perbaiki {Object.keys(errors).length} error pada formulir.
                </AlertDescription>
              </Alert>
            )}

            {/* Rating Field */}
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating *</FormLabel>
                  <FormControl>
                    <ReviewRatingInput
                      value={ratingValue}
                      onChange={handleRatingChange}
                      disabled={isSubmitting}
                      aria-label="Pilih rating"
                    />
                  </FormControl>
                  <FormDescription>
                    Pilih rating dari 1 sampai 5 bintang
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Comment Field */}
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Komentar
                  </FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y"
                      placeholder={
                        isBusinessReview
                          ? "Ceritakan tentang kinerja pekerja ini..."
                          : "Ceritakan tentang pengalaman Anda dengan bisnis ini..."
                      }
                      maxLength={1000}
                      {...field}
                      disabled={isSubmitting}
                      aria-invalid={hasSubmitted && !!errors.comment}
                    />
                  </FormControl>
                  <FormDescription>
                    {isBusinessReview
                      ? "Komentar opsional tentang kinerja, sikap, dan kualitas kerja (maksimal 1000 karakter)"
                      : "Komentar opsional tentang pengalaman Anda (maksimal 1000 karakter)"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Would Rehire Checkbox - Business Only */}
            {isBusinessReview && (
              <FormField
                control={form.control}
                name="would_rehire"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="h-4 w-4 mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={field.value ?? false}
                        onChange={(e) => field.onChange(e.target.checked)}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Bersedia mempekerjakan kembali pekerja ini
                      </FormLabel>
                      <FormDescription>
                        Centang jika Anda puas dengan kinerja pekerja dan bersedia
                        mempekerjakan mereka lagi di masa depan
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || ratingValue === 0}
              >
                {isSubmitting ? "Menyimpan..." : "Kirim Ulasan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
