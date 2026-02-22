"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { cn } from "@/lib/utils"
import { PositionTypeSelect, type PositionType } from "@/app/components/position-type-select"
import { AreaSelect, type AreaValue } from "@/app/components/area-select"
import { WageRateInput } from "@/app/components/wage-rate-input"
import { WorkersNeededCounter } from "@/app/components/workers-needed-counter"
import { JobRequirementsSelect, type JobRequirement } from "@/app/components/job-requirements-select"
import { JobDraftBanner } from "@/app/components/job-draft-banner"

// Zod schema for job posting form validation
export const jobPostingFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be at most 100 characters"),
  positionType: z.enum([
    "housekeeping",
    "kitchen_staff",
    "driver",
    "server",
    "bartender",
    "receptionist",
    "concierge",
    "security",
    "maintenance",
    "laundry_attendant",
    "pool_attendant",
    "spa_staff",
    "event_staff",
    "gardener",
    "other",
  ], {
    required_error: "Please select a position type",
  }),
  date: z.string().min(1, "Please select a date"),
  startTime: z.string().min(1, "Please select a start time"),
  endTime: z.string().min(1, "Please select an end time"),
  area: z.string().min(1, "Please select an area"),
  address: z.string().min(10, "Address must be at least 10 characters").max(200, "Address must be at most 200 characters"),
  wageMin: z.number().min(1, "Minimum wage must be at least 1"),
  wageMax: z.number().min(1, "Maximum wage must be at least 1"),
  workersNeeded: z.number().min(1, "At least 1 worker is required").max(100, "Maximum 100 workers allowed"),
  requirements: z.array(z.string()).min(1, "Please select at least one requirement"),
  description: z.string().min(20, "Description must be at least 20 characters").max(1000, "Description must be at most 1000 characters"),
}).refine((data) => data.wageMin <= data.wageMax, {
  message: "Minimum wage cannot be greater than maximum wage",
  path: ["wageMin"],
}).refine((data) => {
  if (!data.date) return true
  const selectedDate = new Date(data.date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return selectedDate >= today
}, {
  message: "Date cannot be in the past",
  path: ["date"],
}).refine((data) => {
  if (!data.startTime || !data.endTime) return true
  return data.startTime < data.endTime
}, {
  message: "End time must be after start time",
  path: ["endTime"],
})

export type JobPostingFormValues = z.infer<typeof jobPostingFormSchema>

// LocalStorage key for draft data
const DRAFT_STORAGE_KEY = "job-posting-form-draft"

// Helper functions for localStorage operations
const saveDraft = (data: JobPostingFormValues) => {
  try {
    if (typeof window === "undefined") return
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }))
  } catch (error) {
    // Silently fail if localStorage is not available
  }
}

const loadDraft = (): { data: JobPostingFormValues; timestamp: number } | null => {
  try {
    if (typeof window === "undefined") return null
    const draft = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!draft) return null
    return JSON.parse(draft)
  } catch (error) {
    // Return null if localStorage is not available or data is corrupted
    return null
  }
}

const clearDraft = () => {
  try {
    if (typeof window === "undefined") return
    localStorage.removeItem(DRAFT_STORAGE_KEY)
  } catch (error) {
    // Silently fail if localStorage is not available
  }
}

export interface JobPostingFormProps {
  onSubmit?: (values: JobPostingFormValues) => void | Promise<void>
  defaultValues?: Partial<JobPostingFormValues>
  isLoading?: boolean
  disabled?: boolean
  submitButtonText?: string
  className?: string
}

