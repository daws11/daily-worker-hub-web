"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  getJobBookings,
  getWorkerBookings,
  getBusinessBookings,
  getBookingById,
  updateBookingStatus,
  updateMultipleBookingStatuses,
  addBookingNotes,
  createBooking,
  deleteBooking,
  type JobBookingWithDetails,
} from "../supabase/queries/bookings"
import type { Database } from "../supabase/types"

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"]
type BookingStatus = BookingRow["status"]

type UseBookingsOptions = {
  jobId?: string
  workerId?: string
  businessId?: string
  bookingId?: string
  autoFetch?: boolean
}

type UseBookingsReturn = {
  bookings: JobBookingWithDetails[] | null
  booking: JobBookingWithDetails | null
  isLoading: boolean
  error: string | null
  fetchBookings: () => Promise<void>
  fetchBooking: () => Promise<void>
  updateStatus: (bookingId: string, status: BookingStatus) => Promise<void>
  bulkUpdateStatus: (bookingIds: string[], status: BookingStatus) => Promise<void>
  addNotes: (bookingId: string, notes: string) => Promise<void>
  createNewBooking: (booking: Omit<BookingRow, "id" | "created_at" | "updated_at">) => Promise<void>
  removeBooking: (bookingId: string) => Promise<void>
  refreshBookings: () => Promise<void>
}

export function useBookings(options: UseBookingsOptions = {}): UseBookingsReturn {
  const { jobId, workerId, businessId, bookingId, autoFetch = true } = options

  const [bookings, setBookings] = useState<JobBookingWithDetails[] | null>(null)
  const [booking, setBooking] = useState<JobBookingWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBookings = useCallback(async () => {
    if (!jobId && !workerId && !businessId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      let result

      if (jobId) {
        result = await getJobBookings(jobId)
      } else if (workerId) {
        result = await getWorkerBookings(workerId)
      } else if (businessId) {
        result = await getBusinessBookings(businessId)
      } else {
        return
      }

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengambil data booking: " + result.error.message)
        return
      }

      setBookings(result.data as JobBookingWithDetails[] | null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengambil data booking: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [jobId, workerId, businessId])

  const fetchBooking = useCallback(async () => {
    if (!bookingId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getBookingById(bookingId)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengambil data booking: " + result.error.message)
        return
      }

      setBooking(result.data as JobBookingWithDetails | null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengambil data booking: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [bookingId])

  const updateStatus = useCallback(async (bookingId: string, status: BookingStatus) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await updateBookingStatus(bookingId, status)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengupdate status booking: " + result.error.message)
        return
      }

      toast.success("Status booking berhasil diperbarui")

      // Refresh bookings after update
      await fetchBookings()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengupdate status booking: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchBookings])

  const bulkUpdateStatus = useCallback(async (bookingIds: string[], status: BookingStatus) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await updateMultipleBookingStatuses(bookingIds, status)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengupdate status booking: " + result.error.message)
        return
      }

      toast.success(`${bookingIds.length} booking berhasil diperbarui`)

      // Refresh bookings after update
      await fetchBookings()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengupdate status booking: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchBookings])

  const addNotes = useCallback(async (bookingId: string, notes: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await addBookingNotes(bookingId, notes)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal menambahkan catatan: " + result.error.message)
        return
      }

      toast.success("Catatan berhasil ditambahkan")

      // Refresh bookings after update
      await fetchBookings()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal menambahkan catatan: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchBookings])

  const createNewBooking = useCallback(async (booking: Omit<BookingRow, "id" | "created_at" | "updated_at">) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await createBooking(booking)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal membuat booking: " + result.error.message)
        return
      }

      toast.success("Booking berhasil dibuat")

      // Refresh bookings after creation
      await fetchBookings()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal membuat booking: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchBookings])

  const removeBooking = useCallback(async (bookingId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await deleteBooking(bookingId)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal menghapus booking: " + result.error.message)
        return
      }

      toast.success("Booking berhasil dihapus")

      // Refresh bookings after deletion
      await fetchBookings()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal menghapus booking: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchBookings])

  const refreshBookings = useCallback(async () => {
    await fetchBookings()
  }, [fetchBookings])

  // Auto-fetch on mount and when options change
  useEffect(() => {
    if (autoFetch) {
      if (bookingId) {
        fetchBooking()
      } else {
        fetchBookings()
      }
    }
  }, [autoFetch, bookingId, fetchBookings, fetchBooking])

  return {
    bookings,
    booking,
    isLoading,
    error,
    fetchBookings,
    fetchBooking,
    updateStatus,
    bulkUpdateStatus,
    addNotes,
    createNewBooking,
    removeBooking,
    refreshBookings,
  }
}
