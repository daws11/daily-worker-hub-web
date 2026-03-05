# Vitest Unit Testing Plan - Daily Worker Hub

**Created:** 2026-03-05
**Status:** Planning
**Target Coverage:** 70% critical paths

---

## 📋 Overview

Rencana ini berfokus pada unit testing untuk **business logic** yang paling kritikal di Daily Worker Hub, menggunakan **Vitest** (fast, Vite-native, compatible dengan Next.js).

---

## 🎯 Prioritas Testing

### Priority 1: Critical Business Logic (Must Have)
- Matching Algorithm
- Tier Classification
- Wage Calculator
- Interview Flow

### Priority 2: Validation & Utilities (Should Have)
- KTP Validator
- Date Utilities
- Currency Formatting
- Payment Validation

### Priority 3: Components (Nice to Have)
- UI Components (rendering, user interactions)
- Form validation

---

## 📁 Test File Structure

```
daily-worker-hub-clean/
├── vitest.config.ts
├── src/
│   └── __tests__/
│       └── setup.ts
├── lib/
│   ├── algorithms/
│   │   ├── __tests__/
│   │   │   ├── matching-score.test.ts      ✅ (exists, needs vitest format)
│   │   │   ├── tier-classifier.test.ts     🆕
│   │   │   ├── wage-calculator.test.ts     🆕
│   │   │   ├── interview-flow.test.ts      ✅ (exists, needs vitest format)
│   │   │   ├── availability-checker.test.ts 🆕
│   │   │   └── compliance-checker.test.ts  🆕
│   │   └── ...
│   ├── utils/
│   │   ├── __tests__/
│   │   │   ├── ktp-validator.test.ts       🆕
│   │   │   ├── date.test.ts                🆕
│   │   │   ├── currency.test.ts            🆕
│   │   │   └── distance.test.ts            🆕
│   │   └── ...
│   ├── validators/
│   │   ├── __tests__/
│   │   │   └── worker-profile.test.ts      🆕
│   │   └── ...
│   └── schemas/
│       ├── __tests__/
│       │   ├── badge.test.ts               🆕
│       │   ├── business.test.ts            🆕
│       │   └── review.test.ts              🆕
│       └── ...
└── components/
    └── __tests__/
        ├── job-card.test.tsx               🆕
        └── wallet-balance.test.tsx         🆕
```

---

## 🧪 Test Scenarios

### 1. Matching Score Algorithm (`lib/algorithms/matching-score.ts`)

