import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { checkWorkerOnboardingStatus } from "@/lib/actions/onboarding"

export default async function OnboardingPage() {
  const supabase = await createClient()
  
  // Check if user is logged in
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    // Not logged in, redirect to login
    redirect("/login")
  }

  // Get user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  const userRole = (userData as any)?.role

  if (!userRole) {
    // No role found, redirect to login
    redirect("/login")
  }

  // Route based on role
  if (userRole === "worker") {
    // Check if worker already has a profile
    const { completed } = await checkWorkerOnboardingStatus(user.id)
    
    if (completed) {
      // Already completed onboarding, redirect to dashboard
      redirect("/worker/jobs")
    }
    
    // Redirect to worker onboarding
    redirect("/onboarding/worker")
  }

  if (userRole === "business") {
    // For now, businesses go directly to their dashboard
    // They may have their own onboarding in the future
    redirect("/business/jobs")
  }

  if (userRole === "admin") {
    redirect("/admin")
  }

  // Unknown role, redirect to home
  redirect("/")
}
