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

/*
// Example Usage:

import { Skeleton } from "@/components/ui/skeleton"

// Basic Skeleton
<Skeleton className="h-4 w-[200px]" />

// Different Variants
<Skeleton variant="default" className="h-4 w-[200px]" />
<Skeleton variant="subtle" className="h-4 w-[200px]" />
<Skeleton variant="strong" className="h-4 w-[200px]" />

// Different Shapes
<Skeleton shape="default" className="h-4 w-[200px]" />
<Skeleton shape="circle" className="h-12 w-12" />
<Skeleton shape="rounded" className="h-12 w-full" />
<Skeleton shape="none" className="h-4 w-full" />

// Card Loading State
function CardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  )
}

// User Profile Skeleton
function ProfileSkeleton() {
  return (
    <div className="flex items-center space-x-4">
      <Skeleton shape="circle" className="h-12 w-12" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-3 w-[150px]" />
      </div>
    </div>
  )
}

// List Skeleton
function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton shape="circle" className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-3 w-[150px]" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Table Skeleton
function TableSkeleton() {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex space-x-4">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>
      {/* Rows */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex space-x-4">
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 flex-1" />
        </div>
      ))}
    </div>
  )
}

// Article Skeleton
function ArticleSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-[300px]" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-[90%]" />
      <Skeleton className="h-4 w-[95%]" />
      <Skeleton className="h-4 w-[85%]" />
      <div className="flex space-x-4 pt-4">
        <Skeleton shape="circle" className="h-8 w-8" />
        <Skeleton className="h-4 w-[100px]" />
      </div>
    </div>
  )
}
*/