```typescript
describe('Matching Score Algorithm', () => {
  describe('calculateHaversineDistance', () => {
    it('should calculate distance between two coordinates correctly', () => {
      // Denpasar to Ubud
      const distance = calculateHaversineDistance(
        -8.6500, 115.2167,  // Denpasar
        -8.5069, 115.2625   // Ubud
      );
      expect(distance).toBeCloseTo(22, 0); // ~22km
    });

    it('should return 0 for same coordinates', () => {
      const distance = calculateHaversineDistance(
        -8.6500, 115.2167,
        -8.6500, 115.2167
      );
      expect(distance).toBe(0);
    });

    it('should handle negative coordinates', () => {
      // Bali to Jakarta
      const distance = calculateHaversineDistance(
        -8.6500, 115.2167,  // Bali
        -6.2088, 106.8456   // Jakarta
      );
      expect(distance).toBeGreaterThan(900);
    });
  });

  describe('calculateSkillScore', () => {
    it('should return 30 when no job skills required', () => {
      const score = calculateSkillScore(['skill1'], []);
      expect(score).toBe(30);
    });

    it('should return 0 when worker has no skills but job requires skills', () => {
      const score = calculateSkillScore([], ['skill1']);
      expect(score).toBe(0);
    });

    it('should calculate partial match correctly', () => {
      // 2 out of 4 skills matched (50%)
      const score = calculateSkillScore(
        ['skill1', 'skill2'],
        ['skill1', 'skill2', 'skill3', 'skill4']
      );
      expect(score).toBe(20); // 50% of 30 = 15, rounds to 20
    });

    it('should return 30 for exact match', () => {
      const score = calculateSkillScore(
        ['skill1', 'skill2'],
        ['skill1', 'skill2']
      );
      expect(score).toBe(30);
    });
  });

  describe('calculateDistanceScore', () => {
    it('should return 30 for distance < 2km', () => {
      const score = calculateDistanceScore(1.5);
      expect(score).toBe(30);
    });

    it('should return 20 for distance 2-5km', () => {
      const score = calculateDistanceScore(3.5);
      expect(score).toBe(20);
    });

    it('should return 10 for distance 5-10km', () => {
      const score = calculateDistanceScore(7);
      expect(score).toBe(10);
    });

    it('should return 5 for distance 10-20km', () => {
      const score = calculateDistanceScore(15);
      expect(score).toBe(5);
    });

    it('should return 0 for distance > 20km', () => {
      const score = calculateDistanceScore(25);
      expect(score).toBe(0);
    });
  });

  describe('calculateRatingScore', () => {
    it('should return 15 for rating >= 4.8', () => {
      const score = calculateRatingScore(4.9, 95);
      expect(score).toBe(15);
    });

    it('should return 10 for rating 4.5-4.7', () => {
      const score = calculateRatingScore(4.6, 90);
      expect(score).toBe(10);
    });

    it('should return 5 for rating 4.0-4.4', () => {
      const score = calculateRatingScore(4.2, 85);
      expect(score).toBe(5);
    });

    it('should return 0 for rating < 4.0', () => {
      const score = calculateRatingScore(3.5, 80);
      expect(score).toBe(0);
    });
  });

  describe('calculateTotalMatchingScore', () => {
    it('should calculate total score with tier bonus', () => {
      const result = calculateTotalMatchingScore({
        workerSkills: ['housekeeping', 'cleaning'],
        jobSkills: ['housekeeping'],
        workerLocation: { lat: -8.65, lon: 115.22 },
        jobLocation: { lat: -8.66, lon: 115.23 },
        rating: 4.8,
        punctuality: 98,
        workerTier: 'champion'
      });
      
      expect(result.totalScore).toBeGreaterThan(80);
      expect(result.tierBonus).toBe(20);
    });
  });
});
```

---

### 2. Tier Classifier (`lib/algorithms/tier-classifier.ts`)

```typescript
describe('Tier Classifier', () => {
  describe('classifyWorkerTier', () => {
    describe('Champion Tier', () => {
      it('should classify as champion when all criteria met', () => {
        const tier = classifyWorkerTier(300, 4.9, 99);
        expect(tier).toBe('champion');
      });

      it('should NOT classify as champion with 299 jobs', () => {
        const tier = classifyWorkerTier(299, 4.9, 99);
        expect(tier).not.toBe('champion');
      });

      it('should NOT classify as champion with 4.7 rating', () => {
        const tier = classifyWorkerTier(300, 4.7, 99);
        expect(tier).not.toBe('champion');
      });

      it('should NOT classify as champion with 97% punctuality', () => {
        const tier = classifyWorkerTier(300, 4.9, 97);
        expect(tier).not.toBe('champion');
      });
    });

    describe('Elite Tier', () => {
      it('should classify as elite when all criteria met', () => {
        const tier = classifyWorkerTier(100, 4.7, 96);
        expect(tier).toBe('elite');
      });

      it('should NOT classify as elite with 99 jobs', () => {
        const tier = classifyWorkerTier(99, 4.7, 96);
        expect(tier).not.toBe('elite');
      });

      it('should NOT classify as elite with 4.5 rating', () => {
        const tier = classifyWorkerTier(100, 4.5, 96);
        expect(tier).not.toBe('elite');
      });
    });

    describe('Pro Tier', () => {
      it('should classify as pro when all criteria met', () => {
        const tier = classifyWorkerTier(20, 4.2, 92);
        expect(tier).toBe('pro');
      });

      it('should classify as pro at minimum threshold', () => {
        const tier = classifyWorkerTier(20, 4.0, 90);
        expect(tier).toBe('pro');
      });

      it('should NOT classify as pro with 19 jobs', () => {
        const tier = classifyWorkerTier(19, 4.2, 92);
        expect(tier).not.toBe('pro');
      });
    });

    describe('Classic Tier (Default)', () => {
      it('should classify as classic for new workers', () => {
        const tier = classifyWorkerTier(0, 0, 0);
        expect(tier).toBe('classic');
      });

      it('should classify as classic with low rating', () => {
        const tier = classifyWorkerTier(50, 3.5, 80);
        expect(tier).toBe('classic');
      });

      it('should handle null/undefined values', () => {
        const tier = classifyWorkerTier(10, null, undefined);
        expect(tier).toBe('classic');
      });
    });
  });

  describe('getTierRank', () => {
    it('should return 0 for champion', () => {
      expect(getTierRank('champion')).toBe(0);
    });

    it('should return 1 for elite', () => {
      expect(getTierRank('elite')).toBe(1);
    });

    it('should return 2 for pro', () => {
      expect(getTierRank('pro')).toBe(2);
    });

    it('should return 3 for classic', () => {
      expect(getTierRank('classic')).toBe(3);
    });
  });

  describe('getTierBonus', () => {
    it('should return 20 for champion', () => {
      expect(getTierBonus('champion')).toBe(20);
    });

    it('should return 15 for elite', () => {
      expect(getTierBonus('elite')).toBe(15);
    });

    it('should return 10 for pro', () => {
      expect(getTierBonus('pro')).toBe(10);
    });

    it('should return 5 for classic', () => {
      expect(getTierBonus('classic')).toBe(5);
    });
  });

  describe('getTierLabel', () => {
    it('should return Indonesian labels', () => {
      expect(getTierLabel('champion', 'id')).toBe('Champion');
      expect(getTierLabel('elite', 'id')).toBe('Elite');
      expect(getTierLabel('pro', 'id')).toBe('Pro');
      expect(getTierLabel('classic', 'id')).toBe('Classic');
    });
  });
});
```

