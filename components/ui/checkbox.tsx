"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";

import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-5 shrink-0 items-center justify-center rounded-md border border-input outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        // Background transition
        "transition-all duration-150 ease-out",
        // Dark mode base
        "dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        // Checked state with gradient
        "data-[checked]:border-primary data-[checked]:bg-gradient-primary data-[checked]:border-transparent",
        "dark:data-[checked]:bg-gradient-primary",
        // Hover effect
        "hover:border-primary/50 data-[checked]:hover:border-transparent",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={cn(
          "grid place-content-center text-white",
          // Checkmark animation
          "[&>svg]:opacity-0 [&>svg]:scale-0 [&>svg]:transition-all [&>svg]:duration-150 [&>svg]:ease-out",
          "data-[checked]:[&>svg]:opacity-100 data-[checked]:[&>svg]:scale-100",
          // Alternative: animate class
          "data-[checked]:animate-checkmark",
          "[&>svg]:size-3.5",
        )}
      >
        <CheckIcon strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
