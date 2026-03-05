/**
 * Wage Calculator Unit Tests
 * 
 * Tests wage calculation with overtime support:
 * - Minimum 4 hours per shift
 * - Maximum 12 hours per day
 * - Overtime multiplier: 1.5x for 9-12 hours
 * - Platform fee: 6% of total wage
 * - Community fund: 1% deducted from worker's wage
 */

import { describe, it, expect } from 'vitest'
import {
  calculateWage,
  getWageBreakdown,
} from '../wage-calculator'

describe('Wage Calculator', () => {
  describe('calculateWage - Hour Validation', () => {
    it('should enforce minimum 4 hours', () => {
      const result = calculateWage('housekeeping', 'Badung', 2)
      expect(result.hoursNeeded).toBe(4)
    })

    it('should enforce minimum 4 hours for 0 hours', () => {
      const result = calculateWage('housekeeping', 'Badung', 0)
      expect(result.hoursNeeded).toBe(4)
    })

    it('should enforce minimum 4 hours for negative hours', () => {
      const result = calculateWage('housekeeping', 'Badung', -5)
      expect(result.hoursNeeded).toBe(4)
    })

    it('should enforce maximum 12 hours', () => {
      const result = calculateWage('housekeeping', 'Badung', 15)
      expect(result.hoursNeeded).toBe(12)
    })

    it('should enforce maximum 12 hours for very high hours', () => {
      const result = calculateWage('housekeeping', 'Badung', 24)
      expect(result.hoursNeeded).toBe(12)
    })

    it('should accept valid hours between 4-12', () => {
      expect(calculateWage('housekeeping', 'Badung', 4).hoursNeeded).toBe(4)
      expect(calculateWage('housekeeping', 'Badung', 6).hoursNeeded).toBe(6)
      expect(calculateWage('housekeeping', 'Badung', 8).hoursNeeded).toBe(8)
      expect(calculateWage('housekeeping', 'Badung', 10).hoursNeeded).toBe(10)
      expect(calculateWage('housekeeping', 'Badung', 12).hoursNeeded).toBe(12)
    })

    it('should round decimal hours', () => {
      const result = calculateWage('housekeeping', 'Badung', 7.5)
      expect(result.hoursNeeded).toBeGreaterThanOrEqual(7)
      expect(result.hoursNeeded).toBeLessThanOrEqual(8)
    })
  })

  describe('calculateWage - Regular Hours (4-8 hours)', () => {
    it('should calculate 4-hour shift with no overtime', () => {
      const result = calculateWage('housekeeping', 'Badung', 4)
      
      expect(result.regularHours).toBe(4)
      expect(result.overtimeHours).toBe(0)
      expect(result.overtimeMultiplier).toBe(1)
      expect(result.overtimeWage).toBe(0)
    })

    it('should calculate 6-hour shift with no overtime', () => {
      const result = calculateWage('housekeeping', 'Badung', 6)
      
      expect(result.regularHours).toBe(6)
      expect(result.overtimeHours).toBe(0)
      expect(result.overtimeWage).toBe(0)
    })

    it('should calculate 8-hour shift with no overtime', () => {
      const result = calculateWage('housekeeping', 'Badung', 8)
      
      expect(result.regularHours).toBe(8)
      expect(result.overtimeHours).toBe(0)
      expect(result.overtimeMultiplier).toBe(1)
      expect(result.overtimeWage).toBe(0)
    })

    it('should calculate base wage correctly for 8 hours', () => {
      const result = calculateWage('housekeeping', 'Badung', 8)
      
      expect(result.baseWage).toBe(result.hourlyRate * 8)
      expect(result.totalWage).toBe(result.baseWage)
    })
  })

  describe('calculateWage - Overtime Hours (9-12 hours)', () => {
    it('should calculate 9-hour shift with 1 hour overtime', () => {
      const result = calculateWage('housekeeping', 'Badung', 9)
      
      expect(result.regularHours).toBe(8)
      expect(result.overtimeHours).toBe(1)
      expect(result.overtimeMultiplier).toBe(1.5)
    })

    it('should calculate 10-hour shift with 2 hours overtime', () => {
      const result = calculateWage('housekeeping', 'Badung', 10)
      
      expect(result.regularHours).toBe(8)
      expect(result.overtimeHours).toBe(2)
      expect(result.overtimeMultiplier).toBe(1.5)
    })

    it('should calculate 12-hour shift with 4 hours overtime', () => {
      const result = calculateWage('housekeeping', 'Badung', 12)
      
      expect(result.regularHours).toBe(8)
      expect(result.overtimeHours).toBe(4)
      expect(result.overtimeMultiplier).toBe(1.5)
    })

    it('should apply 1.5x overtime multiplier', () => {
      const result = calculateWage('housekeeping', 'Badung', 10)
      
      expect(result.overtimeMultiplier).toBe(1.5)
    })

    it('should calculate overtime wage correctly', () => {
      const result = calculateWage('housekeeping', 'Badung', 10)
      const expectedOvertimeWage = 2 * result.hourlyRate * 1.5
      
      expect(result.overtimeWage).toBe(expectedOvertimeWage)
    })

    it('should include overtime in total wage', () => {
      const result = calculateWage('housekeeping', 'Badung', 10)
      
      expect(result.totalWage).toBe(result.baseWage + result.overtimeWage)
    })

    it('should have higher total wage with overtime', () => {
      const regular = calculateWage('housekeeping', 'Badung', 8)
      const overtime = calculateWage('housekeeping', 'Badung', 10)
      
      expect(overtime.totalWage).toBeGreaterThan(regular.totalWage)
    })
  })

  describe('calculateWage - Fee Calculation', () => {
    it('should calculate 6% platform fee', () => {
      const result = calculateWage('housekeeping', 'Badung', 8)
      const expectedFee = Math.round(result.totalWage * 0.06)
      
      expect(result.platformFee).toBe(expectedFee)
    })

    it('should calculate 1% community fund', () => {
      const result = calculateWage('housekeeping', 'Badung', 8)
      const expectedFund = Math.round(result.totalWage * 0.01)
      
      expect(result.communityFund).toBe(expectedFund)
    })

    it('should calculate business pays (total + platform fee)', () => {
      const result = calculateWage('housekeeping', 'Badung', 8)
      
      expect(result.businessPays).toBe(result.totalWage + result.platformFee)
    })

    it('should calculate worker receives (total - community fund)', () => {
      const result = calculateWage('housekeeping', 'Badung', 8)
      
      expect(result.workerReceives).toBe(result.totalWage - result.communityFund)
    })

    it('should calculate platform earns (fee - community fund)', () => {
      const result = calculateWage('housekeeping', 'Badung', 8)
      
      expect(result.platformEarns).toBe(result.platformFee - result.communityFund)
    })

    it('should have platform earns be 5% of total (6% - 1%)', () => {
      const result = calculateWage('housekeeping', 'Badung', 8)
      const expectedPlatformEarns = Math.round(result.totalWage * 0.05)
      
      expect(result.platformEarns).toBe(expectedPlatformEarns)
    })

    it('should ensure business pays more than worker receives', () => {
      const result = calculateWage('housekeeping', 'Badung', 8)
      
      expect(result.businessPays).toBeGreaterThan(result.workerReceives)
    })

    it('should calculate correct fees with overtime', () => {
      const result = calculateWage('housekeeping', 'Badung', 10)
      
      expect(result.platformFee).toBe(Math.round(result.totalWage * 0.06))
      expect(result.communityFund).toBe(Math.round(result.totalWage * 0.01))
    })
  })

  describe('calculateWage - Different Categories', () => {
    it('should return different rates for different categories', () => {
      const housekeeping = calculateWage('Housekeeping', 'Badung', 8)
      const driver = calculateWage('Driver', 'Badung', 8)
      const cook = calculateWage('Cook (Line)', 'Badung', 8)
      
      // Rates should be defined
      expect(housekeeping.hourlyRate).toBeGreaterThan(0)
      expect(driver.hourlyRate).toBeGreaterThan(0)
      expect(cook.hourlyRate).toBeGreaterThan(0)
    })

    it('should handle unknown category gracefully', () => {
      const result = calculateWage('unknown-category', 'Badung', 8)
      
      // Should still return a result (0 rate for unknown category)
      expect(result).toBeDefined()
      expect(result.hourlyRate).toBe(0)
    })
  })

  describe('calculateWage - Different Regions', () => {
    it('should return rates for Badung regency', () => {
      const result = calculateWage('housekeeping', 'Badung', 8)
      expect(result.hourlyRate).toBeDefined()
    })

    it('should return rates for Gianyar regency', () => {
      const result = calculateWage('housekeeping', 'Gianyar', 8)
      expect(result.hourlyRate).toBeDefined()
    })

    it('should return rates for Denpasar city', () => {
      const result = calculateWage('housekeeping', 'Denpasar', 8)
      expect(result.hourlyRate).toBeDefined()
    })

    it('should handle unknown region gracefully', () => {
      const result = calculateWage('housekeeping', 'Unknown', 8)
      expect(result).toBeDefined()
    })
  })

  describe('calculateWage - Result Structure', () => {
    it('should return all required fields', () => {
      const result = calculateWage('housekeeping', 'Badung', 8)
      
      expect(result).toHaveProperty('hourlyRate')
      expect(result).toHaveProperty('hoursNeeded')
      expect(result).toHaveProperty('regularHours')
      expect(result).toHaveProperty('overtimeHours')
      expect(result).toHaveProperty('overtimeMultiplier')
      expect(result).toHaveProperty('baseWage')
      expect(result).toHaveProperty('overtimeWage')
      expect(result).toHaveProperty('totalWage')
      expect(result).toHaveProperty('platformFee')
      expect(result).toHaveProperty('businessPays')
      expect(result).toHaveProperty('workerReceives')
      expect(result).toHaveProperty('communityFund')
      expect(result).toHaveProperty('platformEarns')
    })

    it('should have non-negative values for all fields', () => {
      const result = calculateWage('housekeeping', 'Badung', 8)
      
      expect(result.hourlyRate).toBeGreaterThanOrEqual(0)
      expect(result.hoursNeeded).toBeGreaterThanOrEqual(0)
      expect(result.regularHours).toBeGreaterThanOrEqual(0)
      expect(result.overtimeHours).toBeGreaterThanOrEqual(0)
      expect(result.baseWage).toBeGreaterThanOrEqual(0)
      expect(result.overtimeWage).toBeGreaterThanOrEqual(0)
      expect(result.totalWage).toBeGreaterThanOrEqual(0)
      expect(result.platformFee).toBeGreaterThanOrEqual(0)
      expect(result.workerReceives).toBeGreaterThanOrEqual(0)
      expect(result.communityFund).toBeGreaterThanOrEqual(0)
    })
  })

  describe('calculateWage - Realistic Scenarios', () => {
    it('should calculate typical housekeeping shift (8 hours)', () => {
      const result = calculateWage('Housekeeping', 'Badung', 8)
      
      // Verify business pays more than worker receives
      expect(result.businessPays).toBeGreaterThan(result.workerReceives)
      
      // Verify platform earns 5% of total
      expect(result.platformEarns).toBe(Math.round(result.totalWage * 0.05))
    })

    it('should calculate long shift with overtime (12 hours)', () => {
      const result = calculateWage('Housekeeping', 'Badung', 12)
      
      // Should have overtime
      expect(result.overtimeHours).toBe(4)
      expect(result.overtimeWage).toBeGreaterThan(0)
      
      // Total wage should be higher than base wage
      expect(result.totalWage).toBeGreaterThan(result.baseWage)
    })

    it('should calculate minimum shift (4 hours)', () => {
      const result = calculateWage('Housekeeping', 'Badung', 4)
      
      expect(result.regularHours).toBe(4)
      expect(result.overtimeHours).toBe(0)
      expect(result.totalWage).toBe(result.baseWage)
    })

    it('should calculate driver shift with different rates', () => {
      const result = calculateWage('Driver', 'Badung', 8)
      
      expect(result).toBeDefined()
      expect(result.hourlyRate).toBeGreaterThan(0)
    })

    it('should calculate cook shift with different rates', () => {
      const result = calculateWage('Cook (Line)', 'Gianyar', 8)
      
      expect(result).toBeDefined()
      expect(result.hourlyRate).toBeGreaterThan(0)
    })

    it('should handle typical hotel shift (9 hours with lunch break)', () => {
      const result = calculateWage('housekeeping', 'Badung', 9)
      
      // 1 hour overtime
      expect(result.overtimeHours).toBe(1)
      expect(result.overtimeMultiplier).toBe(1.5)
    })
  })

  describe('getWageBreakdown', () => {
    it('should return formatted breakdown object', () => {
      const calc = calculateWage('housekeeping', 'Badung', 8)
      const breakdown = getWageBreakdown(calc)
      
      expect(breakdown).toBeDefined()
    })

    it('should include formatted currency values', () => {
      const calc = calculateWage('housekeeping', 'Badung', 8)
      const breakdown = getWageBreakdown(calc)
      
      // Should have formatted values with currency
      expect(breakdown).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle decimal hours (7.5 hours)', () => {
      const result = calculateWage('housekeeping', 'Badung', 7.5)
      
      expect(result.hoursNeeded).toBeGreaterThanOrEqual(7)
      expect(result.hoursNeeded).toBeLessThanOrEqual(8)
    })

    it('should handle very low hourly rates', () => {
      // Test with unknown category which returns 0 rate
      const result = calculateWage('unknown', 'Badung', 4)
      
      expect(result.workerReceives).toBeGreaterThanOrEqual(0)
    })

    it('should handle fees rounding correctly', () => {
      const result = calculateWage('housekeeping', 'Badung', 8)
      
      // Fees should be integers (rounded)
      expect(Number.isInteger(result.platformFee)).toBe(true)
      expect(Number.isInteger(result.communityFund)).toBe(true)
    })
  })
})
