/**
 * Rate Bali - UMK 2025 Based Wage Standards
 *
 * Minimum wage rates based on UMK (Upah Minimum Kabupaten/Kota) 2025 for Bali Province.
 *
 * Source: Bali Provincial Government, Human Resources and Energy Agency
 * SK No. B.21.500.15/18055/IV/DISNAKER.ESDM (December 16, 2024)
 */

/**
 * Standard working days per month used in UMK calculations.
 * Based on Indonesian labor standard (21-22 working days/month).
 * Used as divisor when deriving daily rates from monthly UMK.
 */
export const WORK_DAYS_PER_MONTH = 22;

/**
 * Standard working hours per day as per Indonesian labor law (PP No. 78/2015).
 * Maximum regular working hours without triggering overtime provisions.
 * Used as divisor when deriving hourly rates from monthly UMK.
 */
export const WORKING_HOURS_PER_DAY = 8;

/**
 * Standard working hours per month for full-time employment.
 * Calculated as: WORK_DAYS_PER_MONTH (22) × WORKING_HOURS_PER_DAY (8) = 176.
 * Used as divisor when deriving hourly rates from monthly UMK.
 */
export const WORKING_HOURS_PER_MONTH = WORK_DAYS_PER_MONTH * WORKING_HOURS_PER_DAY; // 176

export interface RegencyRate {
  regency: string;
  monthlyUmk: number;
  hourlyRate: number;
  dailyRate: number;
}

export interface PositionRate {
  position: string;
  multiplier: number;
  description: string;
}

export interface WageRate {
  regency: string;
  position: string;
  hourlyMin: number;
  hourlyRecommended: number;
  dailyMin: number;
  dailyRecommended: number;
  monthlyMin: number;
  monthlyRecommended: number;
}

/**
 * Hourly rate by category and region (IDR/Jam)
 * Based on market data from Indeed, Kitalulus, and UMK standards
 */
export interface CategoryRate {
  category: string;
  denpasar: number;
  gianyar: number;
  badung: number;
  otherBali: number;
}

export const CATEGORY_RATES: CategoryRate[] = [
  {
    category: "Housekeeping",
    denpasar: 20000,
    gianyar: 19000,
    badung: 18500,
    otherBali: 18000,
  },
  {
    category: "Waiter",
    denpasar: 22000,
    gianyar: 21000,
    badung: 20500,
    otherBali: 20000,
  },
  {
    category: "Cook Helper",
    denpasar: 21000,
    gianyar: 20000,
    badung: 19500,
    otherBali: 19000,
  },
  {
    category: "Cook (Line)",
    denpasar: 25000,
    gianyar: 24000,
    badung: 23500,
    otherBali: 23000,
  },
  {
    category: "Cook (Head)",
    denpasar: 35000,
    gianyar: 34000,
    badung: 33000,
    otherBali: 32000,
  },
  {
    category: "Steward",
    denpasar: 23000,
    gianyar: 22000,
    badung: 21500,
    otherBali: 21000,
  },
  {
    category: "Driver",
    denpasar: 24000,
    gianyar: 23000,
    badung: 22500,
    otherBali: 22000,
  },
  {
    category: "Bellman",
    denpasar: 21000,
    gianyar: 20000,
    badung: 19500,
    otherBali: 19000,
  },
  {
    category: "Front Desk",
    denpasar: 28000,
    gianyar: 27000,
    badung: 26000,
    otherBali: 26000,
  },
  {
    category: "Spa/Therapist",
    denpasar: 30000,
    gianyar: 29000,
    badung: 28000,
    otherBali: 28000,
  },
];

/**
 * UMK 2025 Rates by Regency
 * Monthly minimum wages in Indonesian Rupiah (IDR)
 *
 * Fee calculation:
 * - hourlyRate = monthlyUmk / WORKING_HOURS_PER_MONTH (176)
 * - dailyRate  = monthlyUmk / WORK_DAYS_PER_MONTH (22)
 */
