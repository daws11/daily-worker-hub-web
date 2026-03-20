"use server";
import { createClient } from "../supabase/server";

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export async function getCategories(): Promise<{
  success: boolean;
  data?: Category[];
  error?: string;
}> {
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