---

### 3. Wage Calculator (`lib/algorithms/wage-calculator.ts`)

```typescript
describe('Wage Calculator', () => {
  describe('calculateWage', () => {
    describe('Validation', () => {
      it('should enforce minimum 4 hours', () => {
        const result = calculateWage('housekeeping', 'Badung', 2);
        expect(result.hoursNeeded).toBe(4);
      });

      it('should enforce maximum 12 hours', () => {
        const result = calculateWage('housekeeping', 'Badung', 15);
        expect(result.hoursNeeded).toBe(12);
      });

      it('should accept valid hours between 4-12', () => {
        const result = calculateWage('housekeeping', 'Badung', 6);
        expect(result.hoursNeeded).toBe(6);
      });
    });

    describe('Regular Hours (4-8 hours)', () => {
      it('should calculate 4-hour shift correctly', () => {
        const result = calculateWage('housekeeping', 'Badung', 4);
        
        expect(result.regularHours).toBe(4);
        expect(result.overtimeHours).toBe(0);
        expect(result.overtimeMultiplier).toBe(1);
        expect(result.baseWage).toBe(result.hourlyRate * 4);
        expect(result.overtimeWage).toBe(0);
      });

      it('should calculate 8-hour shift correctly', () => {
        const result = calculateWage('housekeeping', 'Badung', 8);
        
        expect(result.regularHours).toBe(8);
        expect(result.overtimeHours).toBe(0);
      });
    });

    describe('Overtime Hours (9-12 hours)', () => {
      it('should calculate 10-hour shift with 2 hours overtime', () => {
        const result = calculateWage('housekeeping', 'Badung', 10);
        
        expect(result.regularHours).toBe(8);
        expect(result.overtimeHours).toBe(2);
        expect(result.overtimeMultiplier).toBe(1.5);
      });

      it('should calculate 12-hour shift with 4 hours overtime', () => {
        const result = calculateWage('housekeeping', 'Badung', 12);
        
        expect(result.regularHours).toBe(8);
        expect(result.overtimeHours).toBe(4);
        expect(result.overtimeMultiplier).toBe(1.5);
      });

      it('should apply 1.5x overtime multiplier', () => {
        const result = calculateWage('housekeeping', 'Badung', 10);
        const expectedOvertimeWage = 2 * result.hourlyRate * 1.5;
        
        expect(result.overtimeWage).toBe(expectedOvertimeWage);
      });
    });

    describe('Fee Calculation', () => {
      it('should calculate 6% platform fee', () => {
        const result = calculateWage('housekeeping', 'Badung', 8);
        const expectedFee = Math.round(result.totalWage * 0.06);
        
        expect(result.platformFee).toBe(expectedFee);
      });

      it('should calculate 1% community fund', () => {
        const result = calculateWage('housekeeping', 'Badung', 8);
        const expectedFund = Math.round(result.totalWage * 0.01);
        
        expect(result.communityFund).toBe(expectedFund);
      });

      it('should calculate business pays correctly', () => {
        const result = calculateWage('housekeeping', 'Badung', 8);
        
        expect(result.businessPays).toBe(result.totalWage + result.platformFee);
      });

      it('should calculate worker receives correctly', () => {
        const result = calculateWage('housekeeping', 'Badung', 8);
        
        expect(result.workerReceives).toBe(result.totalWage - result.communityFund);
      });

      it('should calculate platform earns correctly', () => {
        const result = calculateWage('housekeeping', 'Badung', 8);
        
        expect(result.platformEarns).toBe(result.platformFee - result.communityFund);
      });
    });

    describe('Different Categories & Regions', () => {
      it('should return different rates for different categories', () => {
        const housekeeping = calculateWage('housekeeping', 'Badung', 8);
        const driver = calculateWage('driver', 'Badung', 8);
        
        expect(housekeeping.hourlyRate).not.toBe(driver.hourlyRate);
      });

      it('should return different rates for different regions', () => {
        const badung = calculateWage('housekeeping', 'Badung', 8);
        const gianyar = calculateWage('housekeeping', 'Gianyar', 8);
        
        // Rates may differ by region
        expect(badung.hourlyRate).toBeDefined();
        expect(gianyar.hourlyRate).toBeDefined();
      });
    });

    describe('Realistic Scenarios', () => {
      it('should calculate typical housekeeping shift (8 hours)', () => {
        const result = calculateWage('housekeeping', 'Badung', 8);
        
        // Verify all fields are populated
        expect(result).toHaveProperty('hourlyRate');
        expect(result).toHaveProperty('baseWage');
        expect(result).toHaveProperty('totalWage');
        expect(result).toHaveProperty('workerReceives');
        expect(result).toHaveProperty('businessPays');
        
        // Verify business pays more than worker receives
        expect(result.businessPays).toBeGreaterThan(result.workerReceives);
      });

      it('should calculate long shift with overtime (12 hours)', () => {
        const result = calculateWage('housekeeping', 'Badung', 12);
        
        expect(result.totalWage).toBeGreaterThan(result.baseWage);
        expect(result.overtimeWage).toBeGreaterThan(0);
      });
    });
  });

  describe('getWageBreakdown', () => {
    it('should return formatted breakdown object', () => {
      const calc = calculateWage('housekeeping', 'Badung', 8);
      const breakdown = getWageBreakdown(calc);
      
      expect(breakdown).toHaveProperty('baseWage');
      expect(breakdown).toHaveProperty('overtimeWage');
      expect(breakdown).toHaveProperty('totalWage');
    });
  });
});
```

