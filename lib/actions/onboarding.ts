"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export interface CompleteWorkerOnboardingData {
  userId: string
  fullName: string
  phone: string
  dob: string
  address: string
  lat: number
  lng: number
  primaryCategory: string
  experienceLevel: string
  bio?: string
}

export interface OnboardingResult {
  success: boolean
  error?: string
}

export async function completeWorkerOnboarding(
  data: CompleteWorkerOnboardingData
): Promise<OnboardingResult> {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: "Not authenticated" }
    }

    // Ensure the userId matches the authenticated user
    if (user.id !== data.userId) {
      return { success: false, error: "User ID mismatch" }
    }

    // Check if worker profile already exists
    const { data: existingWorker, error: checkError } = await supabase
      .from("workers")
      .select("id")
      .eq("user_id", data.userId)
      .single()

    if (existingWorker) {
      return { success: false, error: "Worker profile already exists" }
    }

    // Create worker profile
    const { error: workerError } = await supabase
      .from("workers")
      .insert({
        user_id: data.userId,
        full_name: data.fullName,
        phone: data.phone,
        dob: data.dob,
        address: data.address,
        location_name: data.address,
        lat: data.lat,
        lng: data.lng,
        bio: data.bio || null,
        tier: "classic", // Default tier
        jobs_completed: 0,
        rating: null,
        punctuality: null,
      })

    if (workerError) {
      console.error("Error creating worker profile:", workerError)
      return { success: false, error: "Failed to create worker profile" }
    }

    // Update user record with phone if provided
    if (data.phone) {
      const { error: updateUserError } = await supabase
        .from("users")
        .update({ phone: data.phone })
        .eq("id", data.userId)

      if (updateUserError) {
        console.error("Error updating user phone:", updateUserError)
        // Don't fail the whole operation for this
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in completeWorkerOnboarding:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Check if a user has completed onboarding
export async function checkWorkerOnboardingStatus(
  userId: string
): Promise<{ completed: boolean; workerId?: string }> {
  try {
    const supabase = await createClient()
    
    const { data: worker, error } = await supabase
      .from("workers")
      .select("id")
      .eq("user_id", userId)
      .single()

    if (error || !worker) {
      return { completed: false }
    }

    return { completed: true, workerId: worker.id }
  } catch (error) {
    console.error("Error checking onboarding status:", error)
    return { completed: false }
  }
}
