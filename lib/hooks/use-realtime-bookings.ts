"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "../supabase/client"
import type { Database } from "../supabase/types"
import type { RealtimeChannel } from "@supabase/supabase-js"

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"]

type UseRealtimeBookingsOptions = {
  jobId?: string
  workerId?: string
  businessId?: string
  enabled?: boolean
}

type UseRealtimeBookingsReturn = {
  isConnected: boolean
  error: string | null
}

type BookingChangeEvent = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  old: BookingRow | null
  new: BookingRow | null
}

/**
 * Hook for subscribing to realtime booking changes via Supabase Realtime
 *
 * @param options - Subscription options
 * @param options.jobId - Filter bookings by job ID
 * @param options.workerId - Filter bookings by worker ID
 * @param options.businessId - Filter bookings by business ID
 * @param options.enabled - Enable/disable subscription (default: true)
 * @param onBookingChange - Callback when booking changes occur
 * @param onConnect - Callback when subscription is connected
 * @param onDisconnect - Callback when subscription is disconnected
 */
export function useRealtimeBookings(
  options: UseRealtimeBookingsOptions = {},
  callbacks?: {
    onBookingChange?: (event: BookingChangeEvent) => void
    onConnect?: () => void
    onDisconnect?: () => void
  }
): UseRealtimeBookingsReturn {
  const { jobId, workerId, businessId, enabled = true } = options

  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const subscribe = useCallback(() => {
    if (!enabled) {
      return
    }

    if (!jobId && !workerId && !businessId) {
      setError("Salah satu dari jobId, workerId, atau businessId harus disediakan")
      return
    }

    // Cleanup existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Build filter object
    const filter: Record<string, string> = {}
    if (jobId) filter['job_id'] = `eq.${jobId}`
    if (workerId) filter['worker_id'] = `eq.${workerId}`
    if (businessId) filter['business_id'] = `eq.${businessId}`

    // Get the first filter key
    const filterKey = Object.keys(filter)[0]
    const filterValue = filter[filterKey]

    // Create channel for realtime subscription
    const channelName = `bookings-${filterKey}-${filterValue}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `${filterKey}=${filterValue}`
        },
        (payload) => {
          const eventType = payload.eventType
          const oldRecord = payload.old as BookingRow | null
          const newRecord = payload.new as BookingRow | null

          callbacks?.onBookingChange?.({
            eventType: eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            old: oldRecord,
            new: newRecord
          })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setError(null)
          callbacks?.onConnect?.()
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          setError("Gagal terhubung ke subscription")
          callbacks?.onDisconnect?.()
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false)
          setError("Connection timeout")
          callbacks?.onDisconnect?.()
        } else if (status === 'CLOSED') {
          setIsConnected(false)
          callbacks?.onDisconnect?.()
        }
      })

    channelRef.current = channel
  }, [enabled, jobId, workerId, businessId, callbacks])

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
      setIsConnected(false)
    }
  }, [])

  // Subscribe on mount and when options change
  useEffect(() => {
    subscribe()

    return () => {
      unsubscribe()
    }
  }, [subscribe, unsubscribe])

  // Manual re-subscribe function
  const resubscribe = useCallback(() => {
    unsubscribe()
    subscribe()
  }, [unsubscribe, subscribe])

  return {
    isConnected,
    error,
  }
}
