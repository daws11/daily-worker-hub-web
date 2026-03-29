"use server";
import { createClient } from "../supabase/server";

// ============================================================================
// BUSINESS PROFILE ACTIONS
// ============================================================================

export type BusinessProfile = {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
};

/**
 * Get the business profile for a given user ID
 */
export async function getBusinessProfile(
  userId: string,
): Promise<{ success: boolean; data?: BusinessProfile; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("businesses")
      .select("id, name, address, lat, lng")
      .eq("user_id", userId)
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Failed to fetch business profile" };
  }
}
