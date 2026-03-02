"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/app/providers/auth-provider"
import { NotificationSettings, NotificationPreference } from "@/components/notification-settings"
import { getUserNotificationPreferences, updateUserNotificationPreferences } from "@/lib/actions/push-notifications"
import { TierBadge, TierBadgeDetailed } from "@/components/worker/tier-badge"
import { AvailabilitySlots } from "@/components/worker/availability-slots"
import { Settings, Star, Clock, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { WorkerTier } from "@/lib/supabase/types"
import { DAY_NAMES } from "@/lib/algorithms/availability-checker"
import { setWorkerAvailabilityForWeek } from "@/lib/algorithms/availability-checker"

interface AvailabilitySlot {
  dayOfWeek: number
  dayName: string
  isAvailable: boolean
  startHour: number
  endHour: number
}

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

  // Worker tier state
  const [workerData, setWorkerData] = useState<{
    tier: WorkerTier
    jobsCompleted: number
    rating: number | null
    punctuality: number | null
  } | null>(null)

  // Availability state
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([
    { dayOfWeek: 1, dayName: "Monday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 2, dayName: "Tuesday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 3, dayName: "Wednesday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 4, dayName: "Thursday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 5, dayName: "Friday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 6, dayName: "Saturday", isAvailable: false, startHour: 9, endHour: 17 },
    { dayOfWeek: 7, dayName: "Sunday", isAvailable: false, startHour: 9, endHour: 17 },
  ])
  const [isSavingAvailability, setIsSavingAvailability] = useState(false)

  // Fetch user notification preferences and availability on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return

      setIsLoading(true)
      try {
        // Fetch notification preferences
        const prefResult = await getUserNotificationPreferences(user.id)
        if (prefResult.success && prefResult.data) {
          setPreferences({
            pushEnabled: prefResult.data.push_enabled ?? false,
            newApplications: prefResult.data.new_applications ?? true,
            bookingStatus: prefResult.data.booking_status ?? true,
            paymentConfirmation: prefResult.data.payment_confirmation ?? true,
            newJobMatches: prefResult.data.new_job_matches ?? true,
            shiftReminders: prefResult.data.shift_reminders ?? true,
          })
        }

        // Fetch worker tier data
        const { data: worker, error: workerError } = await supabase
          .from('workers')
          .select('tier, jobs_completed, rating, punctuality')
          .eq('user_id', user.id)
          .single()

        if (!workerError && worker) {
          setWorkerData({
            tier: worker.tier,
            jobsCompleted: worker.jobs_completed || 0,
            rating: worker.rating,
            punctuality: worker.punctuality,
          })
        }

        // Fetch worker availability
        const { data: availability, error: availabilityError } = await supabase
          .from('worker_availabilities')
          .select('*')
          .eq('worker_id', worker!.id)
          .order('day_of_week')

        if (!availabilityError && availability && availability.length > 0) {
          setAvailabilitySlots(
            availability.map((av: any) => ({
              dayOfWeek: av.day_of_week,
              dayName: DAY_NAMES[av.day_of_week],
              isAvailable: av.is_available,
              startHour: av.start_hour,
              endHour: av.end_hour,
            }))
          )
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
        toast.error("Gagal memuat data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
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

  // Handle availability slot toggle
  const handleAvailabilityToggle = (dayOfWeek: number) => {
    setAvailabilitySlots((prev) =>
      prev.map((slot) =>
        slot.dayOfWeek === dayOfWeek
          ? { ...slot, isAvailable: !slot.isAvailable }
          : slot
      )
    )
  }

  // Handle availability time change
  const handleAvailabilityTimeChange = (dayOfWeek: number, startHour: number, endHour: number) => {
    setAvailabilitySlots((prev) =>
      prev.map((slot) =>
        slot.dayOfWeek === dayOfWeek
          ? { ...slot, startHour, endHour }
          : slot
      )
    )
  }

  // Save availability settings
  const handleAvailabilitySave = async () => {
    if (!workerData) return

    setIsSavingAvailability(true)

    try {
      const result = await setWorkerAvailabilityForWeek(
        user?.id!,
        availabilitySlots.map((slot) => ({
          dayOfWeek: slot.dayOfWeek,
          startHour: slot.startHour,
          endHour: slot.endHour,
          isAvailable: slot.isAvailable,
        }))
      )

      if (result.success) {
        toast.success("Ketersediaan berhasil disimpan")
      } else {
        toast.error(result.errors?.join(", ") || "Gagal menyimpan ketersediaan")
      }
    } catch (error) {
      console.error("Failed to save availability:", error)
      toast.error("Gagal menyimpan ketersediaan")
    } finally {
      setIsSavingAvailability(false)
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
          <>
            {/* Worker Tier Section */}
            {workerData && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Status Tier Pekerja</h2>
                <TierBadgeDetailed
                  tier={workerData.tier}
                  jobsCompleted={workerData.jobsCompleted}
                  rating={workerData.rating ?? undefined}
                  punctuality={workerData.punctuality ?? undefined}
                />
              </div>
            )}

            {/* Availability Settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Ketersediaan Mingguan</h2>
                <Button
                  onClick={handleAvailabilitySave}
                  disabled={isSavingAvailability}
                  size="sm"
                >
                  {isSavingAvailability ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Simpan
                    </>
                  )}
                </Button>
              </div>
              <AvailabilitySlots
                slots={availabilitySlots}
                onSlotToggle={handleAvailabilityToggle}
                onSlotTimeChange={handleAvailabilityTimeChange}
                disabled={isSavingAvailability}
              />
            </div>

            {/* Notification Settings */}
            <NotificationSettings
              preferences={preferences}
              onPreferencesChange={handlePreferencesChange}
              isLoading={isSaving}
            />
          </>
        )}
      </div>
    </div>
  )
}
