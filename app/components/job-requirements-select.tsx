"use client"

import * as React from "react"
import { X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type JobRequirement =
  | "experience_required"
  | "english_fluent"
  | "indonesian_fluent"
  | "drivers_license"
  | "swimming_certified"
  | "food_safety_cert"
  | "first_aid_cert"
  | "flexible_schedule"
  | "weekend_availability"
  | "physical_stamina"
  | "customer_service_skills"
  | "team_player"
  | "reliable_transportation"
  | "able_to_stand_long_hours"
  | "able_to_lift_heavy"

const REQUIREMENT_LABELS: Record<JobRequirement, string> = {
  experience_required: "Experience Required",
  english_fluent: "Fluent English",
  indonesian_fluent: "Fluent Indonesian",
  drivers_license: "Driver's License",
  swimming_certified: "Swimming Certified",
  food_safety_cert: "Food Safety Certificate",
  first_aid_cert: "First Aid Certificate",
  flexible_schedule: "Flexible Schedule",
  weekend_availability: "Weekend Availability",
  physical_stamina: "Physical Stamina",
  customer_service_skills: "Customer Service Skills",
  team_player: "Team Player",
  reliable_transportation: "Reliable Transportation",
  able_to_stand_long_hours: "Able to Stand Long Hours",
  able_to_lift_heavy: "Able to Lift Heavy Items",
}

const REQUIREMENT_CATEGORIES: Record<string, JobRequirement[]> = {
  "Language & Communication": ["english_fluent", "indonesian_fluent", "customer_service_skills"],
  "Certifications": ["swimming_certified", "food_safety_cert", "first_aid_cert", "drivers_license"],
  "Availability": ["flexible_schedule", "weekend_availability"],
  "Physical Requirements": ["physical_stamina", "able_to_stand_long_hours", "able_to_lift_heavy"],
  "Soft Skills": ["team_player", "reliable_transportation"],
}

export interface JobRequirementsSelectProps {
  value?: JobRequirement[]
  onChange?: (value: JobRequirement[]) => void
  error?: string
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export const JobRequirementsSelect = React.forwardRef<
  HTMLButtonElement,
  JobRequirementsSelectProps
>(
  (
    {
      value = [],
      onChange,
      error,
      label = "Job Requirements",
      placeholder = "Select requirements",
      disabled = false,
      required = false,
      className,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const [tempSelection, setTempSelection] = React.useState<JobRequirement[]>(value)

    const handleToggleRequirement = (requirement: JobRequirement) => {
      setTempSelection((prev) => {
        if (prev.includes(requirement)) {
          return prev.filter((r) => r !== requirement)
        }
        return [...prev, requirement]
      })
    }

    const handleSave = () => {
      onChange?.(tempSelection)
      setOpen(false)
    }

    const handleCancel = () => {
      setTempSelection(value)
      setOpen(false)
    }

    const handleRemove = (requirement: JobRequirement) => {
      onChange?.(value.filter((r) => r !== requirement))
    }

    const selectedCount = value.length

    return (
      <div className={cn("space-y-2", className)}>
        {label && (
          <Label className={cn(error && "text-destructive")}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              ref={ref}
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start text-left font-normal",
                !value || value.length === 0 ? "text-muted-foreground" : "",
                error && "border-destructive"
              )}
              {...props}
            >
              {selectedCount > 0 ? (
                <span className="truncate">
                  {selectedCount} requirement{selectedCount !== 1 ? "s" : ""} selected
                </span>
              ) : (
                placeholder
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Select Job Requirements</DialogTitle>
              <DialogDescription>
                Choose the requirements for this position. Selected requirements will appear as
                badges.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {Object.entries(REQUIREMENT_CATEGORIES).map(([category, requirements]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">{category}</h4>
                  <div className="space-y-1">
                    {requirements.map((requirement) => {
                      const isSelected = tempSelection.includes(requirement)
                      return (
                        <button
                          key={requirement}
                          type="button"
                          onClick={() => handleToggleRequirement(requirement)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-input bg-background"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input"
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <span className="flex-1 text-left">
                            {REQUIREMENT_LABELS[requirement]}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave}>
                Save Selection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {value.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {value.map((requirement) => (
              <Badge
                key={requirement}
                variant="secondary"
                className="group relative pr-7"
              >
                {REQUIREMENT_LABELS[requirement]}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(requirement)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}

        {error && (
          <p className="text-[0.8rem] font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  }
)

JobRequirementsSelect.displayName = "JobRequirementsSelect"
