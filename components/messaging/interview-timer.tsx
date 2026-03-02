"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Clock, Timer } from "lucide-react"

export interface InterviewTimerProps extends React.HTMLAttributes<HTMLDivElement> {
  status: "pending" | "in_progress" | "completed" | "skipped" | "failed"
  startedAt?: string | null
  completedAt?: string | null
  duration?: number | null // Duration in seconds
  requiredDuration?: number // Required minimum duration in seconds
  maxDuration?: number // Maximum recommended duration in seconds
  label?: string
  showIcon?: boolean
  variant?: "default" | "compact" | "minimal"
}

const InterviewTimer = React.forwardRef<HTMLDivElement, InterviewTimerProps>(
  (
    {
      status,
      startedAt,
      completedAt,
      duration,
      requiredDuration,
      maxDuration,
      label,
      showIcon = true,
      variant = "default",
      className,
      ...props
    },
    ref
  ) => {
    const [elapsedTime, setElapsedTime] = React.useState(0)
    const intervalRef = React.useRef<NodeJS.Timeout | null>(null)

    // Calculate elapsed time when in progress
    React.useEffect(() => {
      if (status === "in_progress" && startedAt) {
        // Clear existing interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }

        // Calculate initial elapsed time
        const started = new Date(startedAt).getTime()
        const now = Date.now()
        setElapsedTime(Math.floor((now - started) / 1000))

        // Start interval to update every second
        intervalRef.current = setInterval(() => {
          const current = Date.now()
          setElapsedTime(Math.floor((current - started) / 1000))
        }, 1000)

        return () => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
        }
      } else if (completedAt && startedAt) {
        // Use completed duration if available
        const started = new Date(startedAt).getTime()
        const completed = new Date(completedAt).getTime()
        setElapsedTime(Math.floor((completed - started) / 1000))
      } else if (duration !== null && duration !== undefined) {
        // Use provided duration
        setElapsedTime(duration)
      }

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }, [status, startedAt, completedAt, duration])

    // Format seconds to MM:SS
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    // Format seconds to human-readable duration
    const formatDuration = (seconds: number): string => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60

      if (mins === 0) {
        return `${secs} detik`
      }
      if (secs === 0) {
        return `${mins} menit`
      }
      return `${mins} menit ${secs} detik`
    }

    // Calculate progress percentage (if max duration is set)
    const progressPercentage = maxDuration
      ? Math.min(100, (elapsedTime / maxDuration) * 100)
      : null

    // Check if minimum duration is met
    const meetsMinimum = requiredDuration
      ? elapsedTime >= requiredDuration
      : null

    // Get timer color based on status and duration
    const getTimerColor = () => {
      if (status === "completed") {
        return "text-green-600"
      }
      if (status === "failed") {
        return "text-destructive"
      }
      if (status === "skipped") {
        return "text-muted-foreground"
      }
      if (status === "in_progress") {
        if (meetsMinimum === false) {
          return "text-amber-600"
        }
        return "text-blue-600"
      }
      return "text-muted-foreground"
    }

    const timerColor = getTimerColor()

    // Render different variants
    if (variant === "minimal") {
      return (
        <div
          ref={ref}
          className={cn("flex items-center gap-1.5 text-sm", timerColor, className)}
          {...props}
        >
          {showIcon && status === "in_progress" && (
            <Clock className="h-3.5 w-3.5 animate-pulse" />
          )}
          <span className="font-mono font-medium">{formatTime(elapsedTime)}</span>
        </div>
      )
    }

    if (variant === "compact") {
      return (
        <div
          ref={ref}
          className={cn("flex items-center gap-2", className)}
          {...props}
        >
          {showIcon && (
            <Timer className={cn("h-4 w-4", timerColor)} />
          )}
          <div className="flex flex-col">
            {label && (
              <span className="text-xs text-muted-foreground">{label}</span>
            )}
            <div className="flex items-center gap-2">
              <span className={cn("font-mono font-medium text-sm", timerColor)}>
                {formatTime(elapsedTime)}
              </span>
              {meetsMinimum !== null && status === "in_progress" && (
                <span className={cn("text-xs font-medium", meetsMinimum ? "text-green-600" : "text-amber-600")}>
                  {meetsMinimum ? "✓" : `min ${formatDuration(requiredDuration!)}`}
                </span>
              )}
            </div>
          </div>
        </div>
      )
    }

    // Default variant
    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-3 p-3 rounded-lg bg-muted/50", className)}
        {...props}
      >
        {showIcon && (
          <div className={cn(
            "flex items-center justify-center rounded-full p-2",
            status === "in_progress" ? "bg-blue-100" : "bg-muted"
          )}>
            <Timer className={cn(
              "h-5 w-5",
              status === "in_progress" && "animate-pulse text-blue-600",
              timerColor
            )} />
          </div>
        )}

        <div className="flex-1">
          {label && (
            <p className="text-sm font-medium">{label}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("font-mono text-xl font-bold", timerColor)}>
              {formatTime(elapsedTime)}
            </span>
            {requiredDuration && meetsMinimum === false && status === "in_progress" && (
              <span className="text-xs text-amber-600 font-medium">
                (min {formatDuration(requiredDuration)})
              </span>
            )}
            {maxDuration && status === "in_progress" && (
              <span className="text-xs text-muted-foreground">
                / {formatDuration(maxDuration)}
              </span>
            )}
          </div>

          {progressPercentage !== null && status === "in_progress" && (
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  progressPercentage >= 90 ? "bg-orange-500" : "bg-blue-500"
                )}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}
        </div>

        {status === "completed" && (
          <span className="text-xs font-medium text-green-600">Selesai</span>
        )}
      </div>
    )
  }
)
InterviewTimer.displayName = "InterviewTimer"

export { InterviewTimer }
