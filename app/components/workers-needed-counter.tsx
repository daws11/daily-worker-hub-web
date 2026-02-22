"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { MinusIcon, PlusIcon } from "lucide-react"

export interface WorkersNeededCounterProps {
  value?: number
  onChange?: (value: number) => void
  min?: number
  max?: number
  error?: string
  label?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export const WorkersNeededCounter = React.forwardRef<
  HTMLDivElement,
  WorkersNeededCounterProps
>(
  (
    {
      value = 1,
      onChange,
      min = 1,
      max,
      error,
      label = "Workers Needed",
      disabled = false,
      required = false,
      className,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(value)
    const [inputError, setInputError] = React.useState<string | null>(null)

    // Sync internal state with external value prop
    React.useEffect(() => {
      setInternalValue(value)
    }, [value])

    const validateValue = (val: number): string | null => {
      if (val < min) {
        return `Minimum value is ${min}`
      }
      if (max !== undefined && val > max) {
        return `Maximum value is ${max}`
      }
      return null
    }

    const handleDecrement = () => {
      const newValue = internalValue - 1
      const validationError = validateValue(newValue)

      if (validationError) {
        setInputError(validationError)
        return
      }

      setInputError(null)
      setInternalValue(newValue)
      if (onChange) {
        onChange(newValue)
      }
    }

    const handleIncrement = () => {
      const newValue = internalValue + 1
      const validationError = validateValue(newValue)

      if (validationError) {
        setInputError(validationError)
        return
      }

      setInputError(null)
      setInternalValue(newValue)
      if (onChange) {
        onChange(newValue)
      }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const numericValue = parseInt(inputValue, 10)

      if (inputValue === "") {
        setInternalValue(min)
        setInputError(null)
        if (onChange) {
          onChange(min)
        }
        return
      }

      if (isNaN(numericValue)) {
        return
      }

      const validationError = validateValue(numericValue)

      if (validationError) {
        setInputError(validationError)
        setInternalValue(numericValue)
        return
      }

      setInputError(null)
      setInternalValue(numericValue)
      if (onChange) {
        onChange(numericValue)
      }
    }

    const handleBlur = () => {
      const validationError = validateValue(internalValue)
      if (validationError) {
        setInputError(validationError)
        // Reset to min if below min
        if (internalValue < min) {
          setInternalValue(min)
          if (onChange) {
            onChange(min)
          }
        }
        // Reset to max if above max
        if (max !== undefined && internalValue > max) {
          setInternalValue(max)
          if (onChange) {
            onChange(max)
          }
        }
      }
    }

    const canDecrement = internalValue > min
    const canIncrement = max === undefined || internalValue < max

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {label && (
          <Label className={cn((error || inputError) && "text-destructive")}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleDecrement}
            disabled={disabled || !canDecrement}
            aria-label="Decrease workers needed"
          >
            <MinusIcon className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            inputMode="numeric"
            value={internalValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            disabled={disabled}
            min={min}
            max={max}
            className={cn(
              "text-center",
              (error || inputError) && "border-destructive"
            )}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleIncrement}
            disabled={disabled || !canIncrement}
            aria-label="Increase workers needed"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
        {(error || inputError) && (
          <p className="text-[0.8rem] font-medium text-destructive">
            {error || inputError}
          </p>
        )}
      </div>
    )
  }
)

WorkersNeededCounter.displayName = "WorkersNeededCounter"
