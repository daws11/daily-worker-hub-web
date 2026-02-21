/**
 * Rate Bali - UMK 2025 Based Wage Standards
 *
 * Minimum wage rates based on UMK (Upah Minimum Kabupaten/Kota) 2025 for Bali Province.
 * Rates are calculated as hourly wages based on:
 * - 22 working days per month
 * - 8 working hours per day
 * - 176 working hours per month
 *
 * Source: Bali Provincial Government, Human Resources and Energy Agency
 * SK No. B.21.500.15/18055/IV/DISNAKER.ESDM (December 16, 2024)
 */

export interface RegencyRate {
  regency: string
  monthlyUmk: number
  hourlyRate: number
  dailyRate: number
}

export interface PositionRate {
  position: string
  multiplier: number
  description: string
}

export interface WageRate {
  regency: string
  position: string
  hourlyMin: number
  hourlyRecommended: number
  dailyMin: number
  dailyRecommended: number
  monthlyMin: number
  monthlyRecommended: number
}

/**
 * UMK 2025 Rates by Regency
 * Monthly minimum wages in Indonesian Rupiah (IDR)
 */
export const REGENCY_RATES: RegencyRate[] = [
  {
    regency: 'Badung',
    monthlyUmk: 3534339,
    hourlyRate: Math.round(3534339 / 176),
    dailyRate: Math.round(3534339 / 22),
  },
  {
    regency: 'Denpasar',
    monthlyUmk: 3298117,
    hourlyRate: Math.round(3298117 / 176),
    dailyRate: Math.round(3298117 / 22),
  },
  {
    regency: 'Gianyar',
    monthlyUmk: 3119080,
    hourlyRate: Math.round(3119080 / 176),
    dailyRate: Math.round(3119080 / 22),
  },
  {
    regency: 'Tabanan',
    monthlyUmk: 3102520,
    hourlyRate: Math.round(3102520 / 176),
    dailyRate: Math.round(3102520 / 22),
  },
  {
    regency: 'Jembrana',
    monthlyUmk: 2996561,
    hourlyRate: Math.round(2996561 / 176),
    dailyRate: Math.round(2996561 / 22),
  },
  {
    regency: 'Buleleng',
    monthlyUmk: 2996561,
    hourlyRate: Math.round(2996561 / 176),
    dailyRate: Math.round(2996561 / 22),
  },
  {
    regency: 'Klungkung',
    monthlyUmk: 2996561,
    hourlyRate: Math.round(2996561 / 176),
    dailyRate: Math.round(2996561 / 22),
  },
  {
    regency: 'Karangasem',
    monthlyUmk: 2996561,
    hourlyRate: Math.round(2996561 / 176),
    dailyRate: Math.round(2996561 / 22),
  },
  {
    regency: 'Bangli',
    monthlyUmk: 2996561,
    hourlyRate: Math.round(2996561 / 176),
    dailyRate: Math.round(2996561 / 22),
  },
]

/**
 * Position type multipliers based on skill level and market demand
 * Base multiplier: 1.0 (UMK minimum)
 * Multipliers account for specialized skills, experience, and industry standards
 */
export const POSITION_RATES: PositionRate[] = [
  // Entry-level positions
  { position: 'Housekeeping', multiplier: 1.0, description: 'General cleaning and hotel room maintenance' },
  { position: 'Laundry Staff', multiplier: 1.0, description: 'Laundry and linen management' },
  { position: 'Pool Attendant', multiplier: 1.0, description: 'Pool safety and maintenance' },
  { position: 'Gardener', multiplier: 1.0, description: 'Landscaping and garden maintenance' },

  // Service positions
  { position: 'Server', multiplier: 1.1, description: 'Food and beverage service' },
  { position: 'Event Staff', multiplier: 1.1, description: 'Event setup and support' },

  // Skilled service positions
  { position: 'Steward', multiplier: 1.15, description: 'Kitchen and dining area cleaning' },
  { position: 'Kitchen Staff', multiplier: 1.2, description: 'Food preparation assistance' },
  { position: 'Driver', multiplier: 1.2, description: 'Transportation services' },

  // Specialized positions
  { position: 'Bartender', multiplier: 1.25, description: 'Beverage preparation and service' },
  { position: 'Receptionist', multiplier: 1.25, description: 'Front desk and guest services' },

  // Highly specialized positions
  { position: 'Spa Therapist', multiplier: 1.4, description: 'Spa and wellness services' },
  { position: 'Maintenance', multiplier: 1.3, description: 'Facility maintenance and repairs' },
]

/**
 * Get UMK rate by regency name
 */
export function getRegencyRate(regency: string): RegencyRate | undefined {
  return REGENCY_RATES.find(rate => rate.regency === regency)
}

/**
 * Get position rate multiplier by position name
 */
export function getPositionRate(position: string): PositionRate | undefined {
  return POSITION_RATES.find(rate => rate.position.toLowerCase() === position.toLowerCase())
}

/**
 * Calculate recommended wage rate for a specific position and regency
 *
 * @param position - Position type (e.g., 'Housekeeping', 'Server')
 * @param regency - Regency name (e.g., 'Badung', 'Denpasar')
 * @returns WageRate object with min and recommended rates
 */
export function getWageRate(position: string, regency: string): WageRate | null {
  const regencyRate = getRegencyRate(regency)
  const positionRate = getPositionRate(position)

  if (!regencyRate || !positionRate) {
    return null
  }

  const hourlyMin = regencyRate.hourlyRate
  const hourlyRecommended = Math.round(hourlyMin * positionRate.multiplier)
  const dailyMin = regencyRate.dailyRate
  const dailyRecommended = Math.round(dailyMin * positionRate.multiplier)
  const monthlyMin = regencyRate.monthlyUmk
  const monthlyRecommended = Math.round(monthlyMin * positionRate.multiplier)

  return {
    regency,
    position,
    hourlyMin,
    hourlyRecommended,
    dailyMin,
    dailyRecommended,
    monthlyMin,
    monthlyRecommended,
  }
}

/**
 * Get all wage rates for a specific regency
 */
export function getAllWageRatesByRegency(regency: string): WageRate[] {
  const regencyRate = getRegencyRate(regency)
  if (!regencyRate) {
    return []
  }

  return POSITION_RATES.map(positionRate => {
    const hourlyMin = regencyRate.hourlyRate
    const hourlyRecommended = Math.round(hourlyMin * positionRate.multiplier)
    const dailyMin = regencyRate.dailyRate
    const dailyRecommended = Math.round(dailyMin * positionRate.multiplier)
    const monthlyMin = regencyRate.monthlyUmk
    const monthlyRecommended = Math.round(monthlyMin * positionRate.multiplier)

    return {
      regency,
      position: positionRate.position,
      hourlyMin,
      hourlyRecommended,
      dailyMin,
      dailyRecommended,
      monthlyMin,
      monthlyRecommended,
    }
  })
}

/**
 * Format currency to Indonesian Rupiah (IDR)
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Get formatted wage display string
 */
export function getWageDisplayString(rate: WageRate, type: 'hourly' | 'daily' | 'monthly' = 'hourly'): string {
  const values = {
    hourly: { min: rate.hourlyMin, recommended: rate.hourlyRecommended },
    daily: { min: rate.dailyMin, recommended: rate.dailyRecommended },
    monthly: { min: rate.monthlyMin, recommended: rate.monthlyRecommended },
  }[type]

  return `${formatRupiah(values.min)} - ${formatRupiah(values.recommended)}`
}
