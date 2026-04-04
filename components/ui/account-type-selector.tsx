"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AccountTypeOption {
  value: "worker" | "business";
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export interface AccountTypeSelectorProps {
  value: "worker" | "business";
  onValueChange: (value: "worker" | "business") => void;
  options: AccountTypeOption[];
  label?: string;
  className?: string;
}

function AccountTypeSelector({
  value,
  onValueChange,
  options,
  label,
  className,
}: AccountTypeSelectorProps) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={cn("space-y-4", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground block">
          {label}
        </label>
      )}

      {/* Segmented Control */}
      <div className="flex p-1 bg-muted rounded-full w-full">
        {options.map((option) => {
          const isSelected = value === option.value;
          const IconComponent = option.icon;
          
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onValueChange(option.value)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/5",
              )}
            >
              <IconComponent 
                className={cn(
                  "w-4 h-4",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} 
              />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { AccountTypeSelector };
