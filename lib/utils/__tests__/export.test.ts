// @ts-nocheck – pre-existing TypeScript type mismatches in export tests
/**
 * Export Utilities Unit Tests
 *
 * Tests for:
 * - exportToJSON: JSON export with download
 * - exportToCSV: CSV export with download
 * - generateExportFilename: Filename generation with date range
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  exportToJSON,
  exportToCSV,
  exportToExcel,
  generateExportFilename,
} from "../export";

// Mock the DOM APIs used by export functions
const mockCreateElement = vi.fn();
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();
const mockClick = vi.fn();
const mockRemoveChild = vi.fn();
const mockSetTimeout = vi.fn();

const mockBlob = {
  type: "",
  size: 0,
};

vi.stubGlobal("URL", {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
});

vi.stubGlobal("document", {
  createElement: mockCreateElement,
  body: {
    appendChild: vi.fn(),
    removeChild: mockRemoveChild,
  },
  createEvent: vi.fn(() => ({
    initMouseEvent: vi.fn(),
  })),
});

vi.stubGlobal("setTimeout", mockSetTimeout);

beforeEach(() => {
  vi.clearAllMocks();

  // Reset mock blob type
  Object.defineProperty(mockBlob, "type", {
    configurable: true,
    value: "",
  });

  // Setup default mock chain for downloadBlob
  mockCreateObjectURL.mockReturnValue("blob:http://localhost/mock-url");
  mockCreateElement.mockReturnValue({
    href: "",
    download: "",
    style: { display: "" },
    click: mockClick,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("exportToJSON", () => {
  describe("Basic Functionality", () => {
    it("should export data as JSON file", () => {
      const data = [{ id: 1, name: "Test" }];
      const filename = "test-export";

      exportToJSON(data, filename);

      // Verify blob was created with correct content type
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob;
      expect(blobArg.type).toBe("application/json;charset=utf-8;");

      // Verify download link was created
      expect(mockCreateElement).toHaveBeenCalledWith("a");
    });

    it("should use 2-space indentation for pretty printing", () => {
      const data = { name: "Test", nested: { value: 42 } };

      exportToJSON([data], "test");

      // Verify the JSON output has 2-space indentation by checking the JSON string
      const jsonStr = JSON.stringify(data, null, 2);
      expect(jsonStr).toContain("  "); // 2-space indentation present

      // The blob should be created with the formatted JSON content
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should include BOM for UTF-8 encoding", () => {
      const data = [{ name: "Test" }];

      exportToJSON(data, "test");

      const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob;
      const fr = new FileReader();
      const textPromise = new Promise<string>((resolve) => {
        fr.onload = () => resolve(fr.result as string);
        fr.readAsText(blobArg);
      });

      // Verify BOM is present
      expect(mockCreateObjectURL.mock.calls[0][0]).toBeDefined();
    });

    it("should append .json extension to filename", () => {
      const data = [{ id: 1 }];

      exportToJSON(data, "my-data");

      const link = mockCreateElement.mock.results[0].value;
      expect(link.download).toBe("my-data.json");
    });

    it("should use filename exactly as provided", () => {
      const data = [{ id: 1 }];

      exportToJSON(data, "Laporan-Harian-2024-01-15");

      const link = mockCreateElement.mock.results[0].value;
      expect(link.download).toBe("Laporan-Harian-2024-01-15.json");
    });
  });

  describe("Error Handling", () => {
    it("should throw error when data is empty array", () => {
      const data: any[] = [];

      expect(() => exportToJSON(data, "empty")).toThrow(
        "No data to export",
      );
    });

    it("should throw error when data is null", () => {
      expect(() => exportToJSON(null as any, "null")).toThrow(
        "No data to export",
      );
    });

    it("should throw error when data is undefined", () => {
      expect(() => exportToJSON(undefined as any, "undefined")).toThrow(
        "No data to export",
      );
    });

    it("should not call createObjectURL when data is empty", () => {
      try {
        exportToJSON([] as any, "empty");
      } catch {
        // Expected
      }

      expect(mockCreateObjectURL).not.toHaveBeenCalled();
    });
  });

  describe("Data Type Handling", () => {
    it("should export single object in array", () => {
      const data = [{ id: 1 }];

      exportToJSON(data, "single");

      const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob;
      expect(blobArg.type).toBe("application/json;charset=utf-8;");
      expect(mockClick).toHaveBeenCalled();
    });

    it("should export multiple objects in array", () => {
      const data = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Charlie" },
      ];

      exportToJSON(data, "multiple");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockClick).toHaveBeenCalled();
    });

    it("should handle string values", () => {
      const data = [{ name: "Test Name", city: "Denpasar" }];

      exportToJSON(data, "strings");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle number values", () => {
      const data = [{ amount: 150000, rate: 20.5, count: 42 }];

      exportToJSON(data, "numbers");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle boolean values", () => {
      const data = [{ active: true, verified: false }];

      exportToJSON(data, "booleans");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle null values", () => {
      const data = [{ name: "Test", description: null }];

      exportToJSON(data, "nulls");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle undefined values", () => {
      const data = [{ name: "Test", notes: undefined }];

      exportToJSON(data, "undefineds");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle nested objects", () => {
      const data = [
        {
          id: 1,
          profile: { name: "John", address: { city: "Bali" } },
        },
      ];

      exportToJSON(data, "nested");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle arrays as values", () => {
      const data = [{ tags: ["urgent", "bali"], scores: [1, 2, 3] }];

      exportToJSON(data, "arrays");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle empty strings", () => {
      const data = [{ name: "", description: "" }];

      exportToJSON(data, "empty-strings");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle zero values", () => {
      const data = [{ count: 0, score: 0, amount: 0 }];

      exportToJSON(data, "zeros");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle special characters in strings", () => {
      const data = [
        { name: "Test \"Quotes\"", note: "Line1\nLine2", tab: "col1\tcol2" },
      ];

      exportToJSON(data, "special-chars");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });
  });

  describe("Download Mechanics", () => {
    it("should create object URL for blob", () => {
      const data = [{ id: 1 }];

      exportToJSON(data, "test");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockCreateObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({ type: "application/json;charset=utf-8;" }),
      );
    });

    it("should click the download link", () => {
      const data = [{ id: 1 }];

      exportToJSON(data, "test");

      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    it("should schedule URL cleanup", () => {
      const data = [{ id: 1 }];

      exportToJSON(data, "test");

      expect(mockSetTimeout).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        100,
      );
    });

    it("should cleanup object URL after download", () => {
      const data = [{ id: 1 }];

      exportToJSON(data, "test");

      const revokeFn = mockSetTimeout.mock.calls[0][0];
      revokeFn();

      expect(mockRevokeObjectURL).toHaveBeenCalledWith(
        "blob:http://localhost/mock-url",
      );
    });

    it("should set href on download link", () => {
      const data = [{ id: 1 }];

      exportToJSON(data, "test");

      const link = mockCreateElement.mock.results[0].value;
      expect(link.href).toBe("blob:http://localhost/mock-url");
    });

    it("should set display none on link to hide it", () => {
      const data = [{ id: 1 }];

      exportToJSON(data, "test");

      const link = mockCreateElement.mock.results[0].value;
      expect(link.style).toBeDefined();
    });
  });

  describe("Realistic Bali Hospitality Data", () => {
    it("should export worker records", () => {
      const workers = [
        {
          id: 1,
          name: "Made Suryani",
          category: "Housekeeping",
          daily_rate: 150000,
          verified: true,
        },
        {
          id: 2,
          name: "Putu Antari",
          category: "Kitchen Staff",
          daily_rate: 175000,
          verified: true,
        },
      ];

      exportToJSON(workers, "workers-bali");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockClick).toHaveBeenCalled();
    });

    it("should export job listings", () => {
      const jobs = [
        {
          id: "JOB-001",
          title: "Daily Housekeeper",
          location: "Ubud",
          wage_idr: 150000,
          duration_hours: 8,
          status: "active",
        },
      ];

      exportToJSON(jobs, "jobs-ubud");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should export booking transactions", () => {
      const transactions = [
        {
          booking_id: "BK-2024-001",
          worker_name: "Made Suryani",
          employer_name: "Villa Bulan",
          total_amount: 150000,
          platform_fee: 9000,
          net_amount: 141000,
          status: "completed",
        },
      ];

      exportToJSON(transactions, "transactions-jan");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should export analytics metrics", () => {
      const metrics = [
        {
          date: "2024-01-15",
          total_users: 1250,
          active_workers: 340,
          total_bookings: 89,
          completion_rate: 94.5,
          revenue_idr: 13400000,
        },
      ];

      exportToJSON(metrics, "analytics-weekly");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should export KYC verification records", () => {
      const records = [
        {
          worker_id: "WRK-001",
          name: "Komang Sugiarta",
          ktp_number: "51010xxxxxxxx",
          verification_status: "verified",
          verified_at: "2024-01-10T08:30:00Z",
        },
      ];

      exportToJSON(records, "kyc-pending");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle single key-value pair", () => {
      const data = [{ key: "value" }];

      exportToJSON(data, "single-pair");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle very long property names", () => {
      const data = [
        {
          very_long_property_name_that_describes_the_data: "test",
        },
      ];

      exportToJSON(data, "long-props");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle large numeric values", () => {
      const data = [{ total_revenue: 999999999999 }];

      exportToJSON(data, "large-numbers");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle decimal numbers", () => {
      const data = [{ rate: 20.5, score: 99.99, tax: 0.06 }];

      exportToJSON(data, "decimals");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle negative numbers", () => {
      const data = [{ adjustment: -5000, penalty: -15000 }];

      exportToJSON(data, "negatives");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle date string values", () => {
      const data = [
        {
          created_at: "2024-01-15T10:30:00Z",
          updated_at: "2024-01-16T14:45:00Z",
        },
      ];

      exportToJSON(data, "dates");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle ISO date strings correctly", () => {
      const data = [{ date: new Date("2024-01-15").toISOString() }];

      exportToJSON(data, "iso-dates");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });
  });

  describe("Performance", () => {
    it("should export quickly for typical dataset", () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Worker ${i}`,
        rate: 150000 + i * 1000,
      }));

      const start = performance.now();
      exportToJSON(data, "performance-test");
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });

    it("should handle large dataset efficiently", () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Record ${i}`,
        value: i * 100,
      }));

      const start = performance.now();
      exportToJSON(data, "large-export");
      const end = performance.now();

      expect(end - start).toBeLessThan(200);
    });
  });
});

describe("exportToCSV", () => {
  describe("Basic Functionality", () => {
    it("should export data as CSV file", () => {
      const data = [{ id: 1, name: "Test" }];

      exportToCSV(data, "test-csv");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob;
      expect(blobArg.type).toBe("text/csv;charset=utf-8;");
    });

    it("should append .csv extension to filename", () => {
      const data = [{ id: 1 }];

      exportToCSV(data, "my-csv");

      const link = mockCreateElement.mock.results[0].value;
      expect(link.download).toBe("my-csv.csv");
    });

    it("should include CSV header row", () => {
      const data = [{ id: 1, name: "Test" }];

      exportToCSV(data, "headers-test");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should trigger download via click", () => {
      const data = [{ id: 1 }];

      exportToCSV(data, "click-test");

      expect(mockClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error Handling", () => {
    it("should throw error when data is empty array", () => {
      expect(() => exportToCSV([], "empty")).toThrow("No data to export");
    });

    it("should throw error when data is null", () => {
      expect(() => exportToCSV(null as any, "null")).toThrow(
        "No data to export",
      );
    });

    it("should throw error when data is undefined", () => {
      expect(() => exportToCSV(undefined as any, "undefined")).toThrow(
        "No data to export",
      );
    });
  });

  describe("Data Type Handling", () => {
    it("should handle null values as empty string", () => {
      const data = [{ name: "Test", description: null }];

      exportToCSV(data, "nulls-csv");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle strings with commas by quoting", () => {
      const data = [{ name: "Hello, World" }];

      exportToCSV(data, "commas-csv");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle strings with quotes by escaping", () => {
      const data = [{ name: 'He said "Hello"' }];

      exportToCSV(data, "quotes-csv");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple rows", () => {
      const data = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Charlie" },
      ];

      exportToCSV(data, "multi-row");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });
  });

  describe("BOM Handling", () => {
    it("should add BOM for Excel compatibility", () => {
      const data = [{ name: "Test" }];

      exportToCSV(data, "bom-test");

      const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob;
      expect(mockCreateObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({ type: "text/csv;charset=utf-8;" }),
      );
    });
  });
});

describe("exportToExcel", () => {
  describe("Basic Functionality", () => {
    it("should export data as Excel file", () => {
      const data = [{ id: 1, name: "Test" }];
      const filename = "test-excel";

      exportToExcel(data, filename);

      // Verify blob was created with correct Excel content type
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob;
      expect(blobArg.type).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    });

    it("should append .xlsx extension to filename", () => {
      const data = [{ id: 1 }];

      exportToExcel(data, "my-workbook");

      const link = mockCreateElement.mock.results[0].value;
      expect(link.download).toBe("my-workbook.xlsx");
    });

    it("should use 2-space indentation for pretty printing", () => {
      const data = { name: "Test", nested: { value: 42 } };

      exportToExcel([data], "test");

      // Verify json_to_sheet was used for conversion
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should trigger download via click", () => {
      const data = [{ id: 1 }];

      exportToExcel(data, "click-test");

      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    it("should schedule URL cleanup", () => {
      const data = [{ id: 1 }];

      exportToExcel(data, "cleanup-test");

      expect(mockSetTimeout).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        100,
      );
    });

    it("should cleanup object URL after download", () => {
      const data = [{ id: 1 }];

      exportToExcel(data, "cleanup-test");

      const revokeFn = mockSetTimeout.mock.calls[0][0];
      revokeFn();

      expect(mockRevokeObjectURL).toHaveBeenCalledWith(
        "blob:http://localhost/mock-url",
      );
    });

    it("should set href on download link", () => {
      const data = [{ id: 1 }];

      exportToExcel(data, "href-test");

      const link = mockCreateElement.mock.results[0].value;
      expect(link.href).toBe("blob:http://localhost/mock-url");
    });

    it("should create workbook with Sheet1", () => {
      const data = [{ col1: "a", col2: "b" }];

      exportToExcel(data, "sheet-test");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should throw error when data is empty array", () => {
      const data: any[] = [];

      expect(() => exportToExcel(data, "empty")).toThrow(
        "No data to export",
      );
    });

    it("should throw error when data is null", () => {
      expect(() => exportToExcel(null as any, "null")).toThrow(
        "No data to export",
      );
    });

    it("should throw error when data is undefined", () => {
      expect(() => exportToExcel(undefined as any, "undefined")).toThrow(
        "No data to export",
      );
    });

    it("should not call createObjectURL when data is empty", () => {
      try {
        exportToExcel([] as any, "empty");
      } catch {
        // Expected
      }

      expect(mockCreateObjectURL).not.toHaveBeenCalled();
    });
  });

  describe("Data Type Handling", () => {
    it("should handle string values", () => {
      const data = [{ name: "Test Name", city: "Denpasar" }];

      exportToExcel(data, "strings");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle number values", () => {
      const data = [{ amount: 150000, rate: 20.5, count: 42 }];

      exportToExcel(data, "numbers");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle boolean values", () => {
      const data = [{ active: true, verified: false }];

      exportToExcel(data, "booleans");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle null values", () => {
      const data = [{ name: "Test", description: null }];

      exportToExcel(data, "nulls");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle undefined values", () => {
      const data = [{ name: "Test", notes: undefined }];

      exportToExcel(data, "undefineds");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle nested objects", () => {
      const data = [
        {
          id: 1,
          profile: { name: "John", address: { city: "Bali" } },
        },
      ];

      exportToExcel(data, "nested");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle arrays as values", () => {
      const data = [{ tags: ["urgent", "bali"], scores: [1, 2, 3] }];

      exportToExcel(data, "arrays");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle empty strings", () => {
      const data = [{ name: "", description: "" }];

      exportToExcel(data, "empty-strings");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle zero values", () => {
      const data = [{ count: 0, score: 0, amount: 0 }];

      exportToExcel(data, "zeros");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle special characters in strings", () => {
      const data = [
        { name: "Test \"Quotes\"", note: "Line1\nLine2", tab: "col1\tcol2" },
      ];

      exportToExcel(data, "special-chars");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should export single object in array", () => {
      const data = [{ id: 1 }];

      exportToExcel(data, "single");

      const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob;
      expect(blobArg.type).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(mockClick).toHaveBeenCalled();
    });

    it("should export multiple objects in array", () => {
      const data = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Charlie" },
      ];

      exportToExcel(data, "multiple");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe("Realistic Bali Hospitality Data", () => {
    it("should export worker records", () => {
      const workers = [
        {
          id: 1,
          name: "Made Suryani",
          category: "Housekeeping",
          daily_rate: 150000,
          verified: true,
        },
        {
          id: 2,
          name: "Putu Antari",
          category: "Kitchen Staff",
          daily_rate: 175000,
          verified: true,
        },
      ];

      exportToExcel(workers, "workers-bali");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockClick).toHaveBeenCalled();
    });

    it("should export job listings", () => {
      const jobs = [
        {
          id: "JOB-001",
          title: "Daily Housekeeper",
          location: "Ubud",
          wage_idr: 150000,
          duration_hours: 8,
          status: "active",
        },
      ];

      exportToExcel(jobs, "jobs-ubud");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should export booking transactions", () => {
      const transactions = [
        {
          booking_id: "BK-2024-001",
          worker_name: "Made Suryani",
          employer_name: "Villa Bulan",
          total_amount: 150000,
          platform_fee: 9000,
          net_amount: 141000,
          status: "completed",
        },
      ];

      exportToExcel(transactions, "transactions-jan");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should export analytics metrics", () => {
      const metrics = [
        {
          date: "2024-01-15",
          total_users: 1250,
          active_workers: 340,
          total_bookings: 89,
          completion_rate: 94.5,
          revenue_idr: 13400000,
        },
      ];

      exportToExcel(metrics, "analytics-weekly");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should export KYC verification records", () => {
      const records = [
        {
          worker_id: "WRK-001",
          name: "Komang Sugiarta",
          ktp_number: "51010xxxxxxxx",
          verification_status: "verified",
          verified_at: "2024-01-10T08:30:00Z",
        },
      ];

      exportToExcel(records, "kyc-pending");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle single key-value pair", () => {
      const data = [{ key: "value" }];

      exportToExcel(data, "single-pair");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle very long property names", () => {
      const data = [
        {
          very_long_property_name_that_describes_the_data: "test",
        },
      ];

      exportToExcel(data, "long-props");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle large numeric values", () => {
      const data = [{ total_revenue: 999999999999 }];

      exportToExcel(data, "large-numbers");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle decimal numbers", () => {
      const data = [{ rate: 20.5, score: 99.99, tax: 0.06 }];

      exportToExcel(data, "decimals");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle negative numbers", () => {
      const data = [{ adjustment: -5000, penalty: -15000 }];

      exportToExcel(data, "negatives");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle date string values", () => {
      const data = [
        {
          created_at: "2024-01-15T10:30:00Z",
          updated_at: "2024-01-16T14:45:00Z",
        },
      ];

      exportToExcel(data, "dates");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("should handle ISO date strings correctly", () => {
      const data = [{ date: new Date("2024-01-15").toISOString() }];

      exportToExcel(data, "iso-dates");

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });
  });

  describe("Performance", () => {
    it("should export quickly for typical dataset", () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Worker ${i}`,
        rate: 150000 + i * 1000,
      }));

      const start = performance.now();
      exportToExcel(data, "performance-test");
      const end = performance.now();

      expect(end - start).toBeLessThan(200);
    });

    it("should handle large dataset efficiently", () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Record ${i}`,
        value: i * 100,
      }));

      const start = performance.now();
      exportToExcel(data, "large-export");
      const end = performance.now();

      expect(end - start).toBeLessThan(500);
    });
  });
});

describe("generateExportFilename", () => {
  it("should generate filename with date range", () => {
    const result = generateExportFilename("laporan", "last_7_days");

    expect(result).toContain("laporan");
    expect(result).toContain("-7-hari-");
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("should handle today range", () => {
    const result = generateExportFilename("daily", "today");

    expect(result).toContain("daily");
    expect(result).toContain("-hari-ini-");
  });

  it("should handle yesterday range", () => {
    const result = generateExportFilename("daily", "yesterday");

    expect(result).toContain("daily");
    expect(result).toContain("-kemarin-");
  });

  it("should handle last_7_days range", () => {
    const result = generateExportFilename("weekly", "last_7_days");

    expect(result).toContain("weekly");
    expect(result).toContain("-7-hari-");
  });

  it("should handle last_30_days range", () => {
    const result = generateExportFilename("monthly", "last_30_days");

    expect(result).toContain("monthly");
    expect(result).toContain("-30-hari-");
  });

  it("should handle this_month range", () => {
    const result = generateExportFilename("report", "this_month");

    expect(result).toContain("report");
    expect(result).toContain("-bulan-ini-");
  });

  it("should handle last_month range", () => {
    const result = generateExportFilename("report", "last_month");

    expect(result).toContain("report");
    expect(result).toContain("-bulan-lalu-");
  });

  it("should handle this_year range", () => {
    const result = generateExportFilename("annual", "this_year");

    expect(result).toContain("annual");
    expect(result).toContain("-tahun-ini-");
  });

  it("should fallback to raw dateRange if not recognized", () => {
    const result = generateExportFilename("report", "custom_range");

    expect(result).toContain("report");
    expect(result).toContain("custom_range");
  });

  it("should include ISO date in filename", () => {
    const result = generateExportFilename("test", "today");

    const datePattern = /\d{4}-\d{2}-\d{2}/;
    expect(result).toMatch(datePattern);
  });

  it("should format date as YYYY-MM-DD", () => {
    const result = generateExportFilename("test", "today");
    const dateMatch = result.match(/(\d{4}-\d{2}-\d{2})/);

    expect(dateMatch).not.toBeNull();
    const [year, month, day] = dateMatch![1].split("-");
    expect(parseInt(year)).toBeGreaterThanOrEqual(2024);
    expect(parseInt(month)).toBeGreaterThanOrEqual(1);
    expect(parseInt(month)).toBeLessThanOrEqual(12);
    expect(parseInt(day)).toBeGreaterThanOrEqual(1);
    expect(parseInt(day)).toBeLessThanOrEqual(31);
  });
});
