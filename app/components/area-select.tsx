"use client"

import * as React from "react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { BALI_AREAS, REGENCIES, type Area } from "@/lib/constants/areas"

export type AreaValue = string

export interface AreaSelectProps {
  value?: AreaValue
  onChange?: (value: AreaValue) => void
  error?: string
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export const AreaSelect = React.forwardRef<
  HTMLButtonElement,
  AreaSelectProps
>(
  (
    {
      value,
      onChange,
      error,
      label = "Area",
      placeholder = "Select area",
      disabled = false,
      required = false,
      className,
      ...props
    },
    ref
  ) => {
    const handleValueChange = (newValue: string) => {
      if (onChange) {
        onChange(newValue as AreaValue)
      }
    }

    // Group areas by regency
    const areasByRegency = React.useMemo(() => {
      const grouped: Record<string, Area[]> = {}
      BALI_AREAS.forEach((area) => {
        if (!grouped[area.regency]) {
          grouped[area.regency] = []
        }
        grouped[area.regency].push(area)
      })
      return grouped
    }, [])

    return (
      <div className={cn("space-y-2", className)}>
        {label && (
          <Label className={cn(error && "text-destructive")}>
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
            {REGENCIES.map((regency) => {
              const areasInRegency = areasByRegency[regency]
              if (!areasInRegency || areasInRegency.length === 0) {
                return null
              }
              return (
                <SelectGroup key={regency}>
                  <SelectLabel>{regency}</SelectLabel>
                  {areasInRegency.map((area) => (
                    <SelectItem key={area.value} value={area.value}>
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )
            })}
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

AreaSelect.displayName = "AreaSelect"