---

### 4. KTP Validator (`lib/utils/ktp-validator.ts`)

```typescript
describe('KTP Validator', () => {
  describe('validateKTP', () => {
    describe('Format Validation', () => {
      it('should accept valid 16-digit KTP', () => {
        const validKTP = '5171010101900001'; // Denpasar, born Jan 1, 1990, male
        expect(validateKTP(validKTP)).toBe(true);
      });

      it('should reject KTP with less than 16 digits', () => {
        expect(validateKTP('517101010190000')).toBe(false);
      });

      it('should reject KTP with more than 16 digits', () => {
        expect(validateKTP('51710101019000011')).toBe(false);
      });

      it('should reject non-numeric characters', () => {
        expect(validateKTP('517101010190000X')).toBe(false);
      });

      it('should handle spaces and dashes', () => {
        expect(validateKTP('5171-0101-0190-0001')).toBe(true);
        expect(validateKTP('5171 0101 0190 0001')).toBe(true);
      });
    });

    describe('Date Validation', () => {
      it('should accept valid birth dates', () => {
        // Born 15 June 1990
        expect(validateKTP('5171061501900001')).toBe(true);
      });

      it('should reject invalid month (> 12)', () => {
        expect(validateKTP('5171011301900001')).toBe(false);
      });

      it('should reject invalid month (0)', () => {
        expect(validateKTP('5171001501900001')).toBe(false);
      });

      it('should accept female birth date (day + 40)', () => {
        // Female born 15 June 1990 → day = 55
        expect(validateKTP('5171550601900001')).toBe(true);
      });

      it('should reject invalid day for month', () => {
        // 31 February doesn't exist
        expect(validateKTP('5171023101900001')).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should reject all same digits', () => {
        expect(validateKTP('1111111111111111')).toBe(false);
      });

      it('should handle leap year (29 Feb)', () => {
        // Born 29 Feb 2000 (leap year, 00 = 2000)
        expect(validateKTP('5171022900000001')).toBe(true);
      });

      it('should reject 29 Feb on non-leap year', () => {
        // Born 29 Feb 2001 (not a leap year)
        expect(validateKTP('5171022901000001')).toBe(false);
      });
    });

    describe('Realistic Indonesian KTPs', () => {
      it('should validate Bali KTP (province 51)', () => {
        const baliKTP = '5171010101900001';
        expect(validateKTP(baliKTP)).toBe(true);
      });

      it('should validate Jakarta KTP (province 31)', () => {
        const jakartaKTP = '3171010101900001';
        expect(validateKTP(jakartaKTP)).toBe(true);
      });
    });
  });

  describe('extractKTPInfo', () => {
    it('should extract info from valid KTP', () => {
      const ktp = '5171011501900001';
      const info = extractKTPInfo(ktp);
      
      expect(info).not.toBeNull();
      expect(info?.provinceCode).toBe('51');
      expect(info?.gender).toBe('male');
      expect(info?.birthDate.getMonth()).toBe(0); // January
      expect(info?.birthDate.getDate()).toBe(15);
    });

    it('should extract female gender correctly', () => {
      // Female: day = 15 + 40 = 55
      const ktp = '5171550101900001';
      const info = extractKTPInfo(ktp);
      
      expect(info?.gender).toBe('female');
      expect(info?.birthDate.getDate()).toBe(15);
    });

    it('should return null for invalid KTP', () => {
      const info = extractKTPInfo('invalid');
      expect(info).toBeNull();
    });

    it('should extract sequential number', () => {
      const ktp = '5171010101901234';
      const info = extractKTPInfo(ktp);
      
      expect(info?.sequentialNumber).toBe('1234');
    });
  });
});
```

