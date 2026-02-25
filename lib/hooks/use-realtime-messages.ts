"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "../supabase/client"
import type { Database } from "../supabase/types"
import type { RealtimeChannel } from "@supabase/supabase-js"

type MessageRow = Database["public"]["Tables"]["messages"]["Row"]

type UseRealtimeMessagesOptions = {
  bookingId?: string
  senderId?: string
  receiverId?: string
  enabled?: boolean
}

type UseRealtimeMessagesReturn = {
  isConnected: boolean
  error: string | null
}

type MessageChangeEvent = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  old: MessageRow | null
  new: MessageRow | null
}

/**
 * Hook for subscribing to realtime message changes via Supabase Realtime
 *
 * @param options - Subscription options
 * @param options.bookingId - Filter messages by booking ID
 * @param options.senderId - Filter messages by sender ID
 * @param options.receiverId - Filter messages by receiver ID
 * @param options.enabled - Enable/disable subscription (default: true)
 * @param onMessageChange - Callback when message changes occur
 * @param onConnect - Callback when subscription is connected
 * @param onDisconnect - Callback when subscription is disconnected
 */
export function useRealtimeMessages(
  options: UseRealtimeMessagesOptions = {},
  callbacks?: {
    onMessageChange?: (event: MessageChangeEvent) => void
    onConnect?: () => void
    onDisconnect?: () => void
  }
): UseRealtimeMessagesReturn {
  const { bookingId, senderId, receiverId, enabled = true } = options

  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const subscribe = useCallback(() => {
    if (!enabled) {
      return
    }

    if (!bookingId && !senderId && !receiverId) {
      setError("Salah satu dari bookingId, senderId, atau receiverId harus disediakan")
      return
    }

    // Cleanup existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Build filter object
    const filter: Record<string, string> = {}
    if (bookingId) filter['booking_id'] = `eq.${bookingId}`
    if (senderId) filter['sender_id'] = `eq.${senderId}`
    if (receiverId) filter['receiver_id'] = `eq.${receiverId}`

    // Get the first filter key
    const filterKey = Object.keys(filter)[0]
    const filterValue = filter[filterKey]

    // Create channel for realtime subscription
    const channelName = `messages-${filterKey}-${filterValue}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `${filterKey}=${filterValue}`
        },
        (payload) => {
          const eventType = payload.eventType
          const oldRecord = payload.old as MessageRow | null
          const newRecord = payload.new as MessageRow | null

          callbacks?.onMessageChange?.({
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
  }, [enabled, bookingId, senderId, receiverId, callbacks])

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
