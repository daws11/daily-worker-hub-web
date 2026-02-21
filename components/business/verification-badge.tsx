import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Clock, ShieldCheck, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const verificationBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      status: {
        pending:
          "border-transparent bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20",
        verified:
          "border-transparent bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20",
        rejected:
          "border-transparent bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
)

export interface VerificationBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof verificationBadgeVariants> {
  status: "pending" | "verified" | "rejected"
}

function VerificationBadge({
  className,
  status,
  ...props
}: VerificationBadgeProps) {
  const iconMap = {
    pending: Clock,
    verified: ShieldCheck,
    rejected: XCircle,
  }

  const labelMap = {
    pending: "Menunggu Verifikasi",
    verified: "Terverifikasi",
    rejected: "Ditolak",
  }

  const Icon = iconMap[status]

  return (
    <div
      className={cn(verificationBadgeVariants({ status }), className)}
      {...props}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{labelMap[status]}</span>
    </div>
  )
}

export { VerificationBadge, verificationBadgeVariants }
