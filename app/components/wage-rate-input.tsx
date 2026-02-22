"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { getWageRate, formatRupiah } from "@/lib/constants/rate-bali"
import { getAreaByValue } from "@/lib/constants/areas"
import type { PositionType } from "@/app/components/position-type-select"
import type { AreaValue } from "@/app/components/area-select"

export interface WageRateInputProps {
  minWage?: number
  maxWage?: number
  onMinWageChange?: (value: number) => void
  onMaxWageChange?: (value: number) => void
  positionType?: PositionType
  area?: AreaValue
  error?: string
  label?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

const formatPositionLabel = (positionType: string): string => {
  const labels: Record<string, string> = {
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
  return labels[positionType] || positionType
}

const getRegencyFromArea = (area: AreaValue): string | undefined => {
  const areaData = getAreaByValue(area)
  return areaData?.regency
}

export const WageRateInput = React.forwardRef<
  HTMLDivElement,
  WageRateInputProps
>(
  (
    {
      minWage,
      maxWage,
      onMinWageChange,
      onMaxWageChange,
      positionType,
      area,
      error,
      label = "Wage Rate (IDR/hour)",
      disabled = false,
      required = false,
      className,
      ...props
    },
    ref
  ) => {
    const [isLoading, setIsLoading] = React.useState(false)
    const [fetchError, setFetchError] = React.useState<string | null>(null)

    const minWageDisplay = minWage ? formatRupiah(minWage) : ""
    const maxWageDisplay = maxWage ? formatRupiah(maxWage) : ""

    const handleUseRateBali = async () => {
      if (!positionType || !area) {
        setFetchError("Please select both position type and area first")
        return
      }

      setIsLoading(true)
      setFetchError(null)

      try {
        const regency = getRegencyFromArea(area)
        if (!regency) {
          setFetchError("Unable to determine regency from selected area")
          setIsLoading(false)
          return
        }

        const positionLabel = formatPositionLabel(positionType)
        const wageRate = getWageRate(positionLabel, regency)

        if (!wageRate) {
          setFetchError(`No wage data found for ${positionLabel} in ${regency}`)
          setIsLoading(false)
          return
        }

        if (onMinWageChange) {
          onMinWageChange(wageRate.hourlyMin)
        }
        if (onMaxWageChange) {
          onMaxWageChange(wageRate.hourlyRecommended)
        }
      } catch (err) {
        setFetchError("Failed to fetch wage rates. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    const handleMinWageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/[^\d]/g, "")
      const numValue = value ? parseInt(value, 10) : 0
      if (onMinWageChange && !isNaN(numValue)) {
        onMinWageChange(numValue)
      }
    }

    const handleMaxWageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/[^\d]/g, "")
      const numValue = value ? parseInt(value, 10) : 0
      if (onMaxWageChange && !isNaN(numValue)) {
        onMaxWageChange(numValue)
      }
    }

    const canUseRateBali = Boolean(positionType && area)

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {label && (
          <Label className={cn(error && "text-destructive")}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Min wage"
              value={minWageDisplay}
              onChange={handleMinWageInputChange}
              disabled={disabled}
              className={cn(error && "border-destructive")}
            />
          </div>
          <div className="flex-1 space-y-1">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Max wage"
              value={maxWageDisplay}
              onChange={handleMaxWageInputChange}
              disabled={disabled}
              className={cn(error && "border-destructive")}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleUseRateBali}
            disabled={disabled || isLoading || !canUseRateBali}
            className="whitespace-nowrap"
          >
            {isLoading ? "Loading..." : "Use Rate Bali"}
          </Button>
        </div>
        {(error || fetchError) && (
          <p className="text-[0.8rem] font-medium text-destructive">
            {error || fetchError}
          </p>
        )}
        {!canUseRateBali && !disabled && (
          <p className="text-[0.8rem] text-muted-foreground">
            Select position type and area to use Rate Bali
          </p>
        )}
      </div>
    )
  }
)

WageRateInput.displayName = "WageRateInput"
