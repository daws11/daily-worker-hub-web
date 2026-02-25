import type { Locale } from '@/lib/i18n/types'

/**
 * Map locale code to BCP 47 language tag for date formatting
 * @param locale - Locale code ('id' or 'en')
 * @returns BCP 47 language tag (e.g., 'id-ID', 'en-US')
 */
function getDateTimeLocale(locale: Locale): string {
  const localeMap: Record<Locale, string> = {
    id: 'id-ID',
    en: 'en-US',
  }
  return localeMap[locale]
}

/**
 * Format a date string with dynamic locale
 * @param dateString - ISO date string (e.g., "2026-02-25")
 * @param locale - Locale code ('id' or 'en'), defaults to 'id'
 * @returns Formatted date string (e.g., "Selasa, 25 Februari 2026" for 'id', "Tuesday, February 25, 2026" for 'en')
 */
export function formatDate(dateString: string, locale: Locale = 'id'): string {
  const date = new Date(dateString)

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`)
  }

  return new Intl.DateTimeFormat(getDateTimeLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Format a date and time string with dynamic locale
 * @param dateString - ISO date string (e.g., "2026-02-25T14:30:00")
 * @param locale - Locale code ('id' or 'en'), defaults to 'id'
 * @returns Formatted date and time string (e.g., "25 Februari 2026, 14.30" for 'id', "February 25, 2026, 2:30 PM" for 'en')
 */
export function formatDateTime(dateString: string, locale: Locale = 'id'): string {
  const date = new Date(dateString)

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`)
  }

  return new Intl.DateTimeFormat(getDateTimeLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

/**
 * Format a time string with dynamic locale
 * @param dateString - ISO date string (e.g., "2026-02-25T14:30:00")
 * @param locale - Locale code ('id' or 'en'), defaults to 'id'
 * @returns Formatted time string (e.g., "14.30" for 'id', "2:30 PM" for 'en')
 */
export function formatTime(dateString: string, locale: Locale = 'id'): string {
  const date = new Date(dateString)

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`)
  }

  return new Intl.DateTimeFormat(getDateTimeLocale(locale), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

/**
 * Format a short date string with dynamic locale
 * @param dateString - ISO date string (e.g., "2026-02-25")
 * @param locale - Locale code ('id' or 'en'), defaults to 'id'
 * @returns Formatted short date string (e.g., "25 Feb 2026" for 'id', "Feb 25, 2026" for 'en')
 */
export function formatShortDate(dateString: string, locale: Locale = 'id'): string {
  const date = new Date(dateString)

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`)
  }

  return new Intl.DateTimeFormat(getDateTimeLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
