import { NextRequest, NextResponse } from "next/server";
import { withRateLimitForMethod } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const routeLogger = logger.createApiLogger("auth-create-profile");

/**
 * POST /api/auth/create-profile
 *
 * Create user profile after signup using service role to bypass RLS
 * This is needed because RLS policies require auth.uid() to match the user id,
 * but during signup the session might not be fully established yet.
 */
async function handlePOST(request: NextRequest) {
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
      routeLogger.error("Missing Supabase credentials", new Error("Configuration error"));
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
      routeLogger.error("Profile creation error", profileError);
      return NextResponse.json(
        { error: "Failed to create profile", details: profileError.message },
        { status: 500 }
      );
    }

    routeLogger.info("Profile created successfully", { userId });
    return NextResponse.json({ success: true });
  } catch (error) {
    routeLogger.error("Unexpected error in profile creation", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export POST handler with rate limiting for auth routes
export const POST = withRateLimitForMethod(
  handlePOST as any,
  { type: "auth", userBased: false },
  ["POST"],
);