export const REGENCY_RATES: RegencyRate[] = [
  {
    regency: "Badung",
    monthlyUmk: 3534339,
    hourlyRate: Math.round(3534339 / WORKING_HOURS_PER_MONTH),
    dailyRate: Math.round(3534339 / WORK_DAYS_PER_MONTH),
  },
  {
    regency: "Denpasar",
    monthlyUmk: 3298117,
    hourlyRate: Math.round(3298117 / WORKING_HOURS_PER_MONTH),
    dailyRate: Math.round(3298117 / WORK_DAYS_PER_MONTH),
  },
  {
    regency: "Gianyar",
    monthlyUmk: 3119080,
    hourlyRate: Math.round(3119080 / WORKING_HOURS_PER_MONTH),
    dailyRate: Math.round(3119080 / WORK_DAYS_PER_MONTH),
  },
  {
    regency: "Tabanan",
    monthlyUmk: 3102520,
    hourlyRate: Math.round(3102520 / WORKING_HOURS_PER_MONTH),
    dailyRate: Math.round(3102520 / WORK_DAYS_PER_MONTH),
  },
  {
    regency: "Jembrana",
    monthlyUmk: 2996561,
    hourlyRate: Math.round(2996561 / WORKING_HOURS_PER_MONTH),
    dailyRate: Math.round(2996561 / WORK_DAYS_PER_MONTH),
  },
  {
    regency: "Buleleng",
    monthlyUmk: 2996561,
    hourlyRate: Math.round(2996561 / WORKING_HOURS_PER_MONTH),
    dailyRate: Math.round(2996561 / WORK_DAYS_PER_MONTH),
  },
  {
    regency: "Klungkung",
    monthlyUmk: 2996561,
    hourlyRate: Math.round(2996561 / WORKING_HOURS_PER_MONTH),
    dailyRate: Math.round(2996561 / WORK_DAYS_PER_MONTH),
  },
  {
    regency: "Karangasem",
    monthlyUmk: 2996561,
    hourlyRate: Math.round(2996561 / WORKING_HOURS_PER_MONTH),
    dailyRate: Math.round(2996561 / WORK_DAYS_PER_MONTH),
  },
  {
    regency: "Bangli",
    monthlyUmk: 2996561,
    hourlyRate: Math.round(2996561 / WORKING_HOURS_PER_MONTH),
    dailyRate: Math.round(2996561 / WORK_DAYS_PER_MONTH),
  },
];

/**
 * Position type multipliers based on skill level and market demand
 * Base multiplier: 1.0 (UMK minimum)
 * Multipliers account for specialized skills, experience, and industry standards
 */
export const POSITION_RATES: PositionRate[] = [
  // Entry-level positions
  {
    position: "Housekeeping",
    multiplier: 1.0,
    description: "General cleaning and hotel room maintenance",
  },
  {
    position: "Laundry Staff",
    multiplier: 1.0,
    description: "Laundry and linen management",
  },
  {
    position: "Pool Attendant",
    multiplier: 1.0,
    description: "Pool safety and maintenance",
  },
  {
    position: "Gardener",
    multiplier: 1.0,
    description: "Landscaping and garden maintenance",
  },

  // Service positions
  {
    position: "Server",
    multiplier: 1.1,
    description: "Food and beverage service",
  },
  {
    position: "Event Staff",
    multiplier: 1.1,
    description: "Event setup and support",
  },

  // Skilled service positions
  {
    position: "Steward",
    multiplier: 1.15,
    description: "Kitchen and dining area cleaning",
  },
  {
    position: "Kitchen Staff",
    multiplier: 1.2,
    description: "Food preparation assistance",
  },
  {
    position: "Driver",
    multiplier: 1.2,
    description: "Transportation services",
  },

  // Specialized positions
  {
    position: "Bartender",
    multiplier: 1.25,
    description: "Beverage preparation and service",
  },
  {
    position: "Receptionist",
    multiplier: 1.25,
    description: "Front desk and guest services",
  },

  // Highly specialized positions
  {
    position: "Spa Therapist",
    multiplier: 1.4,
    description: "Spa and wellness services",
  },
  {
    position: "Maintenance",
    multiplier: 1.3,
    description: "Facility maintenance and repairs",
  },
];

