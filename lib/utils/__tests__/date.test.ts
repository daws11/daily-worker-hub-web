/**
 * Date Utilities Unit Tests
 * 
 * Tests date formatting and manipulation:
 * - Locale-aware formatting (Indonesian/English)
 * - Date range helpers (start/end of month, week, day)
 * - Leap year handling
 */

import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatShortDate,
  getStartOfMonth,
  getEndOfMonth,
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
} from '../date'

describe('Date Utilities', () => {
  describe('formatDate', () => {
    it('should format date in Indonesian by default', () => {
      const result = formatDate('2026-03-05')
      expect(result).toContain('Maret')
      expect(result).toContain('2026')
      expect(result).toContain('5')
    })

    it('should format date in English when specified', () => {
      const result = formatDate('2026-03-05', 'en')
      expect(result).toContain('March')
      expect(result).toContain('2026')
    })

    it('should include weekday name in Indonesian', () => {
      const result = formatDate('2026-03-05', 'id')
      // March 5, 2026 is Thursday (Kamis)
      expect(result).toContain('Kamis')
    })

    it('should include weekday name in English', () => {
      const result = formatDate('2026-03-05', 'en')
      // March 5, 2026 is Thursday
      expect(result).toContain('Thursday')
    })

    it('should throw error for invalid date string', () => {
      expect(() => formatDate('invalid')).toThrow()
      expect(() => formatDate('not-a-date')).toThrow()
    })

    it('should handle ISO date format', () => {
      const result = formatDate('2026-12-25')
      expect(result).toContain('Desember')
      expect(result).toContain('25')
      expect(result).toContain('2026')
    })

    it('should handle January correctly', () => {
      const result = formatDate('2026-01-01', 'id')
      expect(result).toContain('Januari')
    })

    it('should handle December correctly', () => {
      const result = formatDate('2026-12-31', 'id')
      expect(result).toContain('Desember')
    })
  })

  describe('formatDateTime', () => {
    it('should format date and time in Indonesian', () => {
      const result = formatDateTime('2026-03-05T14:30:00', 'id')
      expect(result).toContain('Maret')
      expect(result).toContain('2026')
    })

    it('should format date and time in English', () => {
      const result = formatDateTime('2026-03-05T14:30:00', 'en')
      expect(result).toContain('March')
      expect(result).toContain('2026')
    })

    it('should include time in Indonesian format', () => {
      const result = formatDateTime('2026-03-05T14:30:00', 'id')
      // Indonesian uses 24-hour format
      expect(result).toMatch(/14[.:]30/)
    })

    it('should include time in English format', () => {
      const result = formatDateTime('2026-03-05T14:30:00', 'en')
      // English may use 12-hour format with AM/PM
      expect(result).toMatch(/(2[.:]30|14[.:]30)/)
    })

    it('should throw error for invalid datetime string', () => {
      expect(() => formatDateTime('invalid')).toThrow()
    })

    it('should handle midnight', () => {
      const result = formatDateTime('2026-03-05T00:00:00', 'id')
      expect(result).toContain('Maret')
    })

    it('should handle end of day', () => {
      const result = formatDateTime('2026-03-05T23:59:59', 'id')
      expect(result).toContain('Maret')
    })
  })

  describe('formatTime', () => {
    it('should format time in Indonesian (24h)', () => {
      const result = formatTime('2026-03-05T14:30:00', 'id')
      expect(result).toMatch(/14[.:]30/)
    })

    it('should format time in English (12h with AM/PM)', () => {
      const result = formatTime('2026-03-05T14:30:00', 'en')
      expect(result).toMatch(/(2[.:]30|PM)/)
    })

    it('should handle morning time', () => {
      const result = formatTime('2026-03-05T09:00:00', 'id')
      // May return single digit (9.00) or double digit (09.00)
      expect(result).toMatch(/9[.:]00/)
    })

    it('should handle afternoon time', () => {
      const result = formatTime('2026-03-05T15:00:00', 'id')
      expect(result).toMatch(/15[.:]00/)
    })

    it('should handle midnight', () => {
      const result = formatTime('2026-03-05T00:00:00', 'id')
      // May return 0.00 or 00.00
      expect(result).toMatch(/0[.:]00/)
    })

    it('should throw error for invalid time string', () => {
      expect(() => formatTime('invalid')).toThrow()
    })
  })

  describe('formatShortDate', () => {
    it('should format short date in Indonesian', () => {
      const result = formatShortDate('2026-03-05', 'id')
      expect(result).toContain('Mar')
      expect(result).toContain('5')
      expect(result).toContain('2026')
    })

    it('should format short date in English', () => {
      const result = formatShortDate('2026-03-05', 'en')
      expect(result).toContain('Mar')
      expect(result).toContain('2026')
    })

    it('should throw error for invalid date string', () => {
      expect(() => formatShortDate('invalid')).toThrow()
    })
  })

  describe('getStartOfMonth', () => {
    it('should return first day of month at 00:00:00', () => {
      const result = getStartOfMonth('2026-03-15')
      expect(result.getDate()).toBe(1)
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
    })

    it('should handle January', () => {
      const result = getStartOfMonth('2026-01-15')
      expect(result.getMonth()).toBe(0) // January
      expect(result.getDate()).toBe(1)
    })

    it('should handle December', () => {
      const result = getStartOfMonth('2026-12-15')
      expect(result.getMonth()).toBe(11) // December
      expect(result.getDate()).toBe(1)
    })

    it('should work with Date object input', () => {
      const result = getStartOfMonth(new Date('2026-03-15'))
      expect(result.getDate()).toBe(1)
    })

    it('should default to current month if no input', () => {
      const result = getStartOfMonth()
      expect(result.getDate()).toBe(1)
      expect(result.getHours()).toBe(0)
    })
  })

  describe('getEndOfMonth', () => {
    it('should return last day of March (31)', () => {
      const result = getEndOfMonth('2026-03-15')
      expect(result.getDate()).toBe(31)
      expect(result.getHours()).toBe(23)
      expect(result.getMinutes()).toBe(59)
      expect(result.getSeconds()).toBe(59)
    })

    it('should return last day of February (28)', () => {
      const result = getEndOfMonth('2026-02-15')
      expect(result.getDate()).toBe(28)
    })

    it('should return last day of February in leap year (29)', () => {
      const result = getEndOfMonth('2024-02-15')
      expect(result.getDate()).toBe(29)
    })

    it('should return last day of April (30)', () => {
      const result = getEndOfMonth('2026-04-15')
      expect(result.getDate()).toBe(30)
    })

    it('should return last day of January (31)', () => {
      const result = getEndOfMonth('2026-01-15')
      expect(result.getDate()).toBe(31)
    })

    it('should work with Date object input', () => {
      const result = getEndOfMonth(new Date('2026-03-15'))
      expect(result.getDate()).toBe(31)
    })

    it('should default to current month if no input', () => {
      const result = getEndOfMonth()
      expect(result.getHours()).toBe(23)
      expect(result.getMinutes()).toBe(59)
    })
  })

  describe('getStartOfDay', () => {
    it('should return start of day at 00:00:00', () => {
      const result = getStartOfDay('2026-03-05T14:30:00')
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
    })

    it('should preserve the date', () => {
      const result = getStartOfDay('2026-03-05T14:30:00')
      expect(result.getFullYear()).toBe(2026)
      expect(result.getMonth()).toBe(2) // March (0-indexed)
      expect(result.getDate()).toBe(5)
    })

    it('should work with Date object input', () => {
      const result = getStartOfDay(new Date('2026-03-05T14:30:00'))
      expect(result.getHours()).toBe(0)
    })

    it('should default to current day if no input', () => {
      const result = getStartOfDay()
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
    })
  })

  describe('getEndOfDay', () => {
    it('should return end of day at 23:59:59', () => {
      const result = getEndOfDay('2026-03-05T14:30:00')
      expect(result.getHours()).toBe(23)
      expect(result.getMinutes()).toBe(59)
      expect(result.getSeconds()).toBe(59)
    })

    it('should preserve the date', () => {
      const result = getEndOfDay('2026-03-05T14:30:00')
      expect(result.getFullYear()).toBe(2026)
      expect(result.getMonth()).toBe(2) // March (0-indexed)
      expect(result.getDate()).toBe(5)
    })

    it('should work with Date object input', () => {
      const result = getEndOfDay(new Date('2026-03-05T14:30:00'))
      expect(result.getHours()).toBe(23)
    })

    it('should default to current day if no input', () => {
      const result = getEndOfDay()
      expect(result.getHours()).toBe(23)
      expect(result.getMinutes()).toBe(59)
    })
  })

  describe('getStartOfWeek', () => {
    it('should return Monday as start of week', () => {
      // March 5, 2026 is Thursday
      const result = getStartOfWeek('2026-03-05')
      expect(result.getDay()).toBe(1) // Monday
    })

    it('should return same day if already Monday', () => {
      // March 2, 2026 is Monday
      const result = getStartOfWeek('2026-03-02')
      expect(result.getDay()).toBe(1)
      expect(result.getDate()).toBe(2)
    })

    it('should return previous Monday for Sunday', () => {
      // March 8, 2026 is Sunday
      const result = getStartOfWeek('2026-03-08')
      expect(result.getDay()).toBe(1)
      expect(result.getDate()).toBe(2) // March 2
    })

    it('should work with Date object input', () => {
      const result = getStartOfWeek(new Date('2026-03-05'))
      expect(result.getDay()).toBe(1)
    })

    it('should default to current week if no input', () => {
      const result = getStartOfWeek()
      expect(result.getDay()).toBe(1)
    })
  })

  describe('getEndOfWeek', () => {
    it('should return Sunday as end of week', () => {
      // March 5, 2026 is Thursday
      const result = getEndOfWeek('2026-03-05')
      expect(result.getDay()).toBe(0) // Sunday
    })

    it('should return same day if already Sunday', () => {
      // March 8, 2026 is Sunday
      const result = getEndOfWeek('2026-03-08')
      expect(result.getDay()).toBe(0)
      expect(result.getDate()).toBe(8)
    })

    it('should return following Sunday for Monday', () => {
      // March 2, 2026 is Monday
      const result = getEndOfWeek('2026-03-02')
      expect(result.getDay()).toBe(0)
      expect(result.getDate()).toBe(8) // March 8
    })

    it('should work with Date object input', () => {
      const result = getEndOfWeek(new Date('2026-03-05'))
      expect(result.getDay()).toBe(0)
    })

    it('should default to current week if no input', () => {
      const result = getEndOfWeek()
      expect(result.getDay()).toBe(0)
    })
  })

  describe('Leap Year Handling', () => {
    it('should correctly identify February 29 in leap years', () => {
      // 2024 is a leap year
      const endOfFeb2024 = getEndOfMonth('2024-02-01')
      expect(endOfFeb2024.getDate()).toBe(29)
    })

    it('should correctly identify February 28 in non-leap years', () => {
      // 2025 is not a leap year
      const endOfFeb2025 = getEndOfMonth('2025-02-01')
      expect(endOfFeb2025.getDate()).toBe(28)
    })

    it('should handle year 2000 (leap year)', () => {
      const endOfFeb2000 = getEndOfMonth('2000-02-01')
      expect(endOfFeb2000.getDate()).toBe(29)
    })

    it('should handle year 1900 (not a leap year)', () => {
      const endOfFeb1900 = getEndOfMonth('1900-02-01')
      expect(endOfFeb1900.getDate()).toBe(28)
    })
  })

  describe('Edge Cases', () => {
    it('should handle year boundary (Dec 31 to Jan 1)', () => {
      const startOfJan = getStartOfMonth('2026-12-31')
      const endOfDec = getEndOfMonth('2026-12-31')
      
      expect(startOfJan.getMonth()).toBe(11) // December
      expect(endOfDec.getMonth()).toBe(11)
    })

    it('should handle month with 30 days', () => {
      const endOfApr = getEndOfMonth('2026-04-15')
      expect(endOfApr.getDate()).toBe(30)
    })

    it('should handle month with 31 days', () => {
      const endOfMay = getEndOfMonth('2026-05-15')
      expect(endOfMay.getDate()).toBe(31)
    })

    it('should handle ISO datetime strings', () => {
      const result = formatDateTime('2026-03-05T14:30:00Z', 'id')
      expect(result).toBeDefined()
    })
  })
})
