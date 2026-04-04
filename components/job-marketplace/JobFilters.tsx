"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobFilters as JobFiltersType, PositionType } from "@/lib/types/job";
import { X, Filter, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/hooks";

interface JobFiltersProps {
  filters?: JobFiltersType;
  onFiltersChange: (filters: JobFiltersType) => void;
  className?: string;
}

export function JobFilters({
  filters,
  onFiltersChange,
  className,
}: JobFiltersProps) {
  const { t } = useTranslation();

  const positionTypes: { value: PositionType; label: string }[] = useMemo(
    () => [
      { value: "full_time", label: t("jobs.fullTime") },
      { value: "part_time", label: t("jobs.partTime") },
      { value: "contract", label: t("jobs.contract") },
      { value: "temporary", label: t("jobs.temporary") },
    ],
    [t],
  );

  const [localFilters, setLocalFilters] = useState<JobFiltersType>(
    filters || {},
  );
  const [wageMin, setWageMin] = useState<string>(
    filters?.wageMin?.toString() || "",
  );
  const [wageMax, setWageMax] = useState<string>(
    filters?.wageMax?.toString() || "",
  );
  const [deadlineAfter, setDeadlineAfter] = useState<string>(
    filters?.deadlineAfter || "",
  );
  const [deadlineBefore, setDeadlineBefore] = useState<string>(
    filters?.deadlineBefore || "",
  );

  const hasActiveFilters = Boolean(
    localFilters.positionType ||
    localFilters.area ||
    localFilters.wageMin ||
    localFilters.wageMax ||
    localFilters.deadlineAfter ||
    localFilters.deadlineBefore,
  );

  const handlePositionChange = (value: string) => {
    const newFilters = {
      ...localFilters,
      positionType: value === "all" ? undefined : (value as PositionType),
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleAreaChange = (value: string) => {
    const newFilters = {
      ...localFilters,
      area: value || undefined,
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleWageMinChange = (value: string) => {
    setWageMin(value);
    const numValue = value ? parseInt(value, 10) : undefined;
    const newFilters = {
      ...localFilters,
      wageMin: numValue,
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleWageMaxChange = (value: string) => {
    setWageMax(value);
    const numValue = value ? parseInt(value, 10) : undefined;
    const newFilters = {
      ...localFilters,
      wageMax: numValue,
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleDeadlineAfterChange = (value: string) => {
    setDeadlineAfter(value);
    const newFilters = {
      ...localFilters,
      deadlineAfter: value || undefined,
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleDeadlineBeforeChange = (value: string) => {
    setDeadlineBefore(value);
    const newFilters = {
      ...localFilters,
      deadlineBefore: value || undefined,
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters: JobFiltersType = {};
    setLocalFilters(clearedFilters);
    setWageMin("");
    setWageMax("");
    setDeadlineAfter("");
    setDeadlineBefore("");
    onFiltersChange(clearedFilters);
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {t("jobs.filters")}
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              {t("common.clearAll")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Position Type Filter */}
        <div className="space-y-2">
          <Label htmlFor="position-type" className="text-sm">
            {t("jobs.positionType")}
          </Label>
          <Select
            value={localFilters.positionType || undefined}
            onValueChange={(value) => handlePositionChange(value as string)}
          >
            <SelectTrigger id="position-type">
              <SelectValue placeholder={t("jobs.allPositions")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("jobs.allPositions")}</SelectItem>
              {positionTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Area Filter */}
        <div className="space-y-2">
          <Label htmlFor="area" className="text-sm">
            {t("jobs.areaLocation")}
          </Label>
          <Input
            id="area"
            type="text"
            placeholder={t("jobs.areaPlaceholder")}
            value={localFilters.area || ""}
            onChange={(e) => handleAreaChange(e.target.value)}
          />
        </div>

        {/* Wage Range Filter */}
        <div className="space-y-2">
          <Label className="text-sm">{t("jobs.wageRange")}</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder={t("jobs.minWage")}
                min="0"
                value={wageMin}
                onChange={(e) => handleWageMinChange(e.target.value)}
              />
            </div>
            <span className="text-muted-foreground text-sm">
              {t("common.to")}
            </span>
            <div className="flex-1">
              <Input
                type="number"
                placeholder={t("jobs.maxWage")}
                min="0"
                value={wageMax}
                onChange={(e) => handleWageMaxChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Deadline Filter */}
        <div className="space-y-2">
          <Label className="text-sm">{t("jobs.deadline")}</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal px-3 h-10",
                        !deadlineAfter && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deadlineAfter ? format(new Date(deadlineAfter), "dd MMM yyyy") : <span>{t("common.date")}</span>}
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadlineAfter ? new Date(deadlineAfter) : undefined}
                    onSelect={(date) => handleDeadlineAfterChange(date ? format(date, "yyyy-MM-dd") : "")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <span className="text-muted-foreground text-sm">
              {t("common.to")}
            </span>
            <div className="flex-1">
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal px-3 h-10",
                        !deadlineBefore && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deadlineBefore ? format(new Date(deadlineBefore), "dd MMM yyyy") : <span>{t("common.date")}</span>}
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadlineBefore ? new Date(deadlineBefore) : undefined}
                    onSelect={(date) => handleDeadlineBeforeChange(date ? format(date, "yyyy-MM-dd") : "")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
