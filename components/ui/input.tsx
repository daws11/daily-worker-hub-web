import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-10 px-3 py-2 text-sm",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-4 text-base",
      },
      variant: {
        default: "border-input bg-background shadow-sm",
        filled: "border-transparent bg-muted shadow-sm focus:bg-background",
        underlined: "border-t-0 border-x-0 border-b-2 bg-transparent rounded-none px-0 focus:ring-0 focus:border-ring",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, variant, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ size, variant, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }

/*
// Example Usage:

import { Input } from "@/components/ui/input"

// Different Types
<Input type="text" placeholder="Text input" />
<Input type="email" placeholder="Email address" />
<Input type="password" placeholder="Password" />
<Input type="number" placeholder="Number" />
<Input type="tel" placeholder="Phone number" />

// Sizes
<Input size="sm" placeholder="Small input" />
<Input size="default" placeholder="Default input" />
<Input size="lg" placeholder="Large input" />

// Variants
<Input variant="default" placeholder="Default variant" />
<Input variant="filled" placeholder="Filled variant" />
<Input variant="underlined" placeholder="Underlined variant" />

// With Icons
<div className="relative">
  <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
  <Input className="pl-9" placeholder="Search..." />
</div>

// Disabled
<Input disabled placeholder="Disabled input" />

// With Error State
<Input className="border-destructive focus-visible:ring-destructive" placeholder="Error state" />
*/