/**
 * Get UMK rate by regency name
 */
export function getRegencyRate(regency: string): RegencyRate | undefined {
  return REGENCY_RATES.find((rate) => rate.regency === regency);
}

/**
 * Get position rate multiplier by position name
 */
export function getPositionRate(position: string): PositionRate | undefined {
  return POSITION_RATES.find(
    (rate) => rate.position.toLowerCase() === position.toLowerCase(),
  );
}

/**
 * Calculate recommended wage rate for a specific position and regency
 *
 * @param position - Position type (e.g., 'Housekeeping', 'Server')
 * @param regency - Regency name (e.g., 'Badung', 'Denpasar')
 * @returns WageRate object with min and recommended rates
 */
export function getWageRate(
  position: string,
  regency: string,
): WageRate | null {
  const regencyRate = getRegencyRate(regency);
  const positionRate = getPositionRate(position);

  if (!regencyRate || !positionRate) {
    return null;
  }

  const hourlyMin = regencyRate.hourlyRate;
  const hourlyRecommended = Math.round(hourlyMin * positionRate.multiplier);
  const dailyMin = regencyRate.dailyRate;
  const dailyRecommended = Math.round(dailyMin * positionRate.multiplier);
  const monthlyMin = regencyRate.monthlyUmk;
  const monthlyRecommended = Math.round(monthlyMin * positionRate.multiplier);

  return {
    regency,
    position,
    hourlyMin,
    hourlyRecommended,
    dailyMin,
    dailyRecommended,
    monthlyMin,
    monthlyRecommended,
  };
}

/**
 * Get all wage rates for a specific regency
 */
export function getAllWageRatesByRegency(regency: string): WageRate[] {
  const regencyRate = getRegencyRate(regency);
  if (!regencyRate) {
    return [];
  }

  return POSITION_RATES.map((positionRate) => {
    const hourlyMin = regencyRate.hourlyRate;
    const hourlyRecommended = Math.round(hourlyMin * positionRate.multiplier);
    const dailyMin = regencyRate.dailyRate;
    const dailyRecommended = Math.round(dailyMin * positionRate.multiplier);
    const monthlyMin = regencyRate.monthlyUmk;
    const monthlyRecommended = Math.round(monthlyMin * positionRate.multiplier);

    return {
      regency,
      position: positionRate.position,
      hourlyMin,
      hourlyRecommended,
      dailyMin,
      dailyRecommended,
      monthlyMin,
      monthlyRecommended,
    };
  });
}

/**
 * Format currency to Indonesian Rupiah (IDR)
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get formatted wage display string
 */
export function getWageDisplayString(
  rate: WageRate,
  type: "hourly" | "daily" | "monthly" = "hourly",
): string {
  const values = {
    hourly: { min: rate.hourlyMin, recommended: rate.hourlyRecommended },
    daily: { min: rate.dailyMin, recommended: rate.dailyRecommended },
    monthly: { min: rate.monthlyMin, recommended: rate.monthlyRecommended },
  }[type];

  return `${formatRupiah(values.min)} - ${formatRupiah(values.recommended)}`;
}

/**
 * Get hourly rate by category and region
 *
 * @param category - Job category
 * @param regency - Region name (Denpasar, Gianyar, Badung, or Other)
 * @returns Hourly rate in IDR
 */
