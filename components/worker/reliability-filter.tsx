"use client";

import React, { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/hooks";

export interface ReliabilityFilterValue {
  minScore?: number;
  maxScore?: number;
}

export interface ReliabilityFilterProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "value"> {
  value?: ReliabilityFilterValue;
  defaultValue?: ReliabilityFilterValue;
  onValueChange?: (value: ReliabilityFilterValue) => void;
  showMinMax?: boolean;
  disabled?: boolean;
  label?: string;
}

const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const;

const ReliabilityFilter = React.forwardRef<
  HTMLDivElement,
  ReliabilityFilterProps
>(
  (
    {
      className,
      value: controlledValue,
      defaultValue = { minScore: 1, maxScore: 5 },
      onValueChange,
      showMinMax = true,
      disabled = false,
      label,
      ...props
    },
    ref,
  ) => {
    const { t } = useTranslation();

    const [internalValue, setInternalValue] = useState<ReliabilityFilterValue>(
      controlledValue ?? defaultValue,
    );

    // Use controlled value if provided, otherwise use internal state
    const value = controlledValue ?? internalValue;

    // Update internal state when controlled value changes
    React.useEffect(() => {
      if (controlledValue !== undefined) {
        setInternalValue(controlledValue);
      }
    }, [controlledValue]);

    const handleMinChange = (newMin: string) => {
      const min = newMin === "any" ? undefined : parseInt(newMin, 10);
      const newValue: ReliabilityFilterValue = {
        ...value,
        minScore: min,
      };

      // Ensure min doesn't exceed max
      if (value.maxScore !== undefined && min !== undefined && min > value.maxScore) {
        newValue.maxScore = min;
      }

      if (!controlledValue) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    const handleMaxChange = (newMax: string) => {
      const max = newMax === "any" ? undefined : parseInt(newMax, 10);
      const newValue: ReliabilityFilterValue = {
        ...value,
        maxScore: max,
      };

      // Ensure max doesn't go below min
      if (value.minScore !== undefined && max !== undefined && max < value.minScore) {
        newValue.minScore = max;
      }

      if (!controlledValue) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    const hasActiveFilter = value.minScore !== undefined || value.maxScore !== undefined;

    const getMinValue = (): string => {
      if (value.minScore === undefined) return "any";
      return value.minScore.toString();
    };

    const getMaxValue = (): string => {
      if (value.maxScore === undefined) return "any";
      return value.maxScore.toString();
    };

    // Generate max options based on current min value
    const maxOptions = useMemo(() => {
      const options: Array<{ value: string; label: string }> = [
        { value: "any", label: t("common.any") || "Any" },
      ];
      const min = value.minScore ?? 1;
      for (let i = min; i <= 5; i++) {
        options.push({
          value: i.toString(),
          label: `${i}`,
        });
      }
      return options;
    }, [value.minScore, t]);

    // Generate min options based on current max value
    const minOptions = useMemo(() => {
      const options: Array<{ value: string; label: string }> = [
        { value: "any", label: t("common.any") || "Any" },
      ];
      const max = value.maxScore ?? 5;
      for (let i = 1; i <= max; i++) {
        options.push({
          value: i.toString(),
          label: `${i}`,
        });
      }
      return options;
    }, [value.maxScore, t]);

    return (
      <div ref={ref} className={cn("space-y-3", className)} {...props}>
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {label}
            </label>
            {hasActiveFilter && (
              <span className="text-xs text-muted-foreground">
                {value.minScore ?? 1} – {value.maxScore ?? 5}
              </span>
            )}
          </div>
        )}

        {!label && (
          <div className="text-sm font-medium mb-1">
            {t("worker.reliabilityScore") || "Reliability Score"}
          </div>
        )}

        {showMinMax && (
          <div className="flex items-center gap-2">
            {/* Min Score Select */}
            <div className="flex-1 space-y-1.5">
              <Label
                htmlFor="reliability-min"
                className="text-xs text-muted-foreground"
              >
                {t("common.min") || "Min"}
              </Label>
              <Select
                value={getMinValue()}
                onValueChange={handleMinChange}
                disabled={disabled}
              >
                <SelectTrigger id="reliability-min" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {minOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <span className="text-muted-foreground text-sm mt-5">–</span>

            {/* Max Score Select */}
            <div className="flex-1 space-y-1.5">
              <Label
                htmlFor="reliability-max"
                className="text-xs text-muted-foreground"
              >
                {t("common.max") || "Max"}
              </Label>
              <Select
                value={getMaxValue()}
                onValueChange={handleMaxChange}
                disabled={disabled}
              >
                <SelectTrigger id="reliability-max" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {maxOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {!showMinMax && (
          <Select
            value={
              value.minScore !== undefined
                ? value.minScore.toString()
                : "any"
            }
            onValueChange={(v) => handleMinChange(v)}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={t("worker.reliabilityScore") || "Reliability Score"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">
                {t("common.any") || "Any"}
              </SelectItem>
              {SCORE_OPTIONS.map((score) => (
                <SelectItem key={score} value={score.toString()}>
                  {score}+ {t("worker.reliabilityScore") || "Reliability Score"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Active indicator */}
        {hasActiveFilter && (
          <div className="flex items-center gap-1.5">
            {SCORE_OPTIONS.map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  (value.minScore === undefined || s >= value.minScore) &&
                    (value.maxScore === undefined || s <= value.maxScore)
                    ? "bg-primary"
                    : "bg-muted",
                )}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);

ReliabilityFilter.displayName = "ReliabilityFilter";

export { ReliabilityFilter, SCORE_OPTIONS };
