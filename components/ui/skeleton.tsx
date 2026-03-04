import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const skeletonVariants = cva(
  "animate-pulse",
  {
    variants: {
      variant: {
        default: "bg-muted",
        subtle: "bg-muted/50",
        strong: "bg-muted/80",
      },
      shape: {
        default: "rounded-md",
        circle: "rounded-full",
        rounded: "rounded-lg",
        none: "rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
      shape: "default",
    },
  }
)

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, variant, shape, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ variant, shape }), className)}
      {...props}
    />
  )
}

export { Skeleton, skeletonVariants }

// Example Usage:
// import { Skeleton } from "@/components/ui/skeleton"
// <Skeleton className="h-4 w-[200px]" />
// <Skeleton variant="default" className="h-4 w-[200px]" />
// <Skeleton shape="circle" className="h-12 w-12" />
