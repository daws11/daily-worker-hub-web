"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Clock, CheckCircle2, ArrowRight, ArrowLeft, Sparkles } from "lucide-react"
import { DAYS_OF_WEEK, DAY_NAMES } from "@/lib/algorithms/availability-checker"
import { cn } from "@/lib/utils"

interface DayAvailability {
  dayOfWeek: number
  dayName: string
  isAvailable: boolean
  startHour: number
  endHour: number
}

interface AvailabilitySetupProps {
  onComplete: (availabilities: {
    dayOfWeek: number
    startHour: number
    endHour: number
    isAvailable: boolean
  }[]) => void
  existingData?: DayAvailability[]
  isLoading?: boolean
}

export function AvailabilitySetup({
  onComplete,
  existingData,
  isLoading = false,
}: AvailabilitySetupProps) {
  // Initialize with default 9-17 (9 AM - 5 PM) availability for weekdays
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedDays, setSelectedDays] = useState<number[]>(() => {
    if (existingData) {
      return existingData.filter((d) => d.isAvailable).map((d) => d.dayOfWeek)
    }
    // Default: Monday-Friday
    return [1, 2, 3, 4, 5]
  })

  // Default time settings
  const [defaultStartHour, setDefaultStartHour] = useState(9)
  const [defaultEndHour, setDefaultEndHour] = useState(17)

  const STEPS = [
    {
      id: "select-days",
      title: "Select Available Days",
      description: "Choose the days you're available to work",
    },
    {
      id: "set-hours",
      title: "Set Working Hours",
      description: "Define your available time block (4-12 hours)",
    },
    {
      id: "review",
      title: "Review Your Availability",
      description: "Confirm your weekly availability settings",
    },
  ]

  const toggleDay = (dayOfWeek: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayOfWeek)
        ? prev.filter((d) => d !== dayOfWeek)
        : [...prev, dayOfWeek]
    )
  }

  const handleQuickSelect = (days: number[]) => {
    setSelectedDays(days)
  }

  const getDuration = () => {
    return defaultEndHour - defaultStartHour
  }

  const isDurationValid = () => {
    const duration = getDuration()
    return duration >= 4 && duration <= 12
  }

  const getPreviewAvailabilities = () => {
    const allDays: number[] = [1, 2, 3, 4, 5, 6, 7]

    return allDays.map((dayOfWeek) => ({
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      isAvailable: selectedDays.includes(dayOfWeek),
      startHour: defaultStartHour,
      endHour: defaultEndHour,
    }))
  }

  const handleComplete = () => {
    const availabilities = getPreviewAvailabilities().map((day) => ({
      dayOfWeek: day.dayOfWeek,
      startHour: day.startHour,
      endHour: day.endHour,
      isAvailable: day.isAvailable,
    }))
    onComplete(availabilities)
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                currentStep === index
                  ? "bg-blue-600 text-white"
                  : currentStep > index
                  ? "bg-green-600 text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {currentStep > index ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-2",
                  currentStep > index ? "bg-green-600" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentStep === 0 && <Clock className="h-5 w-5" />}
            {currentStep === 1 && <Sparkles className="h-5 w-5" />}
            {currentStep === 2 && <CheckCircle2 className="h-5 w-5" />}
            {STEPS[currentStep].title}
          </CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Select Days */}
          {currentStep === 0 && (
            <div className="space-y-6">
              {/* Quick Select Options */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Quick Select</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSelect([1, 2, 3, 4, 5])}
                  >
                    Weekdays Only
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSelect([1, 2, 3, 4, 5, 6])}
                  >
                    Mon-Sat
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSelect([1, 2, 3, 4, 5, 6, 7])}
                  >
                    All Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSelect([])}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Day Selection Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DAY_NAMES.slice(1).map((dayName, index) => {
                  const dayOfWeek = index + 1
                  const isSelected = selectedDays.includes(dayOfWeek)

                  return (
                    <button
                      key={dayOfWeek}
                      onClick={() => toggleDay(dayOfWeek)}
                      disabled={isLoading}
                      className={cn(
                        "flex items-center justify-between p-4 border-2 rounded-lg transition-colors",
                        isSelected
                          ? "border-blue-600 bg-blue-50"
                          : "border-border bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      <span className="font-medium">{dayName}</span>
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-blue-600" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Selected Count */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {selectedDays.length} day
                  {selectedDays.length !== 1 ? "s" : ""} selected
                </span>
              </div>
            </div>
          )}

          {/* Step 2: Set Hours */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Quick Time Options */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Quick Options</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { start: 6, end: 14, label: "6 AM - 2 PM" },
                    { start: 8, end: 16, label: "8 AM - 4 PM" },
                    { start: 9, end: 17, label: "9 AM - 5 PM" },
                    { start: 10, end: 18, label: "10 AM - 6 PM" },
                  ].map((option) => (
                    <Button
                      key={option.label}
                      variant={
                        defaultStartHour === option.start &&
                        defaultEndHour === option.end
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        setDefaultStartHour(option.start)
                        setDefaultEndHour(option.end)
                      }}
                      disabled={isLoading}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Time Sliders */}
              <div className="space-y-4">
                {/* Start Hour */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Start: {defaultStartHour}:00
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={defaultEndHour - 4}
                    value={defaultStartHour}
                    onChange={(e) =>
                      setDefaultStartHour(parseInt(e.target.value))
                    }
                    disabled={isLoading}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>12 AM</span>
                    <span>12 PM</span>
                    <span>11 PM</span>
                  </div>
                </div>

                {/* End Hour */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    End: {defaultEndHour}:00
                  </label>
                  <input
                    type="range"
                    min={defaultStartHour + 4}
                    max={23}
                    value={defaultEndHour}
                    onChange={(e) =>
                      setDefaultEndHour(parseInt(e.target.value))
                    }
                    disabled={isLoading}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>12 AM</span>
                    <span>12 PM</span>
                    <span>11 PM</span>
                  </div>
                </div>
              </div>

              {/* Duration Display */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Duration
                    </div>
                    <div className="text-2xl font-bold">
                      {getDuration()} hours
                    </div>
                  </div>
                  {!isDurationValid() && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                      <AlertCircle className="h-4 w-4" />
                      Must be 4-12 hours
                    </div>
                  )}
                  {isDurationValid() && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Valid
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-900 font-medium mb-2">
                  <Sparkles className="h-4 w-4" />
                  Weekly Summary
                </div>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>• {selectedDays.length} days available</div>
                  <div>• {getDuration()} hours per day</div>
                  <div>
                    • {selectedDays.length * getDuration()} total hours per
                    week
                  </div>
                </div>
              </div>

              {/* Day-by-Day Breakdown */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Your Weekly Schedule
                </label>
                <div className="space-y-2">
                  {getPreviewAvailabilities().map((day) => (
                    <div
                      key={day.dayOfWeek}
                      className={cn(
                        "flex items-center justify-between p-3 border rounded-lg",
                        day.isAvailable
                          ? "bg-green-50 border-green-200"
                          : "bg-muted/30"
                      )}
                    >
                      <div>
                        <div className="font-medium">{day.dayName}</div>
                        {day.isAvailable && (
                          <div className="text-sm text-muted-foreground">
                            {day.startHour}:00 - {day.endHour}:00
                          </div>
                        )}
                      </div>
                      {day.isAvailable ? (
                        <Badge className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Available
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Unavailable</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0 || isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button onClick={nextStep} disabled={isLoading}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={isLoading || selectedDays.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete Setup
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
