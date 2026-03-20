"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

export interface InstantDispatchBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline";
}

const InstantDispatchBadge = React.forwardRef<
  HTMLDivElement,
  InstantDispatchBadgeProps
>(({ size = "md", variant = "default", className, ...props }, ref) => {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-2.5 py-1 gap-1.5",
    lg: "text-base px-3 py-1.5 gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const variantClasses = {
    default: "bg-green-500 hover:bg-green-600 text-white border-transparent",
    outline: "bg-transparent border-green-500 text-green-700 hover:bg-green-50",
  };

  return (
    <Badge
      ref={ref}
      className={cn(
        "inline-flex items-center font-semibold",
        "transition-all duration-200",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <Zap className={cn("fill-current", iconSizes[size])} />
      <span>Instant Dispatch</span>
    </Badge>
  );
});
InstantDispatchBadge.displayName = "InstantDispatchBadge";

export { InstantDispatchBadge };
