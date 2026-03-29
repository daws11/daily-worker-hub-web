/**
 * Worker Availability Checker
 *
 * Implements availability validation and scoring logic:
 * - Check if worker is available for a specific time period
 * - Validate 4-12 hour availability blocks
 * - Calculate availability score (0-20 points)
 */

import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type WorkerAvailability =
  Database["public"]["Tables"]["worker_availabilities"]["Row"];

/**
 * Day of week constants
 */
export const DAYS_OF_WEEK = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
} as const;

/**
 * Day names for display
 */
export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Minimum and maximum availability block hours
 */
export const MIN_BLOCK_HOURS = 4;
export const MAX_BLOCK_HOURS = 12;

/**
 * Validate an availability block (4-12 hours)
 *
 * @param startHour - Start hour (0-23)
 * @param endHour - End hour (0-23)
 * @returns Validation result with error message if invalid
 */
export function validateAvailabilityBlock(
  startHour: number,
  endHour: number,
): { valid: boolean; error?: string } {
  // Check hours are valid
  if (startHour < 0 || startHour > 23) {
    return { valid: false, error: "Start hour must be between 0 and 23" };
  }
  if (endHour < 0 || endHour > 23) {
    return { valid: false, error: "End hour must be between 0 and 23" };
  }

  // Check end is after start
  if (endHour <= startHour) {
    return { valid: false, error: "End hour must be after start hour" };
  }

  // Check block duration is 4-12 hours
  const duration = endHour - startHour;
  if (duration < MIN_BLOCK_HOURS) {
    return {
      valid: false,
      error: `Availability must be at least ${MIN_BLOCK_HOURS} hours`,
    };
  }
  if (duration > MAX_BLOCK_HOURS) {
    return {
      valid: false,
      error: `Availability cannot exceed ${MAX_BLOCK_HOURS} hours`,
    };
  }

  return { valid: true };
}

/**
 * Get worker's availability for all days
 *
 * @param workerId - Worker ID
 * @returns Array of availability records for all days
 */
export async function getWorkerAvailability(
  workerId: string,
): Promise<WorkerAvailability[]> {
  const { data, error } = await supabase
    .from("worker_availabilities")
    .select("*")
    .eq("worker_id", workerId)
    .order("day_of_week");

  if (error) {
    console.error("Error fetching worker availability:", error);
    return [];
  }

  return data || [];
}

/**
 * Get worker's availability for a specific day
 *
 * @param workerId - Worker ID
 * @param dayOfWeek - Day of week (1-7)
 * @returns Availability record or null
 */
export async function getWorkerAvailabilityForDay(
  workerId: string,
  dayOfWeek: number,
): Promise<WorkerAvailability | null> {
  const { data, error } = await supabase
    .from("worker_availabilities")
    .select("*")
    .eq("worker_id", workerId)
    .eq("day_of_week", dayOfWeek)
    .single();

  if (error) {
    console.error("Error fetching worker availability for day:", error);
    return null;
  }

  return data;
}

/**
 * Pure availability check logic - determines if a job fits within an availability block.
 * This function performs NO database queries and is suitable for batch processing.
 *
 * @param availability - Worker's availability record for the day (or null if none)
 * @param jobStartHour - Job start hour (0-23)
 * @param jobEndHour - Job end hour (0-23)
 * @returns Whether the job fits within the worker's availability block
 */
export function checkAvailabilityFit(
  availability: WorkerAvailability | null,
  jobStartHour: number,
  jobEndHour: number,
): boolean {
  if (!availability || !availability.is_available) {
    return false;
  }

  const { start_hour, end_hour } = availability;
  return (
    jobStartHour >= start_hour &&
    jobEndHour <= end_hour &&
    jobStartHour < jobEndHour
  );
}

/**
 * Batch-check availability for multiple workers in a single DB query.
 * Avoids the N+1 query problem when checking many workers for the same date/time.
 *
 * @param workerIds - Array of worker IDs to check
 * @param date - Date object (includes day of week)
 * @param jobStartHour - Job start hour (0-23)
 * @param jobEndHour - Job end hour (0-23)
 * @returns Record mapping workerId to availability (true/false)
 */
