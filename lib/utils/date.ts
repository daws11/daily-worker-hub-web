/**
 * Format a date string in Indonesian locale
 * @param dateString - ISO date string (e.g., "2026-02-25")
 * @returns Formatted date string (e.g., "Selasa, 25 Februari 2026")
 */
export function formatDateIndo(dateString: string): string {
  const date = new Date(dateString)

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`)
  }

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Get month key in YYYY-MM format from a date string
 * @param dateString - ISO date string (e.g., "2026-02-25")
 * @returns Month key (e.g., "2026-02")
 */
export function getMonthKey(dateString: string): string {
  const date = new Date(dateString)

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`)
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Format month name in Indonesian from a month key
 * @param monthKey - Month key in YYYY-MM format (e.g., "2026-02")
 * @returns Formatted month name (e.g., "Februari 2026")
 */
export function formatMonthNameIndo(monthKey: string): string {
  const [year, month] = monthKey.split('-')

  if (!year || !month || month.length !== 2) {
    throw new Error(`Invalid month key format: ${monthKey}. Expected YYYY-MM`)
  }

  const date = new Date(`${year}-${month}-01`)

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid month key: ${monthKey}`)
  }

  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Format a short date in Indonesian locale (without weekday)
 * @param dateString - ISO date string (e.g., "2026-02-25")
 * @returns Formatted date string (e.g., "25 Februari 2026")
 */
export function formatShortDateIndo(dateString: string): string {
  const date = new Date(dateString)

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`)
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Get the start of month as ISO date string
 * @param dateString - ISO date string (e.g., "2026-02-25")
 * @returns Start of month ISO string (e.g., "2026-02-01T00:00:00.000Z")
 */
export function getStartOfMonth(dateString: string): string {
  const date = new Date(dateString)

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`)
  }

  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  return startOfMonth.toISOString()
}

/**
 * Get the end of month as ISO date string
 * @param dateString - ISO date string (e.g., "2026-02-25")
 * @returns End of month ISO string (e.g., "2026-02-28T23:59:59.999Z")
 */
export function getEndOfMonth(dateString: string): string {
  const date = new Date(dateString)

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`)
  }

  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return endOfMonth.toISOString()
}

/**
 * Get the start of day as ISO date string
 * @param dateString - ISO date string (e.g., "2026-02-25")
 * @returns Start of day ISO string (e.g., "2026-02-25T00:00:00.000Z")
 */
export function getStartOfDay(dateString: string): string {
  const date = new Date(dateString)

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`)
  }

  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  return startOfDay.toISOString()
}

/**
 * Get the end of day as ISO date string
 * @param dateString - ISO date string (e.g., "2026-02-25")
 * @returns End of day ISO string (e.g., "2026-02-25T23:59:59.999Z")
 */
export function getEndOfDay(dateString: string): string {
  const date = new Date(dateString)

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`)
  }

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  return endOfDay.toISOString()
}

/**
 * Check if a date string is within a date range
 * @param dateString - ISO date string to check
 * @param startDate - Start date ISO string
 * @param endDate - End date ISO string
 * @returns True if the date is within the range
 */
export function isDateInRange(dateString: string, startDate: string, endDate: string): boolean {
  const date = new Date(dateString)
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (isNaN(date.getTime()) || isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error(`Invalid date string provided`)
  }

  return date >= start && date <= end
}
