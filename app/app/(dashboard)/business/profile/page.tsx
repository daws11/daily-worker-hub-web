"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { getBusinessProfile, createBusinessProfile, updateBusinessProfile } from "@/lib/supabase/business"
import { ProfileForm } from "@/components/business/profile-form"
import { VerificationBadge } from "@/components/business/verification-badge"
import type { BusinessType, Area } from "@/lib/schemas/business"

interface BusinessProfile {
  id?: string
  name: string
  business_type: BusinessType
  address: string
  area: Area
  phone?: string
  email?: string
  website?: string
  description?: string
  avatar_url?: string
  business_license_url?: string
  verification_status?: 'pending' | 'verified' | 'rejected'
}

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      setIsLoading(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          toast.error("Anda harus login untuk mengakses halaman ini")
          return
        }

        // Use business utility function
        const { data, error } = await getBusinessProfile(user.id)

        if (error) {
          // Check if it's a "not found" error
          if (error.includes('PGRST116') || error.includes('rows')) {
            // No profile exists yet, this is fine for new users
            setProfile(null)
          } else {
            console.error("Error fetching profile:", error)
            toast.error("Gagal memuat profil bisnis")
          }
        } else {
          setProfile(data)
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
        toast.error("Terjadi kesalahan saat memuat profil")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [supabase])

  const handleSubmit = async (data: Omit<BusinessProfile, "id" | "verification_status">) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error("Anda harus login untuk menyimpan profil")
        return { error: "User not authenticated" }
      }

      if (profile?.id) {
        // Update existing profile using business utility
        const { data: updatedProfile, error } = await updateBusinessProfile(profile.id, {
          name: data.name,
          business_type: data.business_type,
          address: data.address,
          area: data.area,
          phone: data.phone || null,
          email: data.email || null,
          website: data.website || null,
          description: data.description || null,
          avatar_url: data.avatar_url || null,
          business_license_url: data.business_license_url || null,
          updated_at: new Date().toISOString(),
        })

        if (error) {
          console.error("Error updating profile:", error)
          return { error: "Gagal memperbarui profil bisnis" }
        }

        if (updatedProfile) {
          setProfile(updatedProfile)
          toast.success("Profil bisnis berhasil diperbarui")
        }
      } else {
        // Create new profile using business utility
        const { data: newProfile, error } = await createBusinessProfile({
          user_id: user.id,
          name: data.name,
          business_type: data.business_type,
          address: data.address,
          area: data.area,
          phone: data.phone || null,
          email: data.email || null,
          website: data.website || null,
          description: data.description || null,
          avatar_url: data.avatar_url || null,
          business_license_url: data.business_license_url || null,
          verification_status: 'pending',
        })

        if (error) {
          console.error("Error creating profile:", error)
          return { error: "Gagal membuat profil bisnis" }
        }

        if (newProfile) {
          setProfile(newProfile)
          toast.success("Profil bisnis berhasil dibuat")
        }
      }

      return {}
    } catch (error) {
      console.error("Error submitting profile:", error)
      return { error: "Terjadi kesalahan tak terduga" }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat profil bisnis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Profil Bisnis
            </h1>
            <p className="text-muted-foreground mt-2">
              Kelola profil bisnis Anda untuk menarik lebih banyak pekerja
            </p>
          </div>
          {profile && (
            <VerificationBadge status={profile.verification_status || "pending"} />
          )}
        </div>
      </div>

      <ProfileForm
        mode={profile ? "edit" : "create"}
        initialData={profile || undefined}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
