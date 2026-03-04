"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import {
  validateAvailabilityBlock,
  formatHour,
  getBlockDuration,
  MIN_BLOCK_HOURS,
  MAX_BLOCK_HOURS,
} from "@/lib/algorithms/availability-checker"
import { cn } from "@/lib/utils"

interface AvailabilitySlot {
  dayOfWeek: number
  dayName: string
  isAvailable: boolean
  startHour: number
  endHour: number
}

interface AvailabilitySlotProps {
  dayName: string
  dayOfWeek: number
  isAvailable: boolean
  startHour: number
  endHour: number
  onToggle: () => void
  onTimeChange: (startHour: number, endHour: number) => void
  disabled?: boolean
}

export function AvailabilitySlot({
  dayName,
  dayOfWeek,
  isAvailable,
  startHour,
  endHour,
  onToggle,
  onTimeChange,
  disabled = false,
}: AvailabilitySlotProps) {
  const [localStart, setLocalStart] = useState(startHour)
  const [localEnd, setLocalEnd] = useState(endHour)
  const [validationError, setValidationError] = useState<string | null>(null)

  const duration = getBlockDuration(localStart, localEnd)

  const validateAndUpdate = (newStart: number, newEnd: number) => {
    const validation = validateAvailabilityBlock(newStart, newEnd)
    if (!validation.valid) {
      setValidationError(validation.error || "Invalid availability")
      return
    }

    setValidationError(null)
    setLocalStart(newStart)
    setLocalEnd(newEnd)
    onTimeChange(newStart, newEnd)
  }

  const handleStartChange = (value: number[]) => {
    let newStart = Math.round(value[0])

    // Ensure end is at least MIN_BLOCK_HOURS after start
    if (newStart + MIN_BLOCK_HOURS > localEnd) {
      newStart = localEnd - MIN_BLOCK_HOURS
    }
    if (newStart < 0) newStart = 0

    validateAndUpdate(newStart, localEnd)
  }

  const handleEndChange = (value: number[]) => {
    let newEnd = Math.round(value[0])

    // Ensure end is at least MIN_BLOCK_HOURS after start
    if (newEnd - MIN_BLOCK_HOURS < localStart) {
      newEnd = localStart + MIN_BLOCK_HOURS
    }
    if (newEnd > 23) newEnd = 23

    validateAndUpdate(localStart, newEnd)
  }

  return (
    <div
      className={cn(
        "border rounded-lg p-4 space-y-3 transition-colors",
        isAvailable
          ? "bg-green-50 border-green-200"
          : "bg-muted/30 border-muted"
      )}
    >
      {/* Day Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={isAvailable}
            onCheckedChange={onToggle}
            disabled={disabled}
          />
          <span className="font-medium">{dayName}</span>
        </div>
        {isAvailable ? (
          <Badge className="bg-green-600 hover:bg-green-700" variant="default">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Available
          </Badge>
        ) : (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Unavailable
          </Badge>
        )}
      </div>

      {/* Time Selection */}
      {isAvailable && (
        <div className="space-y-4 pl-11">
          {/* Duration Badge */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{duration} hours</span>
            {duration === 4 && (
              <Badge variant="outline" className="text-xs">
                Minimum
              </Badge>
            )}
            {duration === 12 && (
              <Badge variant="outline" className="text-xs">
                Maximum
              </Badge>
            )}
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor={`start-${dayOfWeek}`} className="text-sm">
              Start Time: {formatHour(localStart)}
            </Label>
            <Slider
              id={`start-${dayOfWeek}`}
              value={[localStart]}
              onValueChange={handleStartChange}
              min={0}
              max={localEnd - MIN_BLOCK_HOURS}
              step={1}
              disabled={disabled}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>12 AM</span>
              <span>12 PM</span>
              <span>11 PM</span>
            </div>
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <Label htmlFor={`end-${dayOfWeek}`} className="text-sm">
              End Time: {formatHour(localEnd)}
            </Label>
            <Slider
              id={`end-${dayOfWeek}`}
              value={[localEnd]}
              onValueChange={handleEndChange}
              min={localStart + MIN_BLOCK_HOURS}
              max={23}
              step={1}
              disabled={disabled}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>12 AM</span>
              <span>12 PM</span>
              <span>11 PM</span>
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
              <AlertCircle className="h-4 w-4" />
              {validationError}
            </div>
          )}

          {/* Time Range Display */}
          <div className="flex items-center justify-between text-sm bg-background border rounded-md p-2">
            <span className="text-muted-foreground">Available:</span>
            <span className="font-medium">
              {formatHour(localStart)} - {formatHour(localEnd)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

interface AvailabilitySlotsProps {
  slots: AvailabilitySlot[]
  onSlotToggle: (dayOfWeek: number) => void
  onSlotTimeChange: (dayOfWeek: number, startHour: number, endHour: number) => void
  disabled?: boolean
}

export function AvailabilitySlots({
  slots,
  onSlotToggle,
  onSlotTimeChange,
  disabled = false,
}: AvailabilitySlotsProps) {
  const availableCount = slots.filter((s) => s.isAvailable).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Weekly Availability
        </CardTitle>
        <CardDescription>
          Set your availability for each day (4-12 hours blocks)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats */}
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
            <div className="text-sm text-muted-foreground">
              Days Available
            </div>
            <Badge variant={availableCount > 0 ? "default" : "secondary"}>
              {availableCount} / 7
            </Badge>
          </div>

          {/* Availability Slots */}
          <div className="space-y-3">
            {slots.map((slot) => (
              <AvailabilitySlot
                key={slot.dayOfWeek}
                dayName={slot.dayName}
                dayOfWeek={slot.dayOfWeek}
                isAvailable={slot.isAvailable}
                startHour={slot.startHour}
                endHour={slot.endHour}
                onToggle={() => onSlotToggle(slot.dayOfWeek)}
                onTimeChange={(start, end) =>
                  onSlotTimeChange(slot.dayOfWeek, start, end)
                }
                disabled={disabled}
              />
            ))}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
            <div className="font-medium mb-1">💡 Tips</div>
            <ul className="text-xs space-y-1 text-blue-800">
              <li>• Minimum 4 hours per day</li>
              <li>• Maximum 12 hours per day</li>
              <li>• Turn off days you're not available</li>
              <li>• Workers with more availability get more job matches</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
