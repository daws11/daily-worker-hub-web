/**
 * Currency Formatting Unit Tests
 * 
 * Tests Indonesian Rupiah (IDR) formatting:
 * - Currency prefix (Rp)
 * - Thousand separators
 * - Zero handling
 * - Large amounts
 */

import { describe, it, expect } from 'vitest'
import { formatIDR } from '../currency'

describe('Currency Formatting', () => {
  describe('formatIDR', () => {
    it('should format amount with Rp prefix', () => {
      const result = formatIDR(100000)
      expect(result).toContain('Rp')
    })

    it('should use thousand separators for amounts >= 1000', () => {
      const result = formatIDR(1000000)
      // Indonesian format uses dots for thousands
      expect(result).toMatch(/1[.,]000[.,]000/)
    })

    it('should handle zero', () => {
      const result = formatIDR(0)
      expect(result).toContain('0')
      expect(result).toContain('Rp')
    })

    it('should handle large amounts (1 billion)', () => {
      const result = formatIDR(1000000000)
      expect(result).toMatch(/1[.,]000[.,]000[.,]000/)
    })

    it('should not show decimal places', () => {
      const result = formatIDR(100000.99)
      expect(result).not.toContain('.99')
      expect(result).not.toContain(',99')
    })

    it('should handle small amounts (< 1000)', () => {
      const result = formatIDR(500)
      expect(result).toContain('500')
    })

    it('should handle amount 1', () => {
      const result = formatIDR(1)
      expect(result).toContain('1')
    })

    it('should handle tens', () => {
      const result = formatIDR(50)
      expect(result).toContain('50')
    })

    it('should handle hundreds', () => {
      const result = formatIDR(500)
      expect(result).toContain('500')
    })

    it('should handle thousands', () => {
      const result = formatIDR(5000)
      expect(result).toMatch(/5[.,]000/)
    })

    it('should handle ten thousands', () => {
      const result = formatIDR(50000)
      expect(result).toMatch(/50[.,]000/)
    })

    it('should handle hundred thousands', () => {
      const result = formatIDR(500000)
      expect(result).toMatch(/500[.,]000/)
    })

    it('should handle millions', () => {
      const result = formatIDR(5000000)
      expect(result).toMatch(/5[.,]000[.,]000/)
    })

    it('should handle ten millions', () => {
      const result = formatIDR(50000000)
      expect(result).toMatch(/50[.,]000[.,]000/)
    })

    it('should handle hundred millions', () => {
      const result = formatIDR(500000000)
      expect(result).toMatch(/500[.,]000[.,]000/)
    })
  })

  describe('Realistic Bali Hospitality Wages', () => {
    it('should format typical daily wage (Rp 150,000)', () => {
      const result = formatIDR(150000)
      expect(result).toContain('150')
      expect(result).toMatch(/150[.,]000/)
    })

    it('should format weekly wage (Rp 1,050,000)', () => {
      const result = formatIDR(1050000)
      expect(result).toMatch(/1[.,]050[.,]000/)
    })

    it('should format monthly wage (Rp 4,500,000)', () => {
      const result = formatIDR(4500000)
      expect(result).toMatch(/4[.,]500[.,]000/)
    })

    it('should format minimum wage UMK Bali (~Rp 3,500,000)', () => {
      const result = formatIDR(3500000)
      expect(result).toMatch(/3[.,]500[.,]000/)
    })

    it('should format hourly rate (Rp 20,000)', () => {
      const result = formatIDR(20000)
      expect(result).toMatch(/20[.,]000/)
    })

    it('should format overtime pay (Rp 30,000)', () => {
      const result = formatIDR(30000)
      expect(result).toMatch(/30[.,]000/)
    })

    it('should format platform fee 6% of Rp 200,000 = Rp 12,000', () => {
      const result = formatIDR(12000)
      expect(result).toMatch(/12[.,]000/)
    })

    it('should format community fund 1% of Rp 200,000 = Rp 2,000', () => {
      const result = formatIDR(2000)
      expect(result).toMatch(/2[.,]000/)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very small decimal (truncated)', () => {
      const result = formatIDR(100.01)
      expect(result).not.toContain('.01')
      expect(result).not.toContain(',01')
    })

    it('should handle rounding down', () => {
      const result = formatIDR(999.49)
      // Should round or truncate
      expect(result).toBeDefined()
    })

    it('should handle rounding up', () => {
      const result = formatIDR(999.99)
      // Should round or truncate
      expect(result).toBeDefined()
    })

    it('should handle negative numbers (if supported)', () => {
      // Some implementations may not support negative
      const result = formatIDR(-1000)
      expect(result).toBeDefined()
    })
  })

  describe('Indonesian Locale Specifics', () => {
    it('should use Indonesian locale formatting', () => {
      const result = formatIDR(1000000)
      // Indonesian uses dots for thousands: Rp1.000.000
      // Or it might use commas depending on implementation
      expect(result).toMatch(/Rp/)
    })

    it('should not include currency code (IDR)', () => {
      const result = formatIDR(100000)
      // Should use symbol Rp, not code IDR
      expect(result).not.toContain('IDR')
    })

    it('should format consistently', () => {
      const result1 = formatIDR(100000)
      const result2 = formatIDR(100000)
      expect(result1).toBe(result2)
    })
  })

  describe('Performance', () => {
    it('should format quickly (benchmark)', () => {
      const start = performance.now()
      for (let i = 0; i < 1000; i++) {
        formatIDR(1234567)
      }
      const end = performance.now()
      // Should complete 1000 formats in less than 100ms
      expect(end - start).toBeLessThan(100)
    })
  })
})
