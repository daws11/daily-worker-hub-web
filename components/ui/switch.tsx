"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentPropsWithoutRef<"input">, "type"> & {
    thumbClassName?: string
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
  }
>(({ className, thumbClassName, checked, onCheckedChange, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCheckedChange?.(e.target.checked)
    props.onChange?.(e)
  }

  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        onChange={handleChange}
        className={cn(
          "peer sr-only",
          className
        )}
        {...props}
      />
      <div
        className={cn(
          "peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring peer-focus:ring-offset-2 rounded-full peer h-5 w-9 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white bg-input peer-checked:bg-primary",
          thumbClassName
        )}
      />
    </label>
  )
})
Switch.displayName = "Switch"

export { Switch }
