import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/create-profile
 * 
 * Create user profile after signup using service role to bypass RLS
 * This is needed because RLS policies require auth.uid() to match the user id,
 * but during signup the session might not be fully established yet.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, fullName, role } = body;

    if (!userId || !email || !fullName || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create Supabase admin client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[create-profile] Missing Supabase credentials");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Use service role to bypass RLS
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
    const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create user profile
    const { error: profileError } = await supabase
      .from("users")
      .insert({
        id: userId,
        email: email,
        full_name: fullName,
        role: role,
        phone: "",
        avatar_url: "",
      });

    if (profileError) {
      console.error("[create-profile] Profile creation error:", profileError);
      return NextResponse.json(
        { error: "Failed to create profile", details: profileError.message },
        { status: 500 }
      );
    }

    console.log("[create-profile] Profile created successfully for:", userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[create-profile] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
