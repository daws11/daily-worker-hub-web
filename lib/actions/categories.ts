"use server";
import { createClient } from "../supabase/server";

// ============================================================================
// CATEGORY ACTIONS
// ============================================================================

/**
 * Represents a service category in the platform.
 */
export type Category = {
  /** Unique identifier for the category */
  id: string;
  /** Display name of the category */
  name: string;
  /** URL-friendly slug for the category */
  slug: string;
};

/**
 * Response type for getCategories action.
 */
export type GetCategoriesResponse = {
  /** Whether the fetch was successful */
  success: boolean;
  /** Array of categories if successful */
  data?: Category[];
  /** Error message if the fetch failed */
  error?: string;
};

/**
 * Fetch all service categories from the database.
 * Categories are ordered by name alphabetically.
 *
 * @returns Promise resolving to categories data or an error message
 */
export async function getCategories(): Promise<GetCategoriesResponse> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("name");

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Failed to fetch categories" };
  }
}
