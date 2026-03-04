import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4",
  {
    variants: {
      variant: {
        default:
          "bg-background text-foreground",
        info:
          "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-50",
        success:
          "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-50",
        warning:
          "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-50",
        destructive:
          "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const iconMap = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  destructive: AlertCircle,
}

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string
  icon?: React.ReactNode
  dismissible?: boolean
  onDismiss?: () => void
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", title, icon, dismissible = false, onDismiss, children, ...props }, ref) => {
    const Icon = variant !== "default" ? iconMap[variant as keyof typeof iconMap] : null

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          {icon && icon !== null && (
            <div className="flex-shrink-0 mt-0.5">
              {typeof icon === "string" ? Icon && <Icon className="h-4 w-4" /> : icon}
            </div>
          )}
          {Icon && !icon && (
            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            {title && (
              <h5 className="font-semibold mb-1">{title}</h5>
            )}
            <div className="text-sm leading-relaxed">
              {children}
            </div>
          </div>
          {dismissible && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity rounded-sm hover:bg-black/5 dark:hover:bg-white/10 p-0.5 -mr-1 -mt-1"
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    )
  }
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription, alertVariants }

/*
// Example Usage:

import { Alert } from "@/components/ui/alert"

// Basic Alert
<Alert>
  This is a default alert with important information.
</Alert>

// Info Alert
<Alert variant="info" title="Information">
  Your account settings have been updated successfully.
</Alert>

// Success Alert
<Alert variant="success" title="Success!">
  Your payment has been processed. You will receive a confirmation email shortly.
</Alert>

// Warning Alert
<Alert variant="warning" title="Warning">
  Your session will expire in 5 minutes. Please save your work.
</Alert>

// Destructive Alert
<Alert variant="destructive" title="Error">
  Failed to save your changes. Please try again later.
</Alert>

// With Custom Icon
<Alert variant="info" icon={<span className="text-xl">🎉</span>} title="Good News!">
  You've earned 500 bonus points!
</Alert>

// Dismissible Alert
function DismissibleAlertExample() {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <Alert
      variant="info"
      title="New Feature Available"
      dismissible
      onDismiss={() => setVisible(false)}
    >
      We've added new features to improve your experience.
    </Alert>
  )
}

// Without Title
<Alert variant="success">
  Operation completed successfully.
</Alert>

// Compact Alert
<Alert variant="warning" className="py-2 px-3">
  This is a compact warning alert.
</Alert>

// Alert with Actions
function AlertWithActions() {
  return (
    <Alert variant="destructive" title="Account Expiring">
      <p className="mb-3">Your account will expire in 7 days.</p>
      <div className="flex gap-2">
        <button className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
          Renew Now
        </button>
        <button className="px-3 py-1 text-red-700 hover:text-red-800 text-sm">
          Learn More
        </button>
      </div>
    </Alert>
  )
}

// Stacked Alerts
function StackedAlerts() {
  return (
    <div className="space-y-2">
      <Alert variant="success" title="Success">
        Item added to cart
      </Alert>
      <Alert variant="info" title="Tip">
        Free shipping on orders over $50
      </Alert>
    </div>
  )
}
*/
