/**
 * KTP Validator Unit Tests
 *
 * Tests Indonesian KTP (Kartu Tanda Penduduk) validation:
 * - 16-digit format
 * - Format: Province(2) + Regency(2) + District(2) + Day(2) + Month(2) + Year(2) + Sequential(4)
 * - For females: Day is added by 40
 */

import { describe, it, expect } from "vitest";
import { validateKTP, extractKTPInfo } from "../ktp-validator";

// Helper to construct KTP: PP RR DD MM YY SSSS
// Where: Province(2) + Regency(2) + District(2) + Day(2) + Month(2) + Year(2) + Seq(4)
const makeKTP = (
  ...args: [string, string, string, string, string, string, string?]
): string => {
  const [prov, reg, dist, day, month, year, seq = "0001"] = args;
  return prov + reg + dist + day + month + year + seq;
};

// Denpasar: Province 51, Regency 71, District 01
const DENPASAR: [string, string, string] = ["51", "71", "01"];

describe("KTP Validator", () => {
  describe("validateKTP - Format Validation", () => {
    it("should accept valid 16-digit KTP", () => {
      // Denpasar, born 01 Jan 1990, male
      const ktp = makeKTP("51", "71", "01", "01", "01", "90");
      expect(validateKTP(ktp)).toBe(true);
    });

    it("should reject KTP with less than 16 digits", () => {
      expect(validateKTP("517101010190000")).toBe(false);
      expect(validateKTP("51710101019000")).toBe(false);
    });

    it("should reject KTP with more than 16 digits", () => {
      expect(validateKTP("51710101019000011")).toBe(false);
    });

    it("should reject non-numeric characters", () => {
      expect(validateKTP("517101010190000X")).toBe(false);
      expect(validateKTP("ABCDEFGHIJKLMNOP")).toBe(false);
    });

    it("should handle spaces and dashes (clean input)", () => {
      expect(validateKTP("5171-0101-0190-0001")).toBe(true);
      expect(validateKTP("5171 0101 0190 0001")).toBe(true);
    });

    it("should reject empty string", () => {
      expect(validateKTP("")).toBe(false);
    });

    it("should reject whitespace only", () => {
      expect(validateKTP("   ")).toBe(false);
    });
  });

  describe("validateKTP - Date Validation", () => {
    it("should accept valid birth dates", () => {
      // Born 15 January 1990
      const ktp = makeKTP(...DENPASAR, "15", "01", "90");
      expect(validateKTP(ktp)).toBe(true);
    });

    it("should reject invalid month (13)", () => {
      // Month 13
      const ktp = makeKTP(...DENPASAR, "01", "13", "90");
      expect(validateKTP(ktp)).toBe(false);
    });

    it("should reject invalid month (0)", () => {
      // Month 00
      const ktp = makeKTP(...DENPASAR, "15", "00", "90");
      expect(validateKTP(ktp)).toBe(false);
    });

    it("should accept female birth date (day + 40)", () => {
      // Female born 15 January 1990: day = 55
      const ktp = makeKTP(...DENPASAR, "55", "01", "90");
      expect(validateKTP(ktp)).toBe(true);
    });

    it("should accept female birth date at maximum (day 71 = 31 + 40)", () => {
      // Female born 31 January 1990: day = 71
      const ktp = makeKTP(...DENPASAR, "71", "01", "90");
      expect(validateKTP(ktp)).toBe(true);
    });

    it("should reject invalid day for month (31 February)", () => {
      // Day 31 in February
      const ktp = makeKTP(...DENPASAR, "31", "02", "90");
      expect(validateKTP(ktp)).toBe(false);
    });

    it("should reject invalid day for month (30 February)", () => {
      // Day 30 in February
      const ktp = makeKTP(...DENPASAR, "30", "02", "90");
      expect(validateKTP(ktp)).toBe(false);
    });

    it("should accept valid day for month (31 March)", () => {
      const ktp = makeKTP(...DENPASAR, "31", "03", "90");
      expect(validateKTP(ktp)).toBe(true);
    });

    it("should accept valid day for month (30 April)", () => {
      const ktp = makeKTP(...DENPASAR, "30", "04", "90");
      expect(validateKTP(ktp)).toBe(true);
    });

    it("should reject invalid day (00)", () => {
      // Day 00
      const ktp = makeKTP(...DENPASAR, "00", "01", "90");
      expect(validateKTP(ktp)).toBe(false);
    });
  });

  describe("validateKTP - Leap Year Handling", () => {
    it("should accept 29 Feb on leap year (2000)", () => {
      // Born 29 Feb 2000 (leap year)
      const ktp = makeKTP(...DENPASAR, "29", "02", "00");
      expect(validateKTP(ktp)).toBe(true);
    });

    it("should accept 29 Feb on leap year (2024)", () => {
      // Born 29 Feb 2024 (leap year)
      const ktp = makeKTP(...DENPASAR, "29", "02", "24");
      expect(validateKTP(ktp)).toBe(true);
    });

    it("should reject 29 Feb on non-leap year (2001)", () => {
      // Born 29 Feb 2001 (not a leap year)
      const ktp = makeKTP(...DENPASAR, "29", "02", "01");
      expect(validateKTP(ktp)).toBe(false);
    });

    it("should reject 29 Feb on non-leap year (2023)", () => {
      // Born 29 Feb 2023 (not a leap year)
      const ktp = makeKTP(...DENPASAR, "29", "02", "23");
      expect(validateKTP(ktp)).toBe(false);
    });

    it("should accept 28 Feb on any year", () => {
      const ktp1 = makeKTP(...DENPASAR, "28", "02", "90");
      const ktp2 = makeKTP(...DENPASAR, "28", "02", "00");
      expect(validateKTP(ktp1)).toBe(true);
      expect(validateKTP(ktp2)).toBe(true);
    });
  });

  describe("validateKTP - Edge Cases", () => {
    it("should reject all same digits", () => {
      expect(validateKTP("1111111111111111")).toBe(false);
      expect(validateKTP("0000000000000000")).toBe(false);
      expect(validateKTP("9999999999999999")).toBe(false);
    });

    it("should handle year 00 (2000)", () => {
      // Born in year 2000, 01 Jan
      const ktp = makeKTP(...DENPASAR, "01", "01", "00");
      expect(validateKTP(ktp)).toBe(true);
    });

    it("should handle year 99 (1999)", () => {
      // Born in year 1999, 01 Jan
      const ktp = makeKTP(...DENPASAR, "01", "01", "99");
      expect(validateKTP(ktp)).toBe(true);
    });

    it("should handle year boundary (29 = 2029)", () => {
      // Year 29 in KTP = 2029, 01 Jan
      const ktp = makeKTP(...DENPASAR, "01", "01", "29");
      expect(validateKTP(ktp)).toBe(true);
    });
  });

  describe("validateKTP - Realistic Indonesian KTPs", () => {
    it("should validate Bali KTP (province 51)", () => {
      const ktp = makeKTP("51", "71", "01", "01", "01", "90");
      expect(validateKTP(ktp)).toBe(true);
    });

    it("should validate Jakarta KTP (province 31)", () => {
      const ktp = makeKTP("31", "71", "01", "01", "01", "90");
      expect(validateKTP(ktp)).toBe(true);
    });

    it("should validate West Java KTP (province 32)", () => {
      const ktp = makeKTP("32", "73", "01", "01", "01", "90");
      expect(validateKTP(ktp)).toBe(true);
    });

    it("should validate East Java KTP (province 35)", () => {
      const ktp = makeKTP("35", "78", "01", "01", "01", "90");
      expect(validateKTP(ktp)).toBe(true);
    });

    it("should validate Yogyakarta KTP (province 34)", () => {
      const ktp = makeKTP("34", "71", "01", "01", "01", "90");
      expect(validateKTP(ktp)).toBe(true);
    });
  });

  describe("extractKTPInfo", () => {
    it("should extract info from valid KTP", () => {
      const ktp = makeKTP(...DENPASAR, "01", "01", "90");
      const info = extractKTPInfo(ktp);

      expect(info).not.toBeNull();
      expect(info?.provinceCode).toBe("51");
      expect(info?.regencyCode).toBe("71");
      expect(info?.districtCode).toBe("01");
      expect(info?.gender).toBe("male");
    });

    it("should extract male birth date correctly", () => {
      // Born 15 Jan 1990
      const ktp = makeKTP(...DENPASAR, "15", "01", "90");
      const info = extractKTPInfo(ktp);

      expect(info?.birthDate.getMonth()).toBe(0); // January (0-indexed)
      expect(info?.birthDate.getDate()).toBe(15);
      expect(info?.birthDate.getFullYear()).toBe(1990);
    });

    it("should extract female gender correctly", () => {
      // Female born 15 Jan 1990: day = 55
      const ktp = makeKTP(...DENPASAR, "55", "01", "90");
      const info = extractKTPInfo(ktp);

      expect(info?.gender).toBe("female");
      expect(info?.birthDate.getDate()).toBe(15);
    });

    it("should extract female birth date at end of month (31 + 40 = 71)", () => {
      // Female born 31 Jan 1990: day = 71
      const ktp = makeKTP(...DENPASAR, "71", "01", "90");
      const info = extractKTPInfo(ktp);

      expect(info?.gender).toBe("female");
      expect(info?.birthDate.getDate()).toBe(31);
    });

    it("should return null for invalid KTP", () => {
      expect(extractKTPInfo("invalid")).toBeNull();
      expect(extractKTPInfo("123456789")).toBeNull();
      expect(extractKTPInfo("")).toBeNull();
    });

    it("should extract sequential number", () => {
      const ktp = makeKTP(...DENPASAR, "01", "01", "90", "1234");
      const info = extractKTPInfo(ktp);

      expect(info?.sequentialNumber).toBe("1234");
    });

    it("should extract sequential number 0001", () => {
      const ktp = makeKTP(...DENPASAR, "01", "01", "90", "0001");
      const info = extractKTPInfo(ktp);

      expect(info?.sequentialNumber).toBe("0001");
    });

    it("should handle year 2000 correctly", () => {
      // Year 00 = 2000
      const ktp = makeKTP(...DENPASAR, "01", "01", "00");
      const info = extractKTPInfo(ktp);

      expect(info?.birthDate.getFullYear()).toBe(2000);
    });

    it("should handle year 1990 correctly", () => {
      // Year 90 = 1990
      const ktp = makeKTP(...DENPASAR, "01", "01", "90");
      const info = extractKTPInfo(ktp);

      expect(info?.birthDate.getFullYear()).toBe(1990);
    });

    it("should handle year 2025 correctly", () => {
      // Year 25 = 2025
      const ktp = makeKTP(...DENPASAR, "01", "01", "25");
      const info = extractKTPInfo(ktp);

      expect(info?.birthDate.getFullYear()).toBe(2025);
    });

    it("should handle KTP with spaces", () => {
      const ktp = "5171 0101 0190 0001";
      const info = extractKTPInfo(ktp);

      expect(info).not.toBeNull();
      expect(info?.provinceCode).toBe("51");
    });

    it("should handle KTP with dashes", () => {
      const ktp = "5171-0101-0190-0001";
      const info = extractKTPInfo(ktp);

      expect(info).not.toBeNull();
      expect(info?.provinceCode).toBe("51");
    });
  });

  describe("Realistic Scenarios", () => {
    it("should validate typical Denpasar male KTP", () => {
      // Male, born 10 May 1985, Denpasar
      const ktp = makeKTP(...DENPASAR, "10", "05", "85");
      expect(validateKTP(ktp)).toBe(true);

      const info = extractKTPInfo(ktp);
      expect(info?.gender).toBe("male");
      expect(info?.birthDate.getMonth()).toBe(4); // May
      expect(info?.birthDate.getDate()).toBe(10);
    });

    it("should validate typical Denpasar female KTP", () => {
      // Female, born 10 May 1985, Denpasar (day = 50)
      const ktp = makeKTP(...DENPASAR, "50", "05", "85");
      expect(validateKTP(ktp)).toBe(true);

      const info = extractKTPInfo(ktp);
      expect(info?.gender).toBe("female");
      expect(info?.birthDate.getDate()).toBe(10);
    });

    it("should validate young worker KTP (born 2005)", () => {
      // Born 15 June 2005
      const ktp = makeKTP(...DENPASAR, "15", "06", "05");
      expect(validateKTP(ktp)).toBe(true);

      const info = extractKTPInfo(ktp);
      expect(info?.birthDate.getFullYear()).toBe(2005);
    });

    it("should validate older worker KTP (born 1970)", () => {
      // Born 20 August 1970
      const ktp = makeKTP(...DENPASAR, "20", "08", "70");
      expect(validateKTP(ktp)).toBe(true);

      const info = extractKTPInfo(ktp);
      expect(info?.birthDate.getFullYear()).toBe(1970);
    });
  });
});
