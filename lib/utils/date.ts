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
