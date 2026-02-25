"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  getBookingMessages,
  getUserMessages,
  getUnreadCount,
  getBookingUnreadCount,
  markMessageAsRead,
  markBookingMessagesAsRead,
  markSenderMessagesAsRead,
  getMessageById,
  getConversation,
  getUserConversations,
} from "../supabase/queries/messages"
import { sendMessage, deleteMessage as deleteMessageAction } from "../actions/messages"
import type { Database } from "../supabase/types"
import type { MessageWithRelations } from "../types/message"

type MessageRow = Database["public"]["Tables"]["messages"]["Row"]

type UseMessagesOptions = {
  bookingId?: string
  userId?: string
  otherUserId?: string
  messageId?: string
  autoFetch?: boolean
}

type UseMessagesReturn = {
  messages: MessageWithRelations[] | null
  message: MessageWithRelations | null
  conversations: MessageWithRelations[] | null
  unreadCount: number
  bookingUnreadCount: number
  isLoading: boolean
  error: string | null
  fetchMessages: () => Promise<void>
  fetchMessage: () => Promise<void>
  fetchConversation: () => Promise<void>
  fetchConversations: () => Promise<void>
  fetchUnreadCount: () => Promise<void>
  fetchBookingUnreadCount: () => Promise<void>
  sendNewMessage: (receiverId: string, content: string, bookingId?: string) => Promise<void>
  markAsRead: (messageId: string) => Promise<void>
  markBookingAsRead: (bookingId: string, receiverId: string) => Promise<void>
  markSenderAsRead: (senderId: string, receiverId: string) => Promise<void>
  deleteMessage: (messageId: string, userId: string) => Promise<void>
  refreshMessages: () => Promise<void>
}

export function useMessages(options: UseMessagesOptions = {}): UseMessagesReturn {
  const { bookingId, userId, otherUserId, messageId, autoFetch = true } = options

  const [messages, setMessages] = useState<MessageWithRelations[] | null>(null)
  const [message, setMessage] = useState<MessageWithRelations | null>(null)
  const [conversations, setConversations] = useState<MessageWithRelations[] | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [bookingUnreadCount, setBookingUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!bookingId && !userId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      let result

      if (bookingId) {
        result = await getBookingMessages(bookingId)
      } else if (userId) {
        result = await getUserMessages(userId)
      } else {
        return
      }

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengambil data pesan: " + result.error.message)
        return
      }

      setMessages(result.data as MessageWithRelations[] | null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengambil data pesan: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [bookingId, userId])

  const fetchMessage = useCallback(async () => {
    if (!messageId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getMessageById(messageId)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengambil data pesan: " + result.error.message)
        return
      }

      setMessage(result.data as MessageWithRelations | null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengambil data pesan: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [messageId])

  const fetchConversation = useCallback(async () => {
    if (!bookingId || !userId || !otherUserId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getConversation(bookingId, userId, otherUserId)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengambil data percakapan: " + result.error.message)
        return
      }

      setMessages(result.data as MessageWithRelations[] | null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengambil data percakapan: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [bookingId, userId, otherUserId])

  const fetchConversations = useCallback(async () => {
    if (!userId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getUserConversations(userId)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengambil data percakapan: " + result.error.message)
        return
      }

      setConversations(result.data as MessageWithRelations[] | null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengambil data percakapan: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) {
      return
    }

    setError(null)

    try {
      const result = await getUnreadCount(userId)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengambil jumlah pesan belum dibaca: " + result.error.message)
        return
      }

      setUnreadCount(result.data?.total_unread || 0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengambil jumlah pesan belum dibaca: " + errorMessage)
    }
  }, [userId])

  const fetchBookingUnreadCount = useCallback(async () => {
    if (!bookingId || !userId) {
      return
    }

    setError(null)

    try {
      const result = await getBookingUnreadCount(bookingId, userId)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengambil jumlah pesan belum dibaca: " + result.error.message)
        return
      }

      setBookingUnreadCount(result.data as number)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengambil jumlah pesan belum dibaca: " + errorMessage)
    }
  }, [bookingId, userId])

  const sendNewMessage = useCallback(async (receiverId: string, content: string, bookingId?: string) => {
    if (!userId) {
      toast.error("User ID tidak ditemukan")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await sendMessage(userId, receiverId, content, bookingId)

      if (!result.success) {
        setError(result.error || "Gagal mengirim pesan")
        toast.error("Gagal mengirim pesan: " + (result.error || "Unknown error"))
        return
      }

      toast.success("Pesan berhasil dikirim")

      // Refresh messages after sending
      await fetchMessages()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengirim pesan: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [userId, fetchMessages])

  const markAsRead = useCallback(async (messageId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await markMessageAsRead(messageId)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal menandai pesan: " + result.error.message)
        return
      }

      // Refresh unread count
      await fetchUnreadCount()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal menandai pesan: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchUnreadCount])

  const markBookingAsRead = useCallback(async (bookingId: string, receiverId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await markBookingMessagesAsRead(bookingId, receiverId)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal menandai pesan: " + result.error.message)
        return
      }

      toast.success("Semua pesan ditandai sudah dibaca")

      // Refresh messages and unread count
      await fetchMessages()
      await fetchUnreadCount()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal menandai pesan: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchMessages, fetchUnreadCount])

  const markSenderAsRead = useCallback(async (senderId: string, receiverId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await markSenderMessagesAsRead(senderId, receiverId)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal menandai pesan: " + result.error.message)
        return
      }

      toast.success("Semua pesan ditandai sudah dibaca")

      // Refresh messages and unread count
      await fetchMessages()
      await fetchUnreadCount()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal menandai pesan: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchMessages, fetchUnreadCount])

  const deleteMessage = useCallback(async (messageId: string, userId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await deleteMessageAction(messageId, userId)

      if (!result.success) {
        setError(result.error || "Gagal menghapus pesan")
        toast.error("Gagal menghapus pesan: " + (result.error || "Unknown error"))
        return
      }

      toast.success("Pesan berhasil dihapus")

      // Refresh messages after deletion
      await fetchMessages()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal menghapus pesan: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchMessages])

  const refreshMessages = useCallback(async () => {
    await fetchMessages()
  }, [fetchMessages])

  // Auto-fetch on mount and when options change
  useEffect(() => {
    if (autoFetch) {
      if (messageId) {
        fetchMessage()
      } else if (otherUserId && bookingId && userId) {
        fetchConversation()
      } else if (userId && !bookingId) {
        fetchConversations()
      } else {
        fetchMessages()
      }

      // Also fetch unread count if userId is provided
      if (userId) {
        fetchUnreadCount()
        if (bookingId) {
          fetchBookingUnreadCount()
        }
      }
    }
  }, [autoFetch, messageId, otherUserId, bookingId, userId, fetchMessages, fetchMessage, fetchConversation, fetchConversations, fetchUnreadCount, fetchBookingUnreadCount])

  return {
    messages,
    message,
    conversations,
    unreadCount,
    bookingUnreadCount,
    isLoading,
    error,
    fetchMessages,
    fetchMessage,
    fetchConversation,
    fetchConversations,
    fetchUnreadCount,
    fetchBookingUnreadCount,
    sendNewMessage,
    markAsRead,
    markBookingAsRead,
    markSenderAsRead,
    deleteMessage,
    refreshMessages,
  }
}
