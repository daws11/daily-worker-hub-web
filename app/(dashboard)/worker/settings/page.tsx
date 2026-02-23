"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/app/providers/auth-provider"
import { NotificationSettings, NotificationPreference } from "@/components/notification-settings"
import { getUserNotificationPreferences, updateUserNotificationPreferences } from "@/lib/actions/push-notifications"
import { Settings } from "lucide-react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function WorkerSettingsPage() {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<NotificationPreference>({
    pushEnabled: false,
    newApplications: false,
    bookingStatus: false,
    paymentConfirmation: false,
    newJobMatches: false,
    shiftReminders: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch user notification preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user?.id) return

      setIsLoading(true)
      try {
        const result = await getUserNotificationPreferences(user.id)
        if (result.success && result.data) {
          setPreferences({
            pushEnabled: result.data.push_enabled ?? false,
            newApplications: result.data.new_applications ?? true,
            bookingStatus: result.data.booking_status ?? true,
            paymentConfirmation: result.data.payment_confirmation ?? true,
            newJobMatches: result.data.new_job_matches ?? true,
            shiftReminders: result.data.shift_reminders ?? true,
          })
        }
      } catch (error) {
        console.error("Failed to fetch notification preferences:", error)
        toast.error("Gagal memuat pengaturan notifikasi")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPreferences()
  }, [user?.id])

  // Handle preferences change
  const handlePreferencesChange = async (newPreferences: NotificationPreference) => {
    if (!user?.id) return

    setPreferences(newPreferences)
    setIsSaving(true)

    try {
      const result = await updateUserNotificationPreferences(user.id, {
        push_enabled: newPreferences.pushEnabled,
        new_applications: newPreferences.newApplications,
        booking_status: newPreferences.bookingStatus,
        payment_confirmation: newPreferences.paymentConfirmation,
        new_job_matches: newPreferences.newJobMatches,
        shift_reminders: newPreferences.shiftReminders,
      })

      if (result.success) {
        toast.success("Pengaturan notifikasi berhasil disimpan")
      } else {
        toast.error(result.error || "Gagal menyimpan pengaturan notifikasi")
      }
    } catch (error) {
      console.error("Failed to update notification preferences:", error)
      toast.error("Gagal menyimpan pengaturan notifikasi")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Page Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Pengaturan</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Kelola preferensi akun dan notifikasi Anda
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          /* Notification Settings */
          <NotificationSettings
            preferences={preferences}
            onPreferencesChange={handlePreferencesChange}
            isLoading={isSaving}
          />
        )}
      </div>
    </div>
  )
}
