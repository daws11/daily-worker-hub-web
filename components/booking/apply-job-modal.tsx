"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import type { JobWithRelations } from "@/lib/types/job"
import { createJobApplication } from "@/lib/actions/job-applications"

// Form schema
const applyJobFormSchema = (budgetMin: number, budgetMax: number) => ({
  coverLetter: {
    type: "string",
    optional: true,
  },
  proposedWage: {
    type: "number",
    optional: true,
    min: budgetMin,
    max: budgetMax,
  },
})

export type ApplyJobFormValues = {
  coverLetter?: string
  proposedWage?: number
}

export interface ApplyJobModalProps {
  job: JobWithRelations | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  workerId?: string
}

export function ApplyJobModal({
  job,
  open,
  onOpenChange,
  onSuccess,
  workerId,
}: ApplyJobModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<ApplyJobFormValues>({
    defaultValues: {
      coverLetter: "",
      proposedWage: undefined,
    },
  })

  const handleSubmit = async (values: ApplyJobFormValues) => {
    if (!job) return

    if (!workerId) {
      toast.error("Gagal mendapatkan data pekerja. Silakan login ulang.")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createJobApplication(job.id, workerId, {
        coverLetter: values.coverLetter || undefined,
        proposedWage: values.proposedWage || undefined,
        availability: [],
      })

      if (result.success) {
        toast.success("Berhasil melamar pekerjaan! Bisnis akan menghubungi Anda jika tertarik.")
        form.reset()
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || "Gagal melamar pekerjaan. Silakan coba lagi.")
      }
    } catch (error) {
      console.error("Error applying for job:", error)
      toast.error("Terjadi kesalahan saat melamar pekerjaan. Silakan coba lagi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Lamar Pekerjaan</DialogTitle>
          <DialogDescription>
            {job ? (
              <>
                Anda akan melamar untuk posisi <strong>{job.title}</strong> di <strong>{job.business.name}</strong>
              </>
            ) : (
              "Lamar pekerjaan yang tersedia"
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Job Information */}
            {job && (
              <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{job.title}</h4>
                    <p className="text-sm text-muted-foreground">{job.business.name}</p>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Gaji:</span>{" "}
                  {job.budget_min === job.budget_max
                    ? formatBudget(job.budget_min)
                    : `${formatBudget(job.budget_min)} - ${formatBudget(job.budget_max)}`}
                </div>
              </div>
            )}

            {/* Proposed Wage (Optional) */}
            <FormField
              control={form.control}
              name="proposedWage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gaji yang Diinginkan (Opsional)</FormLabel>
                  <FormDescription>
                    {job
                      ? `Masukkan gaji yang Anda inginkan dalam rentang ${formatBudget(job.budget_min)} - ${formatBudget(job.budget_max)}`
                      : "Masukkan gaji yang Anda inginkan"}
                  </FormDescription>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      min={job?.budget_min}
                      max={job?.budget_max}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cover Letter (Optional) */}
            <FormField
              control={form.control}
              name="coverLetter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Letter (Opsional)</FormLabel>
                  <FormDescription>
                    Jelaskan mengapa Anda cocok untuk pekerjaan ini
                  </FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder="Saya memiliki pengalaman..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  "Kirim Lamaran"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
