"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Calendar, Clock, Plus, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { JobWithRelations } from "@/lib/types/job";
import { createJobApplication } from "@/lib/actions/job-applications";

// ============================================================================
// AVAILABILITY TYPES
// ============================================================================

export interface AvailabilitySlot {
  day: string;
  startTime: string;
  endTime: string;
}

const DAYS_OF_WEEK = [
  { value: "monday", label: "Senin" },
  { value: "tuesday", label: "Selasa" },
  { value: "wednesday", label: "Rabu" },
  { value: "thursday", label: "Kamis" },
  { value: "friday", label: "Jumat" },
  { value: "saturday", label: "Sabtu" },
  { value: "sunday", label: "Minggu" },
];

const TIME_SLOTS = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

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
});

export type ApplyJobFormValues = {
  coverLetter?: string;
  proposedWage?: number;
  availability?: AvailabilitySlot[];
};

export interface ApplyJobModalProps {
  job: JobWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  workerId?: string;
}

// ============================================================================
// AVAILABILITY SELECTOR COMPONENT
// ============================================================================

interface AvailabilitySelectorProps {
  value: AvailabilitySlot[];
  onChange: (slots: AvailabilitySlot[]) => void;
  disabled?: boolean;
}

function AvailabilitySelector({
  value,
  onChange,
  disabled,
}: AvailabilitySelectorProps) {
  const [newSlot, setNewSlot] = React.useState<Partial<AvailabilitySlot>>({
    day: "monday",
    startTime: "08:00",
    endTime: "17:00",
  });

  const addSlot = () => {
    if (newSlot.day && newSlot.startTime && newSlot.endTime) {
      // Check for duplicate
      const isDuplicate = value.some(
        (slot) =>
          slot.day === newSlot.day &&
          slot.startTime === newSlot.startTime &&
          slot.endTime === newSlot.endTime,
      );

      if (isDuplicate) {
        toast.error("Slot waktu ini sudah ditambahkan");
        return;
      }

      // Validate end time is after start time
      if (newSlot.startTime >= newSlot.endTime) {
        toast.error("Waktu selesai harus lebih dari waktu mulai");
        return;
      }

      onChange([...value, newSlot as AvailabilitySlot]);
    }
  };

  const removeSlot = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const getDayLabel = (day: string) => {
    return DAYS_OF_WEEK.find((d) => d.value === day)?.label || day;
  };

  return (
    <div className="space-y-3">
      {/* Existing slots */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((slot, index) => (
            <Badge
              key={`${slot.day}-${slot.startTime}-${index}`}
              variant="secondary"
              className="flex items-center gap-2 pr-1"
            >
              <span>
                {getDayLabel(slot.day)}: {slot.startTime} - {slot.endTime}
              </span>
              <button
                type="button"
                onClick={() => removeSlot(index)}
                disabled={disabled}
                className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add new slot */}
      <div className="grid grid-cols-3 gap-2">
        <Select
          value={newSlot.day || ""}
          onValueChange={(val) => setNewSlot((prev) => ({ ...prev, day: val || "" }))}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Hari" />
          </SelectTrigger>
          <SelectContent>
            {DAYS_OF_WEEK.map((day) => (
              <SelectItem key={day.value} value={day.value}>
                {day.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={newSlot.startTime || ""}
          onValueChange={(val) =>
            setNewSlot((prev) => ({ ...prev, startTime: val || "" }))
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Mulai" />
          </SelectTrigger>
          <SelectContent>
            {TIME_SLOTS.map((time) => (
              <SelectItem key={time} value={time}>
                {time}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={newSlot.endTime || ""}
          onValueChange={(val) =>
            setNewSlot((prev) => ({ ...prev, endTime: val || "" }))
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selesai" />
          </SelectTrigger>
          <SelectContent>
            {TIME_SLOTS.map((time) => (
              <SelectItem key={time} value={time}>
                {time}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addSlot}
        disabled={disabled}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Tambah Waktu Ketersediaan
      </Button>
    </div>
  );
}

// ============================================================================
// MAIN MODAL COMPONENT
// ============================================================================

export function ApplyJobModal({
  job,
  open,
  onOpenChange,
  onSuccess,
  workerId,
}: ApplyJobModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [availability, setAvailability] = React.useState<AvailabilitySlot[]>(
    [],
  );

  const form = useForm<ApplyJobFormValues>({
    defaultValues: {
      coverLetter: "",
      proposedWage: undefined,
      availability: [],
    },
  });

  // Reset availability when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setAvailability([]);
    }
  }, [open]);

  const handleSubmit = async (values: ApplyJobFormValues) => {
    if (!job) return;

    if (!workerId) {
      toast.error("Gagal mendapatkan data pekerja. Silakan login ulang.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createJobApplication(job.id, workerId, {
        coverLetter: values.coverLetter || undefined,
        proposedWage: values.proposedWage || undefined,
        availability: availability,
      });

      if (result.success) {
        toast.success(
          "Berhasil melamar pekerjaan! Bisnis akan menghubungi Anda jika tertarik.",
        );
        form.reset();
        setAvailability([]);
        // Close modal first, then call success callback
        onOpenChange(false);
        // Delay success callback to allow modal to close first
        setTimeout(() => {
          onSuccess?.();
        }, 100);
      } else {
        toast.error(
          result.error || "Gagal melamar pekerjaan. Silakan coba lagi.",
        );
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error applying for job:", error);
      toast.error(
        "Terjadi kesalahan saat melamar pekerjaan. Silakan coba lagi.",
      );
      setIsSubmitting(false);
    }
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Lamar Pekerjaan</DialogTitle>
          <DialogDescription>
            {job ? (
              <>
                Anda akan melamar untuk posisi <strong>{job.title}</strong> di{" "}
                <strong>{job.business?.name || "Business"}</strong>
              </>
            ) : (
              "Lamar pekerjaan yang tersedia"
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Job Information */}
            {job && (
              <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{job.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {job.business?.name || "Business"}
                    </p>
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
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
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

            {/* Availability Selector (Optional) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Ketersediaan Waktu (Opsional)
              </Label>
              <p className="text-sm text-muted-foreground">
                Tambahkan waktu ketersediaan Anda untuk bekerja
              </p>
              <AvailabilitySelector
                value={availability}
                onChange={setAvailability}
                disabled={isSubmitting}
              />
            </div>

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
  );
}
