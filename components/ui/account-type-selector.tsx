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
  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground block">
          {label}
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onValueChange(option.value)}
              className={cn(
                "relative flex flex-col items-center justify-center p-4 sm:p-5 rounded-xl border-2 transition-all duration-200 ease-out min-h-[120px] sm:min-h-[140px]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "active:scale-[0.98]",
                isSelected
                  ? `${option.color} border-current shadow-sm scale-[1.02]`
                  : "border-border bg-background hover:bg-muted/50 hover:border-muted-foreground/30 active:bg-muted/60",
              )}
            >
              {/* Selection indicator */}
              <div
                className={cn(
                  "absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  isSelected
                    ? "border-current bg-current"
                    : "border-muted-foreground/30 bg-transparent"
                )}
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>

              {/* Icon */}
              <div
                className={cn(
                  "mb-3 p-3 rounded-full transition-colors",
                  isSelected
                    ? "bg-current/20"
                    : "bg-muted"
                )}
              >
                {(() => {
                  const IconComponent = option.icon;
                  return (
                    <IconComponent
                      className={cn(
                        "w-7 h-7 transition-colors",
                        isSelected ? "text-current" : "text-muted-foreground"
                      )}
                    />
                  );
                })()}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-sm font-semibold mb-1 transition-colors",
                  isSelected
                    ? "text-current"
                    : "text-foreground"
                )}
              >
                {option.label}
              </span>

              {/* Description */}
              <span
                className={cn(
                  "text-xs text-center leading-relaxed transition-colors",
                  isSelected
                    ? "text-current/80"
                    : "text-muted-foreground"
                )}
              >
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { AccountTypeSelector };
