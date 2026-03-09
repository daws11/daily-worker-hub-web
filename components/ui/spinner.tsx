import * as React from "react"
import { cn } from "../../lib/utils"

/**
 * Spinner size types
 */
export type SpinnerSize = "sm" | "md" | "lg"

/**
 * Spinner color variants
 */
export type SpinnerColor = "primary" | "white" | "current"

/**
 * Props for the Spinner component
 */
export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size of the spinner */
  size?: SpinnerSize
  /** Color variant */
  color?: SpinnerColor
  /** Accessible label for screen readers */
  label?: string
}

/**
 * Spinner component for loading states
 * 
 * @example
 * ```tsx
 * <Spinner size="md" />
 * <Spinner size="lg" color="white" label="Memuat data..." />
 * ```
 */
export function Spinner({
  className,
  size = "md",
  color = "primary",
  label = "Memuat...",
  ...props
}: SpinnerProps) {
  const sizes: Record<SpinnerSize, string> = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  const colors: Record<SpinnerColor, string> = {
    primary: "text-teal-600 dark:text-teal-500",
    white: "text-white",
    current: "text-current",
  }

  return (
    <div
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center", className)}
      {...props}
    >
      <svg
        className={cn(
          "animate-spin",
          sizes[size],
          colors[color]
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12c0-2.667-1.024-5.107-2.667-7.004A9.972 9.972 0 0112 22c5.523 0 10-4.477 10-10h-4c0 4.418-3.582 8-8 8a7.96 7.96 0 01-5.333-2.049z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  )
}

/**
 * Props for LoadingOverlay component
 */
export interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the overlay is visible */
  isLoading: boolean
  /** Loading label */
  label?: string
  /** Spinner size */
  spinnerSize?: SpinnerSize
}

/**
 * LoadingOverlay component for blocking content during loading
 * 
 * @example
 * ```tsx
 * <LoadingOverlay isLoading={isSubmitting} label="Menyimpan..." />
 * ```
 */
export function LoadingOverlay({
  isLoading,
  label = "Memuat...",
  spinnerSize = "lg",
  className,
  children,
  ...props
}: LoadingOverlayProps) {
  if (!isLoading) {
    return <>{children}</>
  }

  return (
    <div className={cn("relative", className)} {...props}>
      {children}
      <div
        className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm" />
        <Spinner size={spinnerSize} className="relative z-10" />
        {label && (
          <p className="relative z-10 text-sm text-slate-600 dark:text-slate-400">
            {label}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Props for LoadingDots component
 */
export interface LoadingDotsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size of the dots */
  size?: SpinnerSize
  /** Color variant */
  color?: SpinnerColor
}

/**
 * LoadingDots component for inline loading indicators
 * 
 * @example
 * ```tsx
 * <LoadingDots size="sm" />
 * ```
 */
export function LoadingDots({
  size = "md",
  color = "primary",
  className,
  ...props
}: LoadingDotsProps) {
  const sizes: Record<SpinnerSize, string> = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  }

  const colors: Record<SpinnerColor, string> = {
    primary: "bg-teal-600 dark:bg-teal-500",
    white: "bg-white",
    current: "bg-current",
  }

  return (
    <div
      role="status"
      aria-label="Memuat"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "rounded-full",
            sizes[size],
            colors[color],
            "animate-bounce"
          )}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
      <span className="sr-only">Memuat...</span>
    </div>
  )
}
