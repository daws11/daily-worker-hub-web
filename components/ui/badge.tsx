import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
      },
      status: {
        success:
          "border-transparent bg-green-500 text-white shadow hover:bg-green-600",
        warning:
          "border-transparent bg-yellow-500 text-white shadow hover:bg-yellow-600",
        error:
          "border-transparent bg-red-500 text-white shadow hover:bg-red-600",
        info:
          "border-transparent bg-blue-500 text-white shadow hover:bg-blue-600",
      },
      tier: {
        bronze:
          "border-transparent bg-orange-700 text-white shadow",
        silver:
          "border-transparent bg-gray-400 text-white shadow",
        gold:
          "border-transparent bg-yellow-500 text-gray-900 shadow",
        platinum:
          "border-transparent bg-slate-200 text-gray-900 shadow",
      },
      category: {
        tech:
          "border-transparent bg-purple-100 text-purple-700 hover:bg-purple-200",
        business:
          "border-transparent bg-blue-100 text-blue-700 hover:bg-blue-200",
        creative:
          "border-transparent bg-pink-100 text-pink-700 hover:bg-pink-200",
        manual:
          "border-transparent bg-amber-100 text-amber-700 hover:bg-amber-200",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

function Badge({ className, variant, status, tier, category, size, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({
          variant,
          status,
          tier,
          category,
          size,
          className,
        })
      )}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

/*
// Example Usage:

import { Badge } from "@/components/ui/badge"

// Basic Variants
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Destructive</Badge>

// Status Badges
<Badge status="success">✓ Active</Badge>
<Badge status="warning">⚠ Pending</Badge>
<Badge status="error">✕ Failed</Badge>
<Badge status="info">ℹ Info</Badge>

// Tier Badges
<Badge tier="bronze">Bronze</Badge>
<Badge tier="silver">Silver</Badge>
<Badge tier="gold">Gold</Badge>
<Badge tier="platinum">Platinum</Badge>

// Category Badges
<Badge category="tech">Technology</Badge>
<Badge category="business">Business</Badge>
<Badge category="creative">Creative</Badge>
<Badge category="manual">Manual Labor</Badge>

// Sizes
<Badge size="sm">Small</Badge>
<Badge size="default">Default</Badge>
<Badge size="lg">Large</Badge>

// Combined
<Badge status="success" size="lg">Available Now</Badge>

// With Dot Indicator
<Badge variant="outline">
  <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
  Online
</Badge>
*/
