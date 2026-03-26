import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import {
  errorResponse,
  handleApiError,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("create-profile");

/**
 * POST /api/auth/create-profile
 *
 * Create user profile after signup using service role to bypass RLS
 * This is needed because RLS policies require auth.uid() to match the user id,
 * but during signup the session might not be fully established yet.
 */
export async function POST(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "create-profile",
  });

  try {
    const body = await request.json();
    const { userId, email, fullName, role } = body;

    if (!userId || !email || !fullName || !role) {
      routeLogger.warn("Missing required fields", { requestId });
      logger.requestError(
        request,
        new Error("Missing required fields: userId, email, fullName, role"),
        400,
        startTime,
        { requestId },
      );

      return validationErrorResponse(
        {
          reason: "Missing required fields",
          required: ["userId", "email", "fullName", "role"],
        },
        request,
      );
    }

    // Create Supabase admin client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      routeLogger.error("Missing Supabase credentials", new Error("Server configuration error"), {
        requestId,
      });
      logger.requestError(
        request,
        new Error("Missing Supabase credentials"),
        500,
        startTime,
        { requestId },
      );

      return internalErrorResponse(new Error("Server configuration error"), request);
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
      routeLogger.error(
        "Profile creation failed",
        new Error(profileError.message),
        { requestId, userId },
      );
      logger.requestError(
        request,
        new Error(profileError.message),
        500,
        startTime,
        { requestId },
      );

      return errorResponse(
        500,
        { code: "PROFILE_CREATION_FAILED", details: profileError.message },
        request,
      );
    }

    routeLogger.info("Profile created successfully", {
      requestId,
      userId,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
    });

    return new (await import("next/server")).NextResponse.json({ success: true });
  } catch (error) {
    routeLogger.error("Unexpected error in POST /api/auth/create-profile", error, {
      requestId,
    });

    return handleApiError(error, request, "/api/auth/create-profile", "POST");
  }
}
