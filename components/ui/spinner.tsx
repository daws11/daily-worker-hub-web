import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const spinnerVariants = cva(
  "animate-spin",
  {
    variants: {
      size: {
        xs: "w-3 h-3 border-2",
        sm: "w-4 h-4 border-2",
        default: "w-6 h-6 border-2",
        md: "w-8 h-8 border-3",
        lg: "w-12 h-12 border-4",
        xl: "w-16 h-16 border-5",
      },
      variant: {
        default: "border-primary border-t-transparent",
        secondary: "border-secondary border-t-transparent",
        destructive: "border-destructive border-t-transparent",
        muted: "border-muted-foreground border-t-transparent",
        white: "border-white border-t-transparent",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, variant, label, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("inline-flex items-center justify-center", className)}
        {...props}
      >
        <div className={cn(spinnerVariants({ size, variant }), "rounded-full")} />
        {label && <span className="ml-2 text-sm">{label}</span>}
      </div>
    )
  }
)
Spinner.displayName = "Spinner"

export { Spinner, spinnerVariants }

/*
// Example Usage:

import { Spinner } from "@/components/ui/spinner"

// Basic Spinner
<Spinner />

// Different Sizes
<Spinner size="xs" />
<Spinner size="sm" />
<Spinner size="default" />
<Spinner size="md" />
<Spinner size="lg" />
<Spinner size="xl" />

// Different Variants
<Spinner variant="default" />
<Spinner variant="secondary" />
<Spinner variant="destructive" />
<Spinner variant="muted" />
<Spinner variant="white" />

// With Label
<Spinner label="Loading..." />
<Spinner size="lg" label="Please wait..." />

// Inside Button
function LoadingButton() {
  const [loading, setLoading] = useState(false)

  return (
    <Button disabled={loading} onClick={() => setLoading(true)}>
      {loading ? (
        <>
          <Spinner size="sm" className="mr-2" />
          Loading...
        </>
      ) : (
        "Click me"
      )}
    </Button>
  )
}

// Full Page Loading
function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size="xl" label="Loading application..." />
    </div>
  )
}

// Card Loading
function CardLoading() {
  return (
    <div className="flex items-center justify-center p-8">
      <Spinner size="md" />
    </div>
  )
}

// Inline Loading
function InlineLoader() {
  return (
    <div className="flex items-center gap-2">
      <Spinner size="xs" />
      <span className="text-sm text-muted-foreground">Syncing...</span>
    </div>
  )
}

// Centered in Container
function CenteredSpinner() {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}
*/