export async function batchCheckWorkerAvailability(
  workerIds: string[],
  date: Date,
  jobStartHour: number,
  jobEndHour: number,
): Promise<Record<string, boolean>> {
  if (workerIds.length === 0) {
    return {};
  }

  // Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
  const jsDay = date.getDay();
  // Convert to our format (1=Monday, 7=Sunday)
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  // Single batch query for all workers on this day
  const { data, error } = await supabase
    .from("worker_availabilities")
    .select("*")
    .in("worker_id", workerIds)
    .eq("day_of_week", dayOfWeek);

  if (error) {
    console.error("Error batch-fetching worker availabilities:", error);
    // On error, treat all workers as unavailable
    return workerIds.reduce(
      (acc, id) => ({ ...acc, [id]: false }),
      {} as Record<string, boolean>,
    );
  }

  // Build lookup map: workerId -> availability record
  const availabilityMap = new Map<string, WorkerAvailability | null>();
  for (const record of data || []) {
    availabilityMap.set(record.worker_id, record);
  }

  // Determine availability for each worker using pure logic
  return workerIds.reduce(
    (acc, workerId) => {
      const availability = availabilityMap.get(workerId) ?? null;
      acc[workerId] = checkAvailabilityFit(availability, jobStartHour, jobEndHour);
      return acc;
    },
    {} as Record<string, boolean>,
  );
}

/**
 * Check if worker is available for a specific time period
 *
 * @param workerId - Worker ID
 * @param date - Date object (includes day of week)
 * @param jobStartHour - Job start hour (0-23)
 * @param jobEndHour - Job end hour (0-23)
 * @returns Whether worker is available
 */
export async function isWorkerAvailable(
  workerId: string,
  date: Date,
  jobStartHour: number,
  jobEndHour: number,
): Promise<boolean> {
  // Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
  const jsDay = date.getDay();
  // Convert to our format (1=Monday, 7=Sunday)
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  // Get worker's availability for this day
  const availability = await getWorkerAvailabilityForDay(workerId, dayOfWeek);

  if (!availability || !availability.is_available) {
    return false;
  }

  // Check if job fits within availability block
  const { start_hour, end_hour } = availability;
  return (
    jobStartHour >= start_hour &&
    jobEndHour <= end_hour &&
    jobStartHour < jobEndHour
  );
}

/**
 * Calculate availability score for a worker-job pair (0-20 points)
 *
 * @param workerId - Worker ID
 * @param date - Date object (includes day of week)
 * @param jobStartHour - Job start hour (0-23)
 * @param jobEndHour - Job end hour (0-23)
 * @returns Availability score (0-20)
 */
export async function calculateAvailabilityScore(
  workerId: string,
  date: Date,
  jobStartHour: number,
  jobEndHour: number,
): Promise<number> {
  const isAvailable = await isWorkerAvailable(
    workerId,
    date,
    jobStartHour,
    jobEndHour,
  );

  return isAvailable ? 20 : 0;
}

/**
 * Check if worker is available for multiple dates
 *
 * @param workerId - Worker ID
 * @param dates - Array of date objects
 * @param jobStartHour - Job start hour (0-23)
 * @param jobEndHour - Job end hour (0-23)
 * @returns Array of availability results for each date
 */
export async function checkWorkerAvailabilityForDates(
  workerId: string,
  dates: Date[],
  jobStartHour: number,
  jobEndHour: number,
): Promise<{ date: Date; available: boolean }[]> {
  const results = await Promise.all(
    dates.map(async (date) => ({
      date,
      available: await isWorkerAvailable(
        workerId,
        date,
        jobStartHour,
        jobEndHour,
      ),
    })),
  );

  return results;
}

