/**
 * Validates an Indonesian KTP (Kartu Tanda Penduduk) number
 *
 * KTP Format (16 digits):
 * - 6 digits: Province (2) + Regency/City (2) + District (2)
 * - 6 digits: Birth date in DDMMYY format
 *   - For females: Day is added by 40
 * - 4 digits: Sequential number (0001-9999)
 *
 * @param ktpNumber - The KTP number to validate
 * @returns true if valid, false otherwise
 */
export function validateKTP(ktpNumber: string): boolean {
  // Remove any spaces or dashes
  const cleaned = ktpNumber.replace(/[\s-]/g, "")

  // Must be exactly 16 digits
  if (cleaned.length !== 16) {
    return false
  }

  // Must contain only digits
  if (!/^\d+$/.test(cleaned)) {
    return false
  }

  // Validate date portion (digits 7-12, 0-indexed: 6-11)
  const dayStr = cleaned.substring(6, 8)
  const monthStr = cleaned.substring(8, 10)
  const yearStr = cleaned.substring(10, 12)

  const day = parseInt(dayStr, 10)
  const month = parseInt(monthStr, 10)

  // For females, day is added by 40, so we need to subtract to get actual day
  const actualDay = day > 40 ? day - 40 : day

  // Validate month
  if (month < 1 || month > 12) {
    return false
  }

  // Validate day based on month
  const maxDay = getMaxDay(month, yearStr)
  if (actualDay < 1 || actualDay > maxDay) {
    return false
  }

  // Check that all digits are not the same (invalid KTP pattern)
  if (/^(\d)\1+$/.test(cleaned)) {
    return false
  }

  return true
}

/**
 * Gets the maximum day for a given month and year
 */
function getMaxDay(month: number, yearStr: string): number {
  const year = parseInt(yearStr, 10)

  switch (month) {
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 10:
    case 12:
      return 31
    case 4:
    case 6:
    case 9:
    case 11:
      return 30
    case 2:
      // Check for leap year
      const fullYear = year >= 30 ? 1900 + year : 2000 + year
      return isLeapYear(fullYear) ? 29 : 28
    default:
      return 31
  }
}

/**
 * Checks if a year is a leap year
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Extracts information from a valid KTP number
 */
export function extractKTPInfo(ktpNumber: string) {
  const cleaned = ktpNumber.replace(/[\s-]/g, "")

  if (!validateKTP(cleaned)) {
    return null
  }

  const provinceCode = cleaned.substring(0, 2)
  const regencyCode = cleaned.substring(2, 4)
  const districtCode = cleaned.substring(4, 6)

  const dayStr = cleaned.substring(6, 8)
  const monthStr = cleaned.substring(8, 10)
  const yearStr = cleaned.substring(10, 12)

  const day = parseInt(dayStr, 10)
  const month = parseInt(monthStr, 10)
  const year = parseInt(yearStr, 10)

  // Determine gender and actual birth day
  const isFemale = day > 40
  const birthDay = isFemale ? day - 40 : day

  // Determine full year (assuming 1900s for year >= 30, 2000s otherwise)
  const fullYear = year >= 30 ? 1900 + year : 2000 + year

  const sequential = cleaned.substring(12, 16)

  return {
    provinceCode,
    regencyCode,
    districtCode,
    birthDate: new Date(fullYear, month - 1, birthDay),
    gender: isFemale ? "female" : "male",
    sequentialNumber: sequential,
  }
}
