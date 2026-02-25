import * as React from "react"
import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

export interface ReviewRatingInputProps {
  value?: number
  onChange?: (rating: number) => void
  disabled?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
  "aria-label"?: string
}

const sizeVariants = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-7 w-7",
}

const containerSizeVariants = {
  sm: "gap-1",
  md: "gap-1.5",
  lg: "gap-2",
}

export function ReviewRatingInput({
  value = 0,
  onChange,
  disabled = false,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: ReviewRatingInputProps) {
  const [hoverValue, setHoverValue] = React.useState<number>(0)
  const currentValue = hoverValue > 0 ? hoverValue : value

  const handleMouseEnter = (rating: number) => {
    if (!disabled) {
      setHoverValue(rating)
    }
  }

  const handleMouseLeave = () => {
    if (!disabled) {
      setHoverValue(0)
    }
  }

  const handleClick = (rating: number) => {
    if (!disabled && onChange) {
      onChange(rating)
    }
  }

  const getStarColor = (starPosition: number, currentRating: number) => {
    const isFilled = starPosition <= currentRating

    if (disabled) {
      return isFilled
        ? "fill-yellow-400 text-yellow-400 dark:fill-yellow-500 dark:text-yellow-500 cursor-not-allowed"
        : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
    }

    return isFilled
      ? "fill-yellow-400 text-yellow-400 dark:fill-yellow-500 dark:text-yellow-500 transition-colors"
      : "text-gray-300 dark:text-gray-600 hover:fill-yellow-200 hover:text-yellow-200 dark:hover:fill-yellow-700 dark:hover:text-yellow-700 transition-colors"
  }

  const getRatingLabel = (rating: number) => {
    if (rating === 0) return ""
    if (rating === 1) return "Poor"
    if (rating === 2) return "Fair"
    if (rating === 3) return "Good"
    if (rating === 4) return "Very Good"
    if (rating === 5) return "Excellent"
    return ""
  }

  return (
    <div
      className={cn("inline-flex flex-col items-start gap-2", className)}
    >
      <div
        className={cn("flex items-center", containerSizeVariants[size])}
        onMouseLeave={handleMouseLeave}
        role="radiogroup"
        aria-label={ariaLabel || "Rating selection"}
      >
        {Array.from({ length: 5 }).map((_, index) => {
          const starPosition = index + 1
          return (
            <button
              key={starPosition}
              type="button"
              disabled={disabled}
              onMouseEnter={() => handleMouseEnter(starPosition)}
              onClick={() => handleClick(starPosition)}
              className={cn(
                "p-0.5 rounded transition-transform",
                !disabled && "hover:scale-110 active:scale-95",
                disabled && "opacity-60"
              )}
              aria-label={`Rate ${starPosition} out of 5 stars`}
              aria-checked={value === starPosition}
              role="radio"
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  handleClick(starPosition)
                }
              }}
            >
              <Star
                className={cn(
                  sizeVariants[size],
                  getStarColor(starPosition, currentValue)
                )}
                aria-hidden="true"
              />
            </button>
          )
        })}
      </div>

      {value > 0 && (
        <span className="text-sm text-muted-foreground">
          {getRatingLabel(value)} ({value}/5)
        </span>
      )}
    </div>
  )
}