---

### 5. Date Utilities (`lib/utils/date.ts`)

```typescript
describe('Date Utilities', () => {
  describe('formatDate', () => {
    it('should format date in Indonesian by default', () => {
      const result = formatDate('2026-03-05');
      expect(result).toContain('Maret');
      expect(result).toContain('2026');
    });

    it('should format date in English when specified', () => {
      const result = formatDate('2026-03-05', 'en');
      expect(result).toContain('March');
      expect(result).toContain('2026');
    });

    it('should include weekday name', () => {
      const result = formatDate('2026-03-05', 'id');
      expect(result).toMatch(/(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)/);
    });

    it('should throw error for invalid date string', () => {
      expect(() => formatDate('invalid')).toThrow();
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time in Indonesian', () => {
      const result = formatDateTime('2026-03-05T14:30:00', 'id');
      expect(result).toContain('Maret');
      expect(result).toContain('14');
    });

    it('should format date and time in English', () => {
      const result = formatDateTime('2026-03-05T14:30:00', 'en');
      expect(result).toContain('March');
      expect(result).toContain('PM');
    });
  });

  describe('formatTime', () => {
    it('should format time in 24h format for Indonesian', () => {
      const result = formatTime('2026-03-05T14:30:00', 'id');
      expect(result).toContain('14');
    });

    it('should format time in 12h format for English', () => {
      const result = formatTime('2026-03-05T14:30:00', 'en');
      expect(result).toContain('PM');
    });
  });

  describe('getStartOfMonth', () => {
    it('should return first day of month at 00:00:00', () => {
      const result = getStartOfMonth('2026-03-15');
      expect(result.getDate()).toBe(1);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });
  });

  describe('getEndOfMonth', () => {
    it('should return last day of month at 23:59:59', () => {
      const result = getEndOfMonth('2026-03-15');
      expect(result.getDate()).toBe(31);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
    });

    it('should handle February correctly', () => {
      const result = getEndOfMonth('2026-02-15');
      expect(result.getDate()).toBe(28);
    });

    it('should handle leap year February', () => {
      const result = getEndOfMonth('2024-02-15');
      expect(result.getDate()).toBe(29);
    });
  });

  describe('getStartOfDay / getEndOfDay', () => {
    it('should return start of day at 00:00:00', () => {
      const result = getStartOfDay('2026-03-05T14:30:00');
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    it('should return end of day at 23:59:59', () => {
      const result = getEndOfDay('2026-03-05T14:30:00');
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
    });
  });

  describe('getStartOfWeek / getEndOfWeek', () => {
    it('should return Monday as start of week', () => {
      // March 5, 2026 is Thursday
      const result = getStartOfWeek('2026-03-05');
      expect(result.getDay()).toBe(1); // Monday
    });

    it('should return Sunday as end of week', () => {
      const result = getEndOfWeek('2026-03-05');
      expect(result.getDay()).toBe(0); // Sunday
    });
  });
});
```

