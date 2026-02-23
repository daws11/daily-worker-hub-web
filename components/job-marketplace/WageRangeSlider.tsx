"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface WageRangeSliderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  min?: number
  max?: number
  step?: number
  value?: [number, number]
  defaultValue?: [number, number]
  onValueChange?: (value: [number, number]) => void
  formatValue?: (value: number) => string
  showValues?: boolean
  disabled?: boolean
  label?: string
  currency?: string
}

const WageRangeSlider = React.forwardRef<HTMLDivElement, WageRangeSliderProps>(
  (
    {
      className,
      min = 0,
      max = 10000000,
      step = 100000,
      value: controlledValue,
      defaultValue = [min, max],
      onValueChange,
      formatValue,
      showValues = true,
      disabled = false,
      label,
      currency = "IDR",
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState<[number, number]>(
      controlledValue || defaultValue
    )

    // Use controlled value if provided, otherwise use internal state
    const value = controlledValue ?? internalValue
    const [minValue, maxValue] = value

    // Update internal state when controlled value changes
    React.useEffect(() => {
      if (controlledValue) {
        setInternalValue(controlledValue)
      }
    }, [controlledValue])

    const trackRef = React.useRef<HTMLDivElement>(null)
    const [isDraggingMin, setIsDraggingMin] = React.useState(false)
    const [isDraggingMax, setIsDraggingMax] = React.useState(false)

    // Ensure values stay within bounds and min <= max
    const clampValue = (val: number): number => {
      return Math.max(min, Math.min(max, val))
    }

    const handleMouseDown = (handle: "min" | "max") => (e: React.MouseEvent) => {
      if (disabled) return
      e.preventDefault()
      if (handle === "min") {
        setIsDraggingMin(true)
      } else {
        setIsDraggingMax(true)
      }
    }

    const handleTouchStart = (handle: "min" | "max") => (e: React.TouchEvent) => {
      if (disabled) return
      e.preventDefault()
      if (handle === "min") {
        setIsDraggingMin(true)
      } else {
        setIsDraggingMax(true)
      }
    }

    React.useEffect(() => {
      const handleMouseMove = (e: MouseEvent | TouchEvent) => {
        if (!isDraggingMin && !isDraggingMax) return
        if (!trackRef.current) return

        const trackRect = trackRef.current.getBoundingClientRect()
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
        const percentage = (clientX - trackRect.left) / trackRect.width
        const rawValue = percentage * (max - min) + min
        const steppedValue = Math.round(rawValue / step) * step
        const clampedValue = clampValue(steppedValue)

        if (isDraggingMin) {
          const newMin = Math.min(clampedValue, maxValue - step)
          const newValue: [number, number] = [newMin, maxValue]
          if (!controlledValue) {
            setInternalValue(newValue)
          }
          onValueChange?.(newValue)
        } else if (isDraggingMax) {
          const newMax = Math.max(clampedValue, minValue + step)
          const newValue: [number, number] = [minValue, newMax]
          if (!controlledValue) {
            setInternalValue(newValue)
          }
          onValueChange?.(newValue)
        }
      }

      const handleMouseUp = () => {
        setIsDraggingMin(false)
        setIsDraggingMax(false)
      }

      if (isDraggingMin || isDraggingMax) {
        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)
        window.addEventListener("touchmove", handleMouseMove)
        window.addEventListener("touchend", handleMouseUp)
      }

      return () => {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
        window.removeEventListener("touchmove", handleMouseMove)
        window.removeEventListener("touchend", handleMouseUp)
      }
    }, [
      isDraggingMin,
      isDraggingMax,
      min,
      max,
      step,
      minValue,
      maxValue,
      controlledValue,
      onValueChange,
    ])

    const formatCurrency = (val: number): string => {
      if (formatValue) {
        return formatValue(val)
      }
      // Format as Indonesian Rupiah (e.g., 1.000.000)
      return new Intl.NumberFormat("id-ID").format(val)
    }

    const getPercentage = (val: number): number => {
      return ((val - min) / (max - min)) * 100
    }

    const minPercent = getPercentage(minValue)
    const maxPercent = getPercentage(maxValue)

    return (
      <div
        ref={ref}
        className={cn("space-y-3", className)}
        {...props}
      >
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {label}
            </label>
            {showValues && (
              <span className="text-sm text-muted-foreground">
                {currency} {formatCurrency(minValue)} - {formatCurrency(maxValue)}
              </span>
            )}
          </div>
        )}

        <div className="relative pt-1">
          {/* Track */}
          <div
            ref={trackRef}
            className={cn(
              "relative h-2 w-full rounded-full bg-secondary",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {/* Active range */}
            <div
              className="absolute h-full rounded-full bg-primary"
              style={{
                left: `${minPercent}%`,
                right: `${100 - maxPercent}%`,
              }}
            />

            {/* Min Handle */}
            <div
              role="slider"
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={minValue}
              aria-label="Minimum wage"
              tabIndex={disabled ? -1 : 0}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-primary bg-background shadow-sm cursor-grab active:cursor-grabbing hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                disabled && "cursor-not-allowed opacity-50",
                (isDraggingMin || isDraggingMax) && "cursor-grabbing"
              )}
              style={{ left: `calc(${minPercent}% - 10px)` }}
              onMouseDown={handleMouseDown("min")}
              onTouchStart={handleTouchStart("min")}
              onKeyDown={(e) => {
                if (disabled) return
                const stepAmount = e.shiftKey ? step * 10 : step
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                  e.preventDefault()
                  const newMin = Math.max(min, minValue - stepAmount)
                  const newValue: [number, number] = [newMin, maxValue]
                  if (!controlledValue) {
                    setInternalValue(newValue)
                  }
                  onValueChange?.(newValue)
                } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                  e.preventDefault()
                  const newMin = Math.min(maxValue - step, minValue + stepAmount)
                  const newValue: [number, number] = [newMin, maxValue]
                  if (!controlledValue) {
                    setInternalValue(newValue)
                  }
                  onValueChange?.(newValue)
                }
              }}
            />

            {/* Max Handle */}
            <div
              role="slider"
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={maxValue}
              aria-label="Maximum wage"
              tabIndex={disabled ? -1 : 0}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-primary bg-background shadow-sm cursor-grab active:cursor-grabbing hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                disabled && "cursor-not-allowed opacity-50",
                (isDraggingMin || isDraggingMax) && "cursor-grabbing"
              )}
              style={{ left: `calc(${maxPercent}% - 10px)` }}
              onMouseDown={handleMouseDown("max")}
              onTouchStart={handleTouchStart("max")}
              onKeyDown={(e) => {
                if (disabled) return
                const stepAmount = e.shiftKey ? step * 10 : step
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                  e.preventDefault()
                  const newMax = Math.max(minValue + step, maxValue - stepAmount)
                  const newValue: [number, number] = [minValue, newMax]
                  if (!controlledValue) {
                    setInternalValue(newValue)
                  }
                  onValueChange?.(newValue)
                } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                  e.preventDefault()
                  const newMax = Math.min(max, maxValue + stepAmount)
                  const newValue: [number, number] = [minValue, newMax]
                  if (!controlledValue) {
                    setInternalValue(newValue)
                  }
                  onValueChange?.(newValue)
                }
              }}
            />
          </div>

          {/* Value Labels below slider */}
          {showValues && (
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{currency} {formatCurrency(minValue)}</span>
              <span>{currency} {formatCurrency(maxValue)}</span>
            </div>
          )}
        </div>
      </div>
    )
  }
)

WageRangeSlider.displayName = "WageRangeSlider"

export { WageRangeSlider }
