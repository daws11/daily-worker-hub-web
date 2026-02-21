"use client"

import * as React from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export type PositionType =
  | "housekeeping"
  | "kitchen_staff"
  | "driver"
  | "server"
  | "bartender"
  | "receptionist"
  | "concierge"
  | "security"
  | "maintenance"
  | "laundry_attendant"
  | "pool_attendant"
  | "spa_staff"
  | "event_staff"
  | "gardener"
  | "other"

const POSITION_LABELS: Record<PositionType, string> = {
  housekeeping: "Housekeeping",
  kitchen_staff: "Kitchen Staff",
  driver: "Driver",
  server: "Server",
  bartender: "Bartender",
  receptionist: "Receptionist",
  concierge: "Concierge",
  security: "Security",
  maintenance: "Maintenance",
  laundry_attendant: "Laundry Attendant",
  pool_attendant: "Pool Attendant",
  spa_staff: "Spa Staff",
  event_staff: "Event Staff",
  gardener: "Gardener",
  other: "Other",
}

export interface PositionTypeSelectProps {
  value?: PositionType
  onChange?: (value: PositionType) => void
  error?: string
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export const PositionTypeSelect = React.forwardRef<
  HTMLButtonElement,
  PositionTypeSelectProps
>(
  (
    {
      value,
      onChange,
      error,
      label = "Position Type",
      placeholder = "Select position type",
      disabled = false,
      required = false,
      className,
      ...props
    },
    ref
  ) => {
    const handleValueChange = (newValue: string) => {
      if (onChange) {
        onChange(newValue as PositionType)
      }
    }

    return (
      <div className={cn("space-y-2", className)}>
        {label && (
          <Label
            className={cn(error && "text-destructive")}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <Select
          value={value}
          onValueChange={handleValueChange}
          disabled={disabled}
          {...props}
        >
          <SelectTrigger
            ref={ref}
            className={cn(error && "border-destructive")}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(POSITION_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && (
          <p className="text-[0.8rem] font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  }
)

PositionTypeSelect.displayName = "PositionTypeSelect"
