"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { useTranslation } from "@/lib/i18n/hooks";
import { toast } from "sonner";
import {
  getWorkerAvailability,
  setWorkerAvailabilityForWeek,
  validateAvailabilityBlock,
  formatHour,
  DAY_NAMES,
  MIN_BLOCK_HOURS,
  MAX_BLOCK_HOURS,
} from "@/lib/algorithms/availability-checker";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  CalendarDays,
  Loader2,
  AlertCircle,
  Save,
  CheckCircle,
  X,
} from "lucide-react";
import type { Database } from "@/lib/supabase/types";

type WorkerAvailability =
  Database["public"]["Tables"]["worker_availabilities"]["Row"];

interface DayAvailability {
  dayOfWeek: number;
  isAvailable: boolean;
  startHour: number;
  endHour: number;
}

// Generate hour options (0-23)
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

export default function WorkerAvailabilityPage() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Initialize availability state for all 7 days (1-7, Monday-Sunday)
  const [availability, setAvailability] = useState<DayAvailability[]>(() =>
    Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i + 1, // 1 = Monday, 7 = Sunday
      isAvailable: false,
      startHour: 9,
      endHour: 17,
    })),
  );

  // Fetch existing availability on mount
  const fetchAvailability = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getWorkerAvailability(user.id);

      if (data && data.length > 0) {
        // Map fetched data to state
        const updatedAvailability = availability.map((day) => {
          const existing = data.find((d) => d.day_of_week === day.dayOfWeek);
          if (existing) {
            return {
              ...day,
              isAvailable: existing.is_available ?? false,
              startHour: existing.start_hour ?? 9,
              endHour: existing.end_hour ?? 17,
            };
          }
          return day;
        });
        setAvailability(updatedAvailability);
      }
    } catch (err: any) {
      console.error("Error fetching availability:", err);
      setError(err.message || t("errors.failedToLoadData"));
      toast.error(t("errors.failedToLoadData"));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, t]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Handle toggle availability for a day
  const handleToggleDay = useCallback(
    (dayOfWeek: number, isAvailable: boolean) => {
      setAvailability((prev) =>
        prev.map((day) =>
          day.dayOfWeek === dayOfWeek ? { ...day, isAvailable } : day,
        ),
      );
      setHasChanges(true);
    },
    [],
  );

  // Handle start hour change
  const handleStartHourChange = useCallback(
    (dayOfWeek: number, startHour: number) => {
      setAvailability((prev) =>
        prev.map((day) => {
          if (day.dayOfWeek !== dayOfWeek) return day;

          // Ensure start hour doesn't exceed end hour - MIN_BLOCK_HOURS
          const maxStart = day.endHour - MIN_BLOCK_HOURS;
          const validStartHour = Math.min(startHour, maxStart);

          return { ...day, startHour: validStartHour };
        }),
      );
      setHasChanges(true);
    },
    [],
  );

  // Handle end hour change
  const handleEndHourChange = useCallback(
    (dayOfWeek: number, endHour: number) => {
      setAvailability((prev) =>
        prev.map((day) => {
          if (day.dayOfWeek !== dayOfWeek) return day;

          // Ensure end hour is at least start hour + MIN_BLOCK_HOURS
          const minEnd = day.startHour + MIN_BLOCK_HOURS;
          const validEndHour = Math.max(endHour, minEnd);

          return { ...day, endHour: validEndHour };
        }),
      );
      setHasChanges(true);
    },
    [],
  );

  // Save availability
  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    setIsSaving(true);
    setError(null);

    try {
      // Validate all availability blocks
      const errors: string[] = [];

      availability.forEach((day) => {
        if (day.isAvailable) {
          const validation = validateAvailabilityBlock(
            day.startHour,
            day.endHour,
          );
          if (!validation.valid && validation.error) {
            errors.push(`${DAY_NAMES[day.dayOfWeek % 7]}: ${validation.error}`);
          }
        }
      });

      if (errors.length > 0) {
        setError(errors.join("\n"));
        toast.error(t("errors.validationFailed"));
        setIsSaving(false);
        return;
      }

      // Save to database
      const result = await setWorkerAvailabilityForWeek(
        user.id,
        availability.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          startHour: day.startHour,
          endHour: day.endHour,
          isAvailable: day.isAvailable,
        })),
      );

      if (!result.success) {
        const errorMsg = result.errors?.join("\n") || t("errors.saveFailed");
        setError(errorMsg);
        toast.error(t("errors.saveFailed"));
        return;
      }

      setHasChanges(false);
      setLastSaved(new Date());
      toast.success(t("common.saved"));
    } catch (err: any) {
      console.error("Error saving availability:", err);
      setError(err.message || t("errors.saveFailed"));
      toast.error(t("errors.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, availability, t]);

  // Get day name based on locale
  const getDayName = (dayOfWeek: number) => {
    // dayOfWeek is 1-7 (Mon-Sun), DAY_NAMES array is 0-6 (Sun-Sat)
    const index = dayOfWeek % 7; // Convert 7 (Sunday) to 0
    const dayName = DAY_NAMES[index];

    if (locale === "id") {
      const indonesianDays = [
        "Minggu",
        "Senin",
        "Selasa",
        "Rabu",
        "Kamis",
        "Jumat",
        "Sabtu",
      ];
      return indonesianDays[index];
    }

    return dayName;
  };

  // Calculate total available hours per week
  const totalWeeklyHours = availability.reduce((total, day) => {
    if (day.isAvailable) {
      return total + (day.endHour - day.startHour);
    }
    return total;
  }, 0);

  // Count available days
  const availableDaysCount = availability.filter(
    (day) => day.isAvailable,
  ).length;

  // Format date for display
  const formatLastSaved = () => {
    if (!lastSaved) return null;
    return lastSaved.toLocaleTimeString(locale === "id" ? "id-ID" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6 pb-24 md:pb-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Page Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold">{t("availability.title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("availability.subtitle")}
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-destructive font-medium">
                  {t("common.error")}
                </p>
                <p className="text-sm text-destructive/80 whitespace-pre-line">
                  {error}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("availability.availableDays")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {availableDaysCount}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("availability.of7Days")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("availability.weeklyHours")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {totalWeeklyHours}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("availability.hoursPerWeek")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("availability.minBlock")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {MIN_BLOCK_HOURS}-{MAX_BLOCK_HOURS}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("availability.hoursPerDay")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("availability.weeklySchedule")}</CardTitle>
                <CardDescription>
                  {t("availability.scheduleDescription")}
                </CardDescription>
              </div>
              {lastSaved && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>
                    {t("availability.savedAt")} {formatLastSaved()}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availability.map((day) => (
                <div
                  key={day.dayOfWeek}
                  className={`rounded-lg border p-4 transition-colors ${
                    day.isAvailable
                      ? "bg-primary/5 border-primary/20"
                      : "bg-muted/50 border-muted"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    {/* Day Name and Toggle */}
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={day.isAvailable}
                        onCheckedChange={(checked) =>
                          handleToggleDay(day.dayOfWeek, checked)
                        }
                        size="default"
                      />
                      <div className="flex items-center gap-2">
                        <span className="font-medium min-w-[100px]">
                          {getDayName(day.dayOfWeek)}
                        </span>
                        {day.isAvailable ? (
                          <Badge
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {t("common.available")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {t("common.unavailable")}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Time Selection */}
                    {day.isAvailable && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Select
                            value={day.startHour.toString()}
                            onValueChange={(value) =>
                              handleStartHourChange(
                                day.dayOfWeek,
                                parseInt(value),
                              )
                            }
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {HOUR_OPTIONS.filter(
                                (h) => h < day.endHour - MIN_BLOCK_HOURS + 1,
                              ).map((hour) => (
                                <SelectItem key={hour} value={hour.toString()}>
                                  {formatHour(hour)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <span className="text-muted-foreground">—</span>

                        <Select
                          value={day.endHour.toString()}
                          onValueChange={(value) =>
                            handleEndHourChange(day.dayOfWeek, parseInt(value))
                          }
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {HOUR_OPTIONS.filter(
                              (h) =>
                                h > day.startHour + MIN_BLOCK_HOURS - 1 &&
                                h <= 23,
                            ).map((hour) => (
                              <SelectItem key={hour} value={hour.toString()}>
                                {formatHour(hour)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Badge variant="outline" className="ml-2">
                          {day.endHour - day.startHour}{" "}
                          {t("availability.hours")}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Calendar Preview */}
        <Card>
          <CardHeader>
            <CardTitle>{t("availability.calendarPreview")}</CardTitle>
            <CardDescription>
              {t("availability.calendarDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="multiple"
              className="rounded-md border"
              disabled={{
                before: new Date(),
              }}
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            {hasChanges ? (
              <span className="text-amber-600">
                {t("availability.unsavedChanges")}
              </span>
            ) : lastSaved ? (
              <span className="text-green-600">
                {t("availability.allChangesSaved")}
              </span>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fetchAvailability()}
              disabled={isLoading}
            >
              {t("common.refresh")}
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.saving")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t("common.save")}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium">{t("availability.tips")}</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>
                    {t("availability.tip1", {
                      min: MIN_BLOCK_HOURS,
                      max: MAX_BLOCK_HOURS,
                    })}
                  </li>
                  <li>{t("availability.tip2")}</li>
                  <li>{t("availability.tip3")}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
