import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const complianceBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      status: {
        compliant:
          "border-transparent bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20",
        partial:
          "border-transparent bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20",
        non_compliant:
          "border-transparent bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20",
      },
    },
    defaultVariants: {
      status: "non_compliant",
    },
  }
)

export interface ComplianceBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof complianceBadgeVariants> {
  status: "compliant" | "partial" | "non_compliant"
}

function ComplianceBadge({
  className,
  status,
  ...props
}: ComplianceBadgeProps) {
  const iconMap = {
    compliant: CheckCircle2,
    partial: AlertCircle,
    non_compliant: XCircle,
  }

  const labelMap = {
    compliant: "Sesuai PP 35/2021",
    partial: "Sebagian Sesuai PP 35/2021",
    non_compliant: "Tidak Sesuai PP 35/2021",
  }

  const Icon = iconMap[status]

  return (
    <div
      className={cn(complianceBadgeVariants({ status }), className)}
      {...props}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{labelMap[status]}</span>
    </div>
  )
}

export { ComplianceBadge, complianceBadgeVariants }
