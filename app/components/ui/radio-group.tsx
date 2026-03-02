import * as React from "react"
import { cn } from "../../lib/utils"

export interface RadioGroupProps {
  name: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string; icon?: React.ReactNode }[]
}

export function RadioGroup({ name, value, onChange, options }: RadioGroupProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer",
            "transition-all duration-200",
            "hover:border-slate-300 hover:bg-slate-50",
            value === option.value
              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20"
              : "border-slate-200 bg-white"
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
          {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
          <span className="text-sm font-medium text-slate-700">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  )
}
