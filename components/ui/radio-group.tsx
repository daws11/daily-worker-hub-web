"use client"

import * as React from "react"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"

import { cn } from "@/lib/utils"

export interface RadioOption {
  value: string
  label: string
  icon?: React.ReactNode
  description?: string
  disabled?: boolean
}

export interface RadioGroupProps extends RadioGroupPrimitive.Props {
  /** Name of the radio group */
  name?: string
  /** Options to render as radio buttons */
  options?: RadioOption[]
  /** Label for the group */
  label?: string
}

function RadioGroup({ 
  className, 
  name,
  options,
  label,
  children,
  ...props 
}: RadioGroupProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <RadioGroupPrimitive
        data-slot="radio-group"
        name={name}
        className={cn("grid w-full gap-2", className)}
        {...props}
      >
        {options ? (
          options.map((option) => (
            <RadioOption key={option.value} option={option} />
          ))
        ) : (
          children
        )}
      </RadioGroupPrimitive>
    </div>
  )
}

function RadioOption({ option }: { option: RadioOption }) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-input p-3 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 dark:has-[:checked]:bg-primary/10">
      <RadioPrimitive.Root
        data-slot="radio-group-item"
        value={option.value}
        disabled={option.disabled}
        className={cn(
          "group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-input outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary"
        )}
      >
        <RadioPrimitive.Indicator
          data-slot="radio-group-indicator"
          className="flex size-4 items-center justify-center"
        >
          <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
        </RadioPrimitive.Indicator>
      </RadioPrimitive.Root>
      {option.icon && (
        <span className="flex-shrink-0">{option.icon}</span>
      )}
      <span className="text-sm font-medium text-foreground">
        {option.label}
      </span>
    </label>
  )
}

function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-input outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        className
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex size-4 items-center justify-center"
      >
        <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
