/**
 * Validation Helper Utilities
 *
 * Provides helper functions for parsing and formatting Zod validation errors
 * in API routes.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Format Zod validation errors for API responses
 *
 * @param error - Zod error object
 * @returns Formatted error object with field-level details
 */
export function formatZodErrors(error: z.ZodError): {
  error: string;
  details: Array<{
    field: string;
    message: string;
    code: string;
  }>;
} {
  const details = error.issues.map((err) => ({
    field: err.path.join("."),
    message: err.message,
    code: err.code,
  }));

  // Create a summary message
  const summary =
    details.length === 1
      ? details[0].message
      : `${details.length} validation errors`;

  return {
    error: `Validation failed: ${summary}`,
    details,
  };
}

/**
 * Parse request body with Zod schema and return formatted response on error
 *
 * @param request - Request object
 * @param schema - Zod schema to validate against
 * @returns Parsed data or NextResponse with error details
 */
export async function parseRequest<T extends z.ZodSchema>(
  request: Request,
  schema: T,
): Promise<
  { success: true; data: z.infer<T> } | { success: false; error: NextResponse }
> {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formatted = formatZodErrors(error);
      return {
        success: false,
        error: NextResponse.json(formatted, { status: 400 }),
      };
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: NextResponse.json(
          { error: "Invalid JSON in request body" },
          { status: 400 },
        ),
      };
    }

    // Unknown error
    return {
      success: false,
      error: NextResponse.json(
        { error: "Failed to parse request body" },
        { status: 400 },
      ),
    };
  }
}

/**
 * Parse query parameters with Zod schema and return formatted response on error
 *
 * @param searchParams - URL search params
 * @param schema - Zod schema to validate against
 * @returns Parsed data or NextResponse with error details
 */
export function parseQueryParams<T extends z.ZodSchema>(
  searchParams: URLSearchParams,
  schema: T,
):
  | { success: true; data: z.infer<T> }
  | { success: false; error: NextResponse } {
  try {
    // Convert search params to object
    const params: Record<string, string | string[]> = {};
    searchParams.forEach((value, key) => {
      // Handle multiple values for the same key
      const existing = params[key];
      if (existing) {
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          params[key] = [existing, value];
        }
      } else {
        params[key] = value;
      }
    });

    const data = schema.parse(params);

    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formatted = formatZodErrors(error);
      return {
        success: false,
        error: NextResponse.json(formatted, { status: 400 }),
      };
    }

    return {
      success: false,
      error: NextResponse.json(
        { error: "Failed to parse query parameters" },
        { status: 400 },
      ),
    };
  }
}

/**
 * Validate data against a schema without throwing
 * Returns either the validated data or error details
 *
 * @param data - Data to validate
 * @param schema - Zod schema to validate against
 * @returns Result object with success flag and either data or error
 */
export function validateData<T extends z.ZodSchema>(
  data: unknown,
  schema: T,
):
  | { success: true; data: z.infer<T> }
  | { success: false; error: ReturnType<typeof formatZodErrors> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: formatZodErrors(result.error),
  };
}

/**
 * Create a partial schema for update operations
 * Makes all fields optional while preserving validation rules
 *
 * @param schema - Zod object schema
 * @returns Partial schema with all fields optional
 */
export function createPartialSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
): z.ZodObject<{ [K in keyof T]: z.ZodOptional<T[K]> }> {
  return schema.partial();
}
