import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const kycStatusVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      status: {
        unverified:
          "border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        pending:
          "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        verified:
          "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        rejected:
          "border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      },
    },
    defaultVariants: {
      status: "unverified",
    },
  }
)

export interface KycStatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof kycStatusVariants> {
  status: "unverified" | "pending" | "verified" | "rejected"
}

const statusLabels: Record<KycStatusBadgeProps["status"], string> = {
  unverified: "Unverified",
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
}

export function KycStatusBadge({
  status,
  className,
  ...props
}: KycStatusBadgeProps) {
  return (
    <div
      className={cn(kycStatusVariants({ status }), className)}
      {...props}
    >
      {statusLabels[status]}
    </div>
  )
}
