"use client";

import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  /** Label text for the input */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Helper text below the input */
  helperText?: string;
}

function Input({
  className,
  type,
  label,
  error,
  helperText,
  id,
  ...props
}: InputProps) {
  const inputId = id || React.useId();
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <InputPrimitive
          type={type}
          id={inputId}
          data-slot="input"
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={cn(
            "h-11 w-full min-w-0 rounded-xl border-2 border-input bg-background px-4 py-2.5 text-base transition-all duration-200 outline-none touch-manipulation",
            "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
            "placeholder:text-muted-foreground/60",
            // Focus state with primary color ring
            "focus:border-primary focus:ring-4 focus:ring-primary/20",
            // Disabled state
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-60",
            // Error state with animation
            error && [
              "border-destructive animate-shake",
              "focus:border-destructive focus:ring-destructive/20",
            ],
            // Dark mode
            "dark:bg-input/20 dark:focus:bg-input/30",
            className,
          )}
          aria-invalid={!!error}
          {...props}
        />
        {/* Focus indicator dot */}
        {isFocused && !error && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary animate-pulse" />
        )}
      </div>
      {/* Error message with animation */}
      {error && (
        <p className="text-sm text-destructive animate-slide-up flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

export { Input };
