import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const paymentStatusVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      status: {
        pending:
          "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        review:
          "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        available:
          "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        released:
          "border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
)

export interface PaymentStatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof paymentStatusVariants> {
  status: "pending" | "review" | "available" | "released"
}

const statusLabels: Record<PaymentStatusBadgeProps["status"], string> = {
  pending: "Pending",
  review: "In Review",
  available: "Available",
  released: "Released",
}

export function PaymentStatusBadge({
  status,
  className,
  ...props
}: PaymentStatusBadgeProps) {
  return (
    <div
      className={cn(paymentStatusVariants({ status }), className)}
      {...props}
    >
      {statusLabels[status]}
    </div>
  )
}
