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
})

export type JobPostingFormValues = z.infer<typeof jobPostingFormSchema>

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

  const handleSubmit = async (values: JobPostingFormValues) => {
    if (onSubmit) {
      await onSubmit(values)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={cn("space-y-6", className)}>
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
                    {...field}
                  />
                </FormControl>
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
            onClick={() => form.reset()}
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
