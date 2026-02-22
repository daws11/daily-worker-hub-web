"use client"

import { useState, useEffect, useMemo } from "react"
import { Loader2, FileText, CheckCircle, XCircle, Clock } from "lucide-react"

import { useAuth } from "../../../providers/auth-provider"
import { useBookings } from "../../../../lib/hooks/use-bookings"
import { calculateReliabilityScore } from "../../../../lib/supabase/queries/bookings"
import { WorkerApplicationCard } from "../../../../components/booking/worker-application-card"
import { BookingActions } from "../../../../components/booking/booking-actions"
import { BulkActions } from "../../../../components/booking/bulk-actions"
import { WorkerNotesDialog } from "../../../../components/booking/worker-notes-dialog"
import { supabase } from "../../../../lib/supabase/client"
import type { Database } from "../../../../lib/supabase/types"

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"]

export default function BusinessJobsPage() {
  const { user } = useAuth()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [allWorkerBookings, setAllWorkerBookings] = useState<Array<{ worker_id: string; bookings: any[] }>>([])
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(new Set())
  const [notesDialogOpen, setNotesDialogOpen] = useState(false)
  const [activeBookingForNotes, setActiveBookingForNotes] = useState<{ id: string; workerName: string; notes?: string } | null>(null)

  // Fetch business ID for current user
  useEffect(() => {
    async function fetchBusinessId() {
      if (!user) {
        setBusinessId(null)
        return
      }

      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (error) {
          console.error('Error fetching business:', error)
          return
        }

        setBusinessId(data?.id ?? null)
      } catch (err) {
        console.error('Unexpected error fetching business:', err)
      }
    }

    fetchBusinessId()
  }, [user])

  // Fetch all worker bookings to calculate reliability scores
  useEffect(() => {
    async function fetchWorkerBookings() {
      if (!businessId) return

      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('worker_id, status, rating, checked_in_at, shift_start_time')
          .eq('business_id', businessId)

        if (error) {
          console.error('Error fetching worker bookings:', error)
          return
        }

        // Group bookings by worker_id
        const bookingsByWorker = (data ?? []).reduce((acc: Record<string, any[]>, booking: any) => {
          if (!acc[booking.worker_id]) {
            acc[booking.worker_id] = []
          }
          acc[booking.worker_id].push(booking)
          return acc
        }, {})

        setAllWorkerBookings(
          Object.entries(bookingsByWorker).map(([worker_id, bookings]) => ({
            worker_id,
            bookings,
          }))
        )
      } catch (err) {
        console.error('Unexpected error fetching worker bookings:', err)
      }
    }

    fetchWorkerBookings()
  }, [businessId])

  // Calculate reliability scores for all workers
  const reliabilityScores = useMemo(() => {
    const scores: Record<string, number> = {}
    allWorkerBookings.forEach(({ worker_id, bookings }) => {
      scores[worker_id] = calculateReliabilityScore(bookings)
    })
    return scores
  }, [allWorkerBookings])

  // Fetch bookings using the hook
  const {
    bookings,
    isLoading,
    error,
    updateStatus,
    bulkUpdateStatus,
    addNotes,
    refreshBookings,
  } = useBookings({ businessId: businessId ?? undefined, autoFetch: !!businessId })

  // Handle selection toggle
  const handleToggleSelection = (bookingId: string) => {
    setSelectedBookingIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId)
      } else {
        newSet.add(bookingId)
      }
      return newSet
    })
  }

  // Handle clear selection
  const handleClearSelection = () => {
    setSelectedBookingIds(new Set())
  }

  // Handle accept action
  const handleAccept = async (bookingId: string) => {
    await updateStatus(bookingId, 'accepted')
    setSelectedBookingIds((prev) => {
      const newSet = new Set(prev)
      newSet.delete(bookingId)
      return newSet
    })
  }

  // Handle reject action
  const handleReject = async (bookingId: string) => {
    await updateStatus(bookingId, 'rejected')
    setSelectedBookingIds((prev) => {
      const newSet = new Set(prev)
      newSet.delete(bookingId)
      return newSet
    })
  }

  // Handle bulk accept
  const handleBulkAccept = async (bookingIds: string[]) => {
    await bulkUpdateStatus(bookingIds, 'accepted')
    handleClearSelection()
  }

  // Handle bulk reject
  const handleBulkReject = async (bookingIds: string[]) => {
    await bulkUpdateStatus(bookingIds, 'rejected')
    handleClearSelection()
  }

  // Handle notes dialog
  const handleOpenNotes = (booking: any) => {
    setActiveBookingForNotes({
      id: booking.id,
      workerName: booking.worker?.full_name ?? 'Worker',
      notes: booking.booking_notes,
    })
    setNotesDialogOpen(true)
  }

  const handleSaveNotes = async (bookingId: string, notes: string) => {
    await addNotes(bookingId, notes)
    setNotesDialogOpen(false)
    setActiveBookingForNotes(null)
  }

  // Calculate statistics
  const stats = useMemo(() => {
    if (!bookings) return { total: 0, pending: 0, accepted: 0, rejected: 0 }
    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      accepted: bookings.filter((b) => b.status === 'accepted').length,
      rejected: bookings.filter((b) => b.status === 'rejected').length,
    }
  }, [bookings])

  // Filter bookings by status
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all')
  const filteredBookings = bookings?.filter((booking) => {
    if (statusFilter === 'all') return true
    return booking.status === statusFilter
  }) ?? []

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-sm text-center">
            <p className="text-gray-600">Please log in to view your bookings.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!businessId && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-sm text-center">
            <p className="text-gray-600">Business profile not found. Please complete your business registration.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Booking Applications</h1>
          <p className="text-gray-600 mt-1">Manage worker applications for your jobs</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Accepted</p>
                <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Bulk Actions */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'pending'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending ({stats.pending})
              </button>
              <button
                onClick={() => setStatusFilter('accepted')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'accepted'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Accepted ({stats.accepted})
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'rejected'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Rejected ({stats.rejected})
              </button>
            </div>

            {selectedBookingIds.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {selectedBookingIds.size} selected
                </span>
                <button
                  onClick={handleClearSelection}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear
                </button>
                <BulkActions
                  selectedBookingIds={Array.from(selectedBookingIds)}
                  onBulkAccept={handleBulkAccept}
                  onBulkReject={handleBulkReject}
                  isLoading={isLoading}
                />
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg p-12 shadow-sm text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="mt-4 text-gray-600">Loading bookings...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-red-200">
            <p className="text-red-600">Error: {error}</p>
          </div>
        )}

        {/* Bookings List */}
        {!isLoading && !error && filteredBookings.length === 0 && (
          <div className="bg-white rounded-lg p-12 shadow-sm text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications yet</h3>
            <p className="text-gray-600">
              {statusFilter === 'all'
                ? "Workers haven't applied to your jobs yet."
                : `No ${statusFilter} applications found.`}
            </p>
          </div>
        )}

        {!isLoading && !error && filteredBookings.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="relative">
                <WorkerApplicationCard
                  booking={booking as any}
                  reliabilityScore={reliabilityScores[booking.worker_id]}
                  onSelect={handleToggleSelection}
                  isSelected={selectedBookingIds.has(booking.id)}
                />

                {/* Action Buttons */}
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-white rounded-lg shadow-sm p-1.5">
                  <BookingActions
                    bookingId={booking.id}
                    status={booking.status}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    isLoading={isLoading}
                    size="sm"
                    showLabels={false}
                  />
                </div>

                {/* Notes Button */}
                {booking.status !== 'rejected' && (
                  <button
                    onClick={() => handleOpenNotes(booking)}
                    className="absolute bottom-4 right-4 px-3 py-1.5 bg-white rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors border border-gray-200"
                  >
                    {booking.booking_notes ? 'Edit Notes' : 'Add Notes'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes Dialog */}
      {activeBookingForNotes && (
        <WorkerNotesDialog
          open={notesDialogOpen}
          onOpenChange={setNotesDialogOpen}
          bookingId={activeBookingForNotes.id}
          workerName={activeBookingForNotes.workerName}
          existingNotes={activeBookingForNotes.notes}
          onSave={handleSaveNotes}
        />
      )}
    </div>
  )
}
