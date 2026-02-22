import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export type BookingStatus = "pending" | "accepted" | "completed" | "cancelled"

const bookingStatusVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      status: {
        pending:
          "border-transparent bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20",
        accepted:
          "border-transparent bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20",
        completed:
          "border-transparent bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20",
        cancelled:
          "border-transparent bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
)

export interface BookingStatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof bookingStatusVariants> {
  status: BookingStatus
}

const statusLabels: Record<BookingStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  completed: "Completed",
  cancelled: "Cancelled",
}

function BookingStatusBadge({
  className,
  status,
  ...props
}: BookingStatusBadgeProps) {
  return (
    <Badge
      className={cn(bookingStatusVariants({ status }), className)}
      {...props}
    >
      {statusLabels[status]}
    </Badge>
  )
}

export { BookingStatusBadge, bookingStatusVariants }
