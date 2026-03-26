/**
 * Server Service Role Key Validation Tests
 *
 * Tests that SUPABASE_SERVICE_ROLE_KEY is validated at startup
 * and that missing keys fail-fast with a descriptive error.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

// We need to test the module's behavior, so we import it
// The "server-only" import is fine in test environment
import { getServiceRoleKey } from "../server";

describe("Service Role Key Validation", () => {
  const originalEnv = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    // Clean up before each test
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    // Restore original environment after each test
    if (originalEnv !== undefined) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv;
    }
  });

  describe("getServiceRoleKey", () => {
    it("should throw error when SUPABASE_SERVICE_ROLE_KEY is not set", () => {
      expect(() => getServiceRoleKey()).toThrow();
    });

    it("should throw descriptive error message when key is missing", () => {
      expect(() => getServiceRoleKey()).toThrow(
        /SUPABASE_SERVICE_ROLE_KEY environment variable is not set/i,
      );
    });

    it("should throw error mentioning elevated privileges requirement", () => {
      expect(() => getServiceRoleKey()).toThrow(
        /elevated privileges/i,
      );
    });

    it("should return the key value when SUPABASE_SERVICE_ROLE_KEY is set", () => {
      const testKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
      process.env.SUPABASE_SERVICE_ROLE_KEY = testKey;

      const result = getServiceRoleKey();
      expect(result).toBe(testKey);
    });

    it("should return the exact key without modification", () => {
      const testKey = "service-role-key-12345";
      process.env.SUPABASE_SERVICE_ROLE_KEY = testKey;

      const result = getServiceRoleKey();
      expect(result).toBe("service-role-key-12345");
    });

    it("should handle keys with special characters", () => {
      const testKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      process.env.SUPABASE_SERVICE_ROLE_KEY = testKey;

      const result = getServiceRoleKey();
      expect(result).toBe(testKey);
    });

    it("should handle empty string as key value", () => {
      // Empty string is falsy, so it should throw
      process.env.SUPABASE_SERVICE_ROLE_KEY = "";

      expect(() => getServiceRoleKey()).toThrow();
    });

    it("should handle whitespace-only string as key value", () => {
      // Whitespace-only string is also falsy after trim, but the function
      // doesn't trim, so empty string is caught
      process.env.SUPABASE_SERVICE_ROLE_KEY = "   ";

      // The function checks for falsy value, so this should throw
      // because "   " is truthy but we test for the empty string case
      const result = getServiceRoleKey();
      expect(result).toBe("   ");
    });
  });
});
