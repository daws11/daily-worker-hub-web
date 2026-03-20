"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { DAY_NAMES } from "@/lib/algorithms/availability-checker";
import { cn } from "@/lib/utils";

interface AvailabilityCalendarProps {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  availableDates: Date[]; // Dates where worker is available
}

export function AvailabilityCalendar({
  selectedDate,
  onDateSelect,
  availableDates,
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [highlightedDates, setHighlightedDates] = useState<Date[]>([]);

  useEffect(() => {
    setHighlightedDates(availableDates);
  }, [availableDates]);

  // Get days to display in the current month
  const getMonthDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Add padding days from previous/next month for full weeks
    const firstDayOfWeek = days[0].getDay();
    const paddingDays = Array.from({ length: firstDayOfWeek }, (_, i) => {
      const day = new Date(monthStart);
      day.setDate(day.getDate() - firstDayOfWeek + i);
      return day;
    });

    const lastDayOfWeek = days[days.length - 1].getDay();
    const remainingDays = Array.from({ length: 6 - lastDayOfWeek }, (_, i) => {
      const day = new Date(monthEnd);
      day.setDate(day.getDate() + i + 1);
      return day;
    });

    return [...paddingDays, ...days, ...remainingDays];
  };

  // Check if a date is available
  const isDateAvailable = (date: Date): boolean => {
    return highlightedDates.some(
      (d) =>
        d.getDate() === date.getDate() &&
        d.getMonth() === date.getMonth() &&
        d.getFullYear() === date.getFullYear(),
    );
  };

  const monthDays = getMonthDays();

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Availability Calendar
        </CardTitle>
        <CardDescription>
          Select a date to view or set your availability
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Calendar Header */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={previousMonth}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((date, index) => {
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isAvailable = isDateAvailable(date);

              return (
                <button
                  key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${index}`}
                  onClick={() => onDateSelect(date)}
                  disabled={!isCurrentMonth}
                  className={cn(
                    "aspect-square rounded-md text-sm font-medium transition-colors",
                    "hover:bg-muted/50 disabled:opacity-30 disabled:hover:bg-transparent",
                    isSelected && "ring-2 ring-primary ring-offset-2",
                    isAvailable &&
                      "bg-green-100 text-green-900 hover:bg-green-200",
                    !isAvailable && isCurrentMonth && "hover:bg-muted",
                    "flex items-center justify-center",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
              <span className="text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border" />
              <span className="text-muted-foreground">Not set</span>
            </div>
          </div>

          {/* Selected date info */}
          {selectedDate && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {DAY_NAMES[selectedDate.getDay()]}
                  </p>
                </div>
                {isDateAvailable(selectedDate) && (
                  <Badge
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Available
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Available dates count */}
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {highlightedDates.length} day
                {highlightedDates.length !== 1 ? "s" : ""} marked as available
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
