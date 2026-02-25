"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useGeolocation } from "@/lib/hooks/use-geolocation"
import { MapPin, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface DistanceRadiusFilterProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  min?: number
  max?: number
  step?: number
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  onLocationChange?: (lat: number, lng: number) => void
  formatValue?: (value: number) => string
  showValue?: boolean
  disabled?: boolean
  label?: string
  unit?: string
  autoFetchLocation?: boolean
}

const DistanceRadiusFilter = React.forwardRef<HTMLDivElement, DistanceRadiusFilterProps>(
  (
    {
      className,
      min = 0,
      max = 50,
      step = 1,
      value: controlledValue,
      defaultValue = min,
      onValueChange,
      onLocationChange,
      formatValue,
      showValue = true,
      disabled = false,
      label,
      unit = "km",
      autoFetchLocation = false,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState<number>(controlledValue || defaultValue)

    // Use controlled value if provided, otherwise use internal state
    const value = controlledValue ?? internalValue

    // Update internal state when controlled value changes
    React.useEffect(() => {
      if (controlledValue !== undefined) {
        setInternalValue(controlledValue)
      }
    }, [controlledValue])

    const trackRef = React.useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = React.useState(false)

    // Geolocation hook with autoFetch controlled by prop
    const {
      location,
      isLoading: isLocationLoading,
      error: locationError,
      permission,
      getCurrentPosition,
      refreshLocation,
    } = useGeolocation({
      autoFetch: autoFetchLocation,
      enableHighAccuracy: true,
    })

    // Notify parent when location changes
    React.useEffect(() => {
      if (location && onLocationChange) {
        onLocationChange(location.lat, location.lng)
      }
    }, [location, onLocationChange])

    // Ensure values stay within bounds
    const clampValue = (val: number): number => {
      return Math.max(min, Math.min(max, val))
    }

    const handleMouseDown = (e: React.MouseEvent) => {
      if (disabled) return
      e.preventDefault()
      setIsDragging(true)
    }

    const handleTouchStart = (e: React.TouchEvent) => {
      if (disabled) return
      e.preventDefault()
      setIsDragging(true)
    }

    const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || !trackRef.current) return

      const trackRect = trackRef.current.getBoundingClientRect()
      const clickX = e.clientX - trackRect.left
      const percentage = clickX / trackRect.width
      const rawValue = percentage * (max - min) + min
      const steppedValue = Math.round(rawValue / step) * step
      const clampedValue = clampValue(steppedValue)

      if (!controlledValue) {
        setInternalValue(clampedValue)
      }
      onValueChange?.(clampedValue)
    }

    React.useEffect(() => {
      const handleMouseMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging || !trackRef.current) return

        const trackRect = trackRef.current.getBoundingClientRect()
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
        const percentage = (clientX - trackRect.left) / trackRect.width
        const rawValue = percentage * (max - min) + min
        const steppedValue = Math.round(rawValue / step) * step
        const clampedValue = clampValue(steppedValue)

        if (!controlledValue) {
          setInternalValue(clampedValue)
        }
        onValueChange?.(clampedValue)
      }

      const handleMouseUp = () => {
        setIsDragging(false)
      }

      if (isDragging) {
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
    }, [isDragging, min, max, step, controlledValue, onValueChange])

    const formatDistance = (val: number): string => {
      if (formatValue) {
        return formatValue(val)
      }
      return val.toString()
    }

    const getPercentage = (val: number): number => {
      return ((val - min) / (max - min)) * 100
    }

    const percent = getPercentage(value)

    const handleRequestLocation = async () => {
      await getCurrentPosition()
    }

    const locationPermissionStatus = permission === "granted" || location !== null

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
            {showValue && (
              <span className="text-sm text-muted-foreground">
                {formatDistance(value)} {unit}
              </span>
            )}
          </div>
        )}

        {/* Location Status */}
        <div className="space-y-2">
          {!locationPermissionStatus && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border border-border">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  {locationError || "Location required for distance filtering"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs flex-shrink-0"
                onClick={handleRequestLocation}
                disabled={isLocationLoading}
              >
                {isLocationLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Detecting...
                  </>
                ) : (
                  <>
                    <MapPin className="h-3 w-3 mr-1" />
                    Enable Location
                  </>
                )}
              </Button>
            </div>
          )}

          {locationPermissionStatus && location && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
              <p className="text-xs text-muted-foreground flex-1">
                Location enabled
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs flex-shrink-0"
                onClick={refreshLocation}
                disabled={isLocationLoading}
              >
                {isLocationLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Slider - only enabled when location is available */}
        <div className={cn("relative pt-1", !locationPermissionStatus && "opacity-50 pointer-events-none")}>
          {/* Track */}
          <div
            ref={trackRef}
            className={cn(
              "relative h-2 w-full rounded-full bg-secondary",
              disabled && "opacity-50 cursor-not-allowed",
              !locationPermissionStatus && "cursor-not-allowed"
            )}
            onClick={handleTrackClick}
          >
            {/* Active range (from min to current value) */}
            <div
              className="absolute h-full rounded-full bg-primary left-0"
              style={{
                width: `${percent}%`,
              }}
            />

            {/* Handle */}
            <div
              role="slider"
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={value}
              aria-label="Distance radius"
              tabIndex={disabled || !locationPermissionStatus ? -1 : 0}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-primary bg-background shadow-sm cursor-grab active:cursor-grabbing hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                (disabled || !locationPermissionStatus) && "cursor-not-allowed opacity-50",
                isDragging && "cursor-grabbing"
              )}
              style={{ left: `calc(${percent}% - 10px)` }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onKeyDown={(e) => {
                if (disabled || !locationPermissionStatus) return
                const stepAmount = e.shiftKey ? step * 10 : step
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                  e.preventDefault()
                  const newValue = Math.max(min, value - stepAmount)
                  if (!controlledValue) {
                    setInternalValue(newValue)
                  }
                  onValueChange?.(newValue)
                } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                  e.preventDefault()
                  const newValue = Math.min(max, value + stepAmount)
                  if (!controlledValue) {
                    setInternalValue(newValue)
                  }
                  onValueChange?.(newValue)
                }
              }}
            />
          </div>

          {/* Value Labels below slider */}
          {showValue && (
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{formatDistance(min)} {unit}</span>
              <span className="font-medium text-primary">
                {formatDistance(value)} {unit}
              </span>
              <span>{formatDistance(max)} {unit}</span>
            </div>
          )}
        </div>
      </div>
    )
  }
)

DistanceRadiusFilter.displayName = "DistanceRadiusFilter"

export { DistanceRadiusFilter }