/**
 * Get workers available for a specific date and time
 *
 * @param dayOfWeek - Day of week (1-7)
 * @param jobStartHour - Job start hour (0-23)
 * @param jobEndHour - Job end hour (0-23)
 * @returns Array of worker IDs that are available
 */
export async function getAvailableWorkers(
  dayOfWeek: number,
  jobStartHour: number,
  jobEndHour: number,
): Promise<string[]> {
  // Get all workers with availability for this day
  const { data, error } = await supabase
    .from("worker_availabilities")
    .select("worker_id, start_hour, end_hour")
    .eq("day_of_week", dayOfWeek)
    .eq("is_available", true);

  if (error) {
    console.error("Error fetching available workers:", error);
    return [];
  }

  // Filter workers whose availability covers the job time
  const availableWorkers = (data || [])
    .filter(
      (a) =>
        a.start_hour <= jobStartHour &&
        a.end_hour >= jobEndHour &&
        jobStartHour < jobEndHour,
    )
    .map((a) => a.worker_id);

  return availableWorkers;
}

/**
 * Set or update worker's availability for a day
 *
 * @param workerId - Worker ID
 * @param dayOfWeek - Day of week (1-7)
 * @param startHour - Start hour (0-23)
 * @param endHour - End hour (0-23)
 * @param isAvailable - Whether available on this day
 * @returns Success/error result
 */
export async function setWorkerAvailability(
  workerId: string,
  dayOfWeek: number,
  startHour: number,
  endHour: number,
  isAvailable: boolean = true,
): Promise<{ success: boolean; error?: string }> {
  // Validate the availability block
  if (isAvailable) {
    const validation = validateAvailabilityBlock(startHour, endHour);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
  }

  // Upsert the availability record
  const { error } = await supabase.from("worker_availabilities").upsert(
    {
      worker_id: workerId,
      day_of_week: dayOfWeek,
      start_hour: isAvailable ? startHour : 9, // Default if not available
      end_hour: isAvailable ? endHour : 17, // Default if not available
      is_available: isAvailable,
    },
    {
      onConflict: "worker_id,day_of_week",
    },
  );

  if (error) {
    console.error("Error setting worker availability:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Set worker's availability for multiple days at once
 *
 * @param workerId - Worker ID
 * @param availabilities - Array of availability settings
 * @returns Success/error result
 */
export async function setWorkerAvailabilityForWeek(
  workerId: string,
  availabilities: {
    dayOfWeek: number;
    startHour: number;
    endHour: number;
    isAvailable: boolean;
  }[],
): Promise<{ success: boolean; errors?: string[] }> {
  const errors: string[] = [];

  // Validate all availabilities first
  for (const av of availabilities) {
    if (av.isAvailable) {
      const validation = validateAvailabilityBlock(av.startHour, av.endHour);
      if (!validation.valid) {
        errors.push(`Day ${DAY_NAMES[av.dayOfWeek]}: ${validation.error}`);
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Insert/update all availabilities
  const records = availabilities.map((av) => ({
    worker_id: workerId,
    day_of_week: av.dayOfWeek,
    start_hour: av.isAvailable ? av.startHour : 9,
    end_hour: av.isAvailable ? av.endHour : 17,
    is_available: av.isAvailable,
  }));

  const { error } = await supabase
    .from("worker_availabilities")
    .upsert(records, {
      onConflict: "worker_id,day_of_week",
    });

  if (error) {
    console.error("Error setting worker availability for week:", error);
    return { success: false, errors: [error.message] };
  }

  return { success: true };
}

/**
 * Format hour to display string (e.g., 9 -> "9:00 AM", 14 -> "2:00 PM")
 *
 * @param hour - Hour (0-23)
 * @returns Formatted time string
 */
export function formatHour(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour === 12) return "12:00 PM";

  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${period}`;
}

/**
 * Get availability block duration in hours
 *
 * @param startHour - Start hour (0-23)
 * @param endHour - End hour (0-23)
 * @returns Duration in hours
 */
export function getBlockDuration(startHour: number, endHour: number): number {
  return endHour - startHour;
}
