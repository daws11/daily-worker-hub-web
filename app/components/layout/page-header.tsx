import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Breadcrumb item type
 */
export interface BreadcrumbItem {
  /** Label to display */
  label: string
  /** Link href (optional for current page) */
  href?: string
  /** Whether this is the current page */
  current?: boolean
}

/**
 * Action button type for page header
 */
export interface PageAction {
  /** Button label */
  label: string
  /** Click handler */
  onClick: () => void
  /** Button variant */
  variant?: "primary" | "secondary" | "ghost" | "outline"
  /** Button icon */
  icon?: React.ReactNode
  /** Whether the button is loading */
  isLoading?: boolean
  /** Whether to hide on mobile */
  hideOnMobile?: boolean
}

/**
 * Props for the PageHeader component
 */
export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Page title */
  title: string
  /** Page subtitle/description */
  subtitle?: string
  /** Breadcrumb navigation items */
  breadcrumbs?: BreadcrumbItem[]
  /** Primary action button */
  primaryAction?: PageAction
  /** Secondary action buttons */
  secondaryActions?: PageAction[]
  /** Back button configuration */
  backButton?: {
    onClick: () => void
    label?: string
  }
  /** Whether to show a border below the header */
  bordered?: boolean
  /** Whether the header is sticky */
  sticky?: boolean
  /** Size variant */
  size?: "sm" | "md" | "lg"
}

/**
 * PageHeader component for page titles and actions
 * 
 * @example
 * ```tsx
 * <PageHeader
 *   title="Pekerja Harian"
 *   subtitle="Kelola pekerja harian Anda"
 *   breadcrumbs={[
 *     { label: "Dashboard", href: "/dashboard" },
 *     { label: "Pekerja", current: true },
 *   ]}
 *   primaryAction={{ label: "Tambah Pekerja", onClick: handleAdd }}
 *   backButton={{ onClick: handleBack }}
 * />
 * ```
 */
export function PageHeader({
  className,
  title,
  subtitle,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  backButton,
  bordered = false,
  sticky = false,
  size = "md",
  ...props
}: PageHeaderProps) {
  const sizes = {
    sm: {
      title: "text-xl",
      subtitle: "text-sm",
      padding: "py-4",
    },
    md: {
      title: "text-2xl md:text-3xl",
      subtitle: "text-sm md:text-base",
      padding: "py-6",
    },
    lg: {
      title: "text-3xl md:text-4xl",
      subtitle: "text-base md:text-lg",
      padding: "py-8",
    },
  }

  return (
    <header
      className={cn(
        sizes[size].padding,
        bordered && "border-b border-slate-200 dark:border-slate-800",
        sticky && "sticky top-0 z-30 bg-white dark:bg-slate-900",
        className
      )}
      {...props}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            {breadcrumbs.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                {index > 0 && (
                  <svg
                    className="h-4 w-4 text-slate-300 dark:text-slate-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
                {item.href && !item.current ? (
                  <a
                    href={item.href}
                    className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span
                    className={cn(
                      item.current && "text-slate-900 dark:text-slate-100 font-medium"
                    )}
                    aria-current={item.current ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Main content row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left side: Back button + Title */}
        <div className="flex items-start gap-4">
          {/* Back button */}
          {backButton && (
            <button
              onClick={backButton.onClick}
              className={cn(
                "flex items-center justify-center",
                "h-10 w-10 rounded-lg",
                "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                "hover:bg-slate-100 dark:hover:bg-slate-800",
                "transition-colors"
              )}
              aria-label={backButton.label || "Kembali"}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Title and subtitle */}
          <div>
            <h1
              className={cn(
                "font-semibold text-slate-900 dark:text-slate-100",
                sizes[size].title
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className={cn(
                  "mt-1 text-slate-500 dark:text-slate-400",
                  sizes[size].subtitle
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Actions */}
        {(primaryAction || secondaryActions) && (
          <div className="flex items-center gap-2 md:gap-3">
            {/* Secondary actions */}
            {secondaryActions?.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "secondary"}
                size="md"
                onClick={action.onClick}
                isLoading={action.isLoading}
                className={cn(action.hideOnMobile && "hidden md:inline-flex")}
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </Button>
            ))}

            {/* Primary action */}
            {primaryAction && (
              <Button
                variant={primaryAction.variant || "primary"}
                size="md"
                onClick={primaryAction.onClick}
                isLoading={primaryAction.isLoading}
              >
                {primaryAction.icon && <span className="mr-2">{primaryAction.icon}</span>}
                {primaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

/**
 * Props for PageTitle component (simpler version)
 */
export interface PageTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Page title */
  title: string
  /** Optional badge */
  badge?: React.ReactNode
}

/**
 * Simple page title component without actions
 */
export function PageTitle({
  className,
  title,
  badge,
  ...props
}: PageTitleProps) {
  return (
    <div className={cn("flex items-center gap-3", className)} {...props}>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h1>
      {badge}
    </div>
  )
}
