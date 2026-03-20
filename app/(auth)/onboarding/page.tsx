import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  checkWorkerOnboardingStatus,
  checkBusinessOnboardingStatus,
} from "@/lib/actions/onboarding";

export default async function OnboardingPage() {
  const supabase = await createClient();

  // Check if user is logged in
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    // Not logged in, redirect to login
    redirect("/login");
  }

  // Get user role - try database first, fallback to user_metadata
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  // Fallback to user_metadata.role if database query fails
  const userRole = (userData as any)?.role || user.user_metadata?.role;

  if (!userRole) {
    // No role found in database or metadata, redirect to login
    redirect("/login");
  }

  // Route based on role
  if (userRole === "worker") {
    // Check if worker already has a profile
    const { completed } = await checkWorkerOnboardingStatus(user.id);

    if (completed) {
      // Already completed onboarding, redirect to dashboard
      redirect("/worker/jobs");
    }

    // Redirect to worker onboarding
    redirect("/onboarding/worker");
  }

  if (userRole === "business") {
    // Check if business already has a profile
    const { completed } = await checkBusinessOnboardingStatus(user.id);

    if (completed) {
      // Already completed onboarding, redirect to dashboard
      redirect("/business/jobs");
    }

    // Redirect to business onboarding
    redirect("/onboarding/business");
  }

  if (userRole === "admin") {
    redirect("/admin");
  }

  // Unknown role, redirect to home
  redirect("/");
}
