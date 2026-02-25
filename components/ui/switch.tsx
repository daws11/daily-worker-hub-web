import * as React from "react"

import { cn } from "@/lib/utils"

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string
  description?: string
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, disabled, onCheckedChange, checked: checkedProp, ...props }, ref) => {
    const [internalChecked, setInternalChecked] = React.useState(checkedProp ?? false)

    // Update internal state when checked prop changes
    React.useEffect(() => {
      if (checkedProp !== undefined) {
        setInternalChecked(checkedProp)
      }
    }, [checkedProp])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = e.target.checked
      setInternalChecked(newChecked)
      onCheckedChange?.(newChecked)
    }

    // Determine if controlled or uncontrolled
    const isChecked = checkedProp !== undefined ? checkedProp : internalChecked

    return (
      <label
        className={cn(
          "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center gap-3 transition-colors",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <input
          type="checkbox"
          ref={ref}
          disabled={disabled}
          checked={isChecked}
          onChange={handleChange}
          className="sr-only"
          {...props}
        />
        <span
          className={cn(
            "pointer-events-none relative inline-block h-5 w-9 rounded-full shadow-sm transition-colors duration-200 ease-in-out",
            "bg-input peer-checked:bg-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            disabled && "pointer-events-none"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out",
              "translate-x-0.5 top-0.5 relative",
              "peer-checked:translate-x-4.5"
            )}
          />
        </span>
      </label>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
