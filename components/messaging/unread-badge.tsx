"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const unreadBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-full font-semibold transition-all",
  {
    variants: {
      size: {
        sm: "h-5 min-w-[1.25rem] px-1 text-xs",
        md: "h-6 min-w-[1.5rem] px-1.5 text-sm",
        lg: "h-7 min-w-[1.75rem] px-2 text-base",
      },
      variant: {
        default: "bg-destructive text-destructive-foreground shadow-sm",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-2 border-destructive text-destructive",
      },
      pulse: {
        true: "animate-pulse",
        false: "",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "default",
      pulse: false,
    },
  }
)

export interface UnreadBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof unreadBadgeVariants> {
  count: number
  maxCount?: number
  showZero?: boolean
  hideWhenZero?: boolean
  ariaLabel?: string
}

const UnreadBadge = React.forwardRef<HTMLDivElement, UnreadBadgeProps>(
  (
    {
      count,
      maxCount = 99,
      showZero = false,
      hideWhenZero = true,
      size,
      variant,
      pulse,
      className,
      ariaLabel,
      ...props
    },
    ref
  ) => {
    // Don't render if count is 0 and hideWhenZero is true
    if (count === 0 && hideWhenZero) {
      return null
    }

    // Format the count (e.g., 99+ for counts over maxCount)
    const displayCount = count > maxCount ? `${maxCount}+` : count.toString()

    // Generate aria label for accessibility
    const defaultAriaLabel =
      count === 1 ? "1 unread message" : `${count} unread messages`
    const badgeAriaLabel = ariaLabel || defaultAriaLabel

    // Show zero if showZero is true, otherwise show the count
    const shouldShowZero = count === 0 && showZero
    const finalDisplayCount = shouldShowZero ? "0" : displayCount

    return (
      <div
        ref={ref}
        className={cn(
          unreadBadgeVariants({ size, variant, pulse }),
          count > 9 && "min-w-fit px-2",
          className
        )}
        aria-label={badgeAriaLabel}
        role="status"
        aria-live="polite"
        {...props}
      >
        {finalDisplayCount}
      </div>
    )
  }
)

UnreadBadge.displayName = "UnreadBadge"

export { UnreadBadge, unreadBadgeVariants }