export function JobPostingForm({
  onSubmit,
  defaultValues,
  isLoading = false,
  disabled = false,
  submitButtonText = "Post Job",
  className,
}: JobPostingFormProps) {
  const [draftTimestamp, setDraftTimestamp] = React.useState<number | undefined>(undefined)

  const form = useForm<JobPostingFormValues>({
    resolver: zodResolver(jobPostingFormSchema),
    defaultValues: {
      title: "",
      positionType: undefined,
      date: "",
      startTime: "",
      endTime: "",
      area: "",
      address: "",
      wageMin: 0,
      wageMax: 0,
      workersNeeded: 1,
      requirements: [],
      description: "",
      ...defaultValues,
    },
  })

  const positionType = form.watch("positionType")
  const area = form.watch("area")

  // Check for draft on mount (without auto-restoring)
  React.useEffect(() => {
    const draft = loadDraft()
    if (draft) {
      setDraftTimestamp(draft.timestamp)
    }
  }, [])

  // Auto-save form data to localStorage on changes
  React.useEffect(() => {
    const subscription = form.watch((value) => {
      const formValues = form.getValues()
      // Only save if form has any meaningful data
      const hasData = Object.values(formValues).some(v =>
        v !== undefined && v !== null && v !== "" && (Array.isArray(v) ? v.length > 0 : true)
      )
      if (hasData) {
        saveDraft(formValues as JobPostingFormValues)
        setDraftTimestamp(Date.now())
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  const handleRestoreDraft = () => {
    const draft = loadDraft()
    if (draft) {
      form.reset(draft.data)
    }
  }

  const handleDiscardDraft = () => {
    clearDraft()
    setDraftTimestamp(undefined)
  }

  const handleSubmit = async (values: JobPostingFormValues) => {
    if (onSubmit) {
      await onSubmit(values)
      clearDraft()
      setDraftTimestamp(undefined)
    }
  }

  const handleReset = () => {
    form.reset()
    clearDraft()
    setDraftTimestamp(undefined)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={cn("space-y-6", className)}>
        {/* Draft Banner */}
        {draftTimestamp !== undefined && (
          <JobDraftBanner
            timestamp={draftTimestamp}
            onRestore={handleRestoreDraft}
            onDiscard={handleDiscardDraft}
          />
        )}

        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Housekeeping Staff for Hotel"
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A clear title helps workers understand the job quickly.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Position Type */}
        <FormField
          control={form.control}
          name="positionType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Position Type</FormLabel>
              <FormControl>
                <PositionTypeSelect
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                  required
                />
              </FormControl>
              <FormDescription>
                Select the type of position you are hiring for.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date and Time */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    disabled={disabled}
                    min={new Date().toISOString().split('T')[0]}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Select the date when the job is scheduled.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    disabled={disabled}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    disabled={disabled}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Area */}
        <FormField
          control={form.control}
          name="area"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Area</FormLabel>
              <FormControl>
                <AreaSelect
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                  required
                />
              </FormControl>
              <FormDescription>
                Select the area where the job is located.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Address */}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Jl. Raya Kuta No. 123, Kuta, Bali"
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide the full address where the work will take place.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Wage Rate */}
        <FormField
          control={form.control}
          name="wageMin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wage Rate (IDR/hour)</FormLabel>
              <FormControl>
                <WageRateInput
                  minWage={field.value}
                  onMinWageChange={(value) => field.onChange(value)}
                  maxWage={form.watch("wageMax")}
                  onMaxWageChange={(value) => form.setValue("wageMax", value)}
                  positionType={positionType}
                  area={area}
                  disabled={disabled}
                  required
                />
              </FormControl>
              <FormDescription>
                Set the hourly wage range. Use Rate Bali for UMK-compliant wages.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Workers Needed */}
        <FormField
          control={form.control}
          name="workersNeeded"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workers Needed</FormLabel>
              <FormControl>
                <WorkersNeededCounter
                  value={field.value}
                  onChange={field.onChange}
                  min={1}
                  max={100}
                  disabled={disabled}
                  required
                />
              </FormControl>
              <FormDescription>
                How many workers do you need for this job?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Requirements */}
        <FormField
          control={form.control}
          name="requirements"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Requirements</FormLabel>
              <FormControl>
                <JobRequirementsSelect
                  value={field.value as JobRequirement[]}
                  onChange={field.onChange}
                  disabled={disabled}
                  required
                />
              </FormControl>
              <FormDescription>
                Select any requirements for this position.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Description</FormLabel>
              <FormControl>
                <textarea
                  placeholder="Describe the job responsibilities, working conditions, and any other relevant details..."
                  disabled={disabled}
                  className={cn(
                    "flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                    form.formState.errors.description && "border-destructive"
                  )}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide detailed information about the job to help workers understand what to expect.
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
            onClick={handleReset}
            disabled={disabled || isLoading}
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={disabled || isLoading}
          >
            {isLoading ? "Submitting..." : submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  )
}