---

### 6. Currency Formatting (`lib/utils/currency.ts`)

```typescript
describe('Currency Formatting', () => {
  describe('formatIDR', () => {
    it('should format amount with Rp prefix', () => {
      const result = formatIDR(100000);
      expect(result).toContain('Rp');
    });

    it('should use thousand separators', () => {
      const result = formatIDR(1000000);
      // Indonesian format uses dots for thousands
      expect(result).toMatch(/1\.000\.000|1,000,000/);
    });

    it('should handle zero', () => {
      const result = formatIDR(0);
      expect(result).toContain('0');
    });

    it('should handle large amounts', () => {
      const result = formatIDR(1000000000);
      expect(result).toContain('1.000.000.000');
    });

    it('should not show decimal places', () => {
      const result = formatIDR(100000.99);
      expect(result).not.toContain('.99');
    });

    it('should handle small amounts', () => {
      const result = formatIDR(500);
      expect(result).toContain('500');
    });
  });
});
```

---

### 7. Interview Flow (Update existing test to Vitest format)

```typescript
// Convert existing test at lib/algorithms/__tests__/interview-flow.test.ts
// to proper Vitest format with describe/it/expect

describe('Interview Flow Algorithm', () => {
  // ... existing tests converted to vitest format
});
```

---

## 📦 Installation & Setup

### 1. Install Dependencies

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom happy-dom
```

### 2. Create `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**', 'components/**'],
      exclude: ['node_modules/', '__tests__/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### 3. Create Test Setup File

```typescript
// src/__tests__/setup.ts
import '@testing-library/jest-dom';
```

### 4. Add Scripts to `package.json`

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 📊 Estimated Test Counts

| Category | Files | Test Cases | Priority |
|----------|-------|------------|----------|
| Matching Algorithm | 1 | 20 | P1 |
| Tier Classifier | 1 | 20 | P1 |
| Wage Calculator | 1 | 25 | P1 |
| Interview Flow | 1 | 20 | P1 |
| KTP Validator | 1 | 20 | P2 |
| Date Utilities | 1 | 20 | P2 |
| Currency | 1 | 10 | P2 |
| **Total** | **7** | **~135** | - |

---

## 🚀 Implementation Timeline

### Phase 1: Setup & Priority 1 (Week 1)
- [ ] Install Vitest & dependencies
- [ ] Configure vitest.config.ts
- [ ] Create test setup file
- [ ] Write matching-score.test.ts
- [ ] Write tier-classifier.test.ts
- [ ] Write wage-calculator.test.ts
- [ ] Convert interview-flow.test.ts to Vitest

### Phase 2: Priority 2 (Week 2)
- [ ] Write ktp-validator.test.ts
- [ ] Write date.test.ts
- [ ] Write currency.test.ts

### Phase 3: Priority 3 (Week 3)
- [ ] Add component tests
- [ ] Achieve 70% coverage target
- [ ] Integrate with CI/CD

---

## 🎯 Success Criteria

- ✅ All Priority 1 tests passing
- ✅ 70%+ coverage on critical business logic
- ✅ Tests run in < 10 seconds
- ✅ CI/CD integration working
- ✅ Clear test reports

---

## 📝 Notes

- Use `happy-dom` instead of `jsdom` for faster tests
- Mock Supabase client for isolated unit tests
- Focus on business logic first, UI later
- Keep tests simple and readable
- One test file per source file

---

_Updated: 2026-03-05_
