"use client"

import * as React from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { BookingCard, type Booking } from "@/components/worker/booking-card"

export interface BookingListProps {
  workerId: string
}

type BookingStatusGroup = {
  pending: Booking[]
  accepted: Booking[]
  completed: Booking[]
  cancelled: Booking[]
}

const statusGroupLabels: Record<keyof BookingStatusGroup, string> = {
  pending: "Pending Bookings",
  accepted: "Accepted & In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
}

function groupBookingsByStatus(bookings: Booking[]): BookingStatusGroup {
  return bookings.reduce<BookingStatusGroup>(
    (groups, booking) => {
      if (booking.status === "pending") {
        groups.pending.push(booking)
      } else if (booking.status === "accepted" || booking.status === "in_progress") {
        groups.accepted.push(booking)
      } else if (booking.status === "completed") {
        groups.completed.push(booking)
      } else if (booking.status === "cancelled" || booking.status === "rejected") {
        groups.cancelled.push(booking)
      }
      return groups
    },
    { pending: [], accepted: [], completed: [], cancelled: [] }
  )
}

async function fetchBookings(workerId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id,
      job_id,
      business_id,
      status,
      start_date,
      end_date,
      final_price,
      created_at,
      job:jobs(
        id,
        title,
        description,
        address
      ),
      business:businesses(
        id,
        name,
        is_verified
      )
    `)
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data as Booking[]) || []
}

async function cancelBooking(bookingId: string): Promise<void> {
  const { data, error } = await supabase
    .from("bookings")
    // @ts-ignore - Supabase type inference issue with React 19
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .select()

  if (error) {
    throw error
  }
}

function BookingList({ workerId }: BookingListProps) {
  const [bookings, setBookings] = React.useState<Booking[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isCancelling, setIsCancelling] = React.useState<string | null>(null)

  const loadBookings = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchBookings(workerId)
      setBookings(data)
    } catch (error: any) {
      toast.error("Gagal memuat booking: " + error.message)
    } finally {
      setIsLoading(false)
    }
  }, [workerId])

  React.useEffect(() => {
    loadBookings()
  }, [loadBookings])

  const handleCancel = async (bookingId: string) => {
    setIsCancelling(bookingId)
    try {
      await cancelBooking(bookingId)
      toast.success("Booking berhasil dibatalkan")
      await loadBookings()
    } catch (error: any) {
      toast.error("Gagal membatalkan booking: " + error.message)
    } finally {
      setIsCancelling(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const groupedBookings = groupBookingsByStatus(bookings)
  const hasBookings = Object.values(groupedBookings).some((group) => group.length > 0)

  if (!hasBookings) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Belum ada booking.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {(Object.keys(groupedBookings) as Array<keyof BookingStatusGroup>).map(
        (status) => {
          const groupBookings = groupedBookings[status]
          if (groupBookings.length === 0) return null

          return (
            <div key={status} className="space-y-4">
              <h2 className="text-xl font-semibold">{statusGroupLabels[status]}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    workerId={workerId}
                    onCancel={
                      booking.status === "pending"
                        ? () => handleCancel(booking.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          )
        }
      )}
    </div>
  )
}

export { BookingList }