export function getHourlyRate(category: string, regency: string): number {
  const categoryRate = CATEGORY_RATES.find(
    (cr) => cr.category.toLowerCase() === category.toLowerCase(),
  );

  if (!categoryRate) {
    return 0;
  }

  const normalizedRegency = regency.toLowerCase();
  if (normalizedRegency === "denpasar") {
    return categoryRate.denpasar;
  } else if (normalizedRegency === "gianyar") {
    return categoryRate.gianyar;
  } else if (normalizedRegency === "badung") {
    return categoryRate.badung;
  } else {
    return categoryRate.otherBali;
  }
}

/**
 * Regular hours threshold per day (Indonesian labor law PP No. 78/2015).
 * Hours up to and including this value are billed at the base rate.
 */
const REGULAR_HOURS_THRESHOLD = 8;

/**
 * Overtime hours threshold — hours beyond this value trigger overtime billing.
 * Hours >= REGULAR_HOURS_THRESHOLD + 1 are billed at OVERTIME_MULTIPLIER.
 */
const OVERTIME_START_HOUR = REGULAR_HOURS_THRESHOLD + 1; // 9

/**
 * Minimum valid total hours for a shift booking (4 hours minimum engagement).
 * Per Indonesian labor standards, minimum work period is 4 hours.
 */
const MIN_VALID_HOURS = 4;

/**
 * Maximum valid total hours for a single shift booking (12 hours cap).
 * Booking more than 12 hours in one shift requires rebooking as a new shift.
 */
const MAX_VALID_HOURS = 12;

/**
 * Regular rate multiplier — applies to hours within REGULAR_HOURS_THRESHOLD (≤ 8h).
 */
const REGULAR_RATE_MULTIPLIER = 1.0;

/**
 * Overtime rate multiplier — applies to hours beyond REGULAR_HOURS_THRESHOLD (≥ 9h).
 * Per Indonesian labor law (UU No. 13/2003): 1.5× for hours beyond the first extra hour.
 */
const OVERTIME_RATE_MULTIPLIER = 1.5;

/**
 * Get overtime multiplier based on total hours needed.
 *
 * @param hoursNeeded - Total shift hours (4–12)
 * @returns 1.0 for regular hours (≤ 8), 1.5 for overtime hours (≥ 9)
 */
export function getOvertimeMultiplier(hoursNeeded: number): number {
  if (hoursNeeded >= OVERTIME_START_HOUR) {
    return OVERTIME_RATE_MULTIPLIER;
  }
  return REGULAR_RATE_MULTIPLIER;
}

/**
 * Get regular and overtime hours breakdown for a shift.
 *
 * Breakdown:
 * - Regular hours: min(totalHours, REGULAR_HOURS_THRESHOLD) — capped at 8
 * - Overtime hours: max(totalHours - REGULAR_HOURS_THRESHOLD, 0) — hours beyond 8
 *
 * @param hoursNeeded - Total shift hours (4–12)
 * @returns Object with regularHours and overtimeHours
 */
export function getHoursBreakdown(hoursNeeded: number): {
  regularHours: number;
  overtimeHours: number;
} {
  if (hoursNeeded <= REGULAR_HOURS_THRESHOLD) {
    return {
      regularHours: hoursNeeded,
      overtimeHours: 0,
    };
  } else {
    return {
      regularHours: REGULAR_HOURS_THRESHOLD,
      overtimeHours: hoursNeeded - REGULAR_HOURS_THRESHOLD,
    };
  }
}

/**
 * Validate that a given hour value falls within the permitted shift range.
 *
 * Valid range: MIN_VALID_HOURS (4) to MAX_VALID_HOURS (12), inclusive.
 * Must be an integer.
 *
 * @param hours - Total shift hours to validate
 * @returns True if hours are within [4, 12] and an integer
 */
export function isValidHours(hours: number): boolean {
  return (
    hours >= MIN_VALID_HOURS &&
    hours <= MAX_VALID_HOURS &&
    Number.isInteger(hours)
  );
}
