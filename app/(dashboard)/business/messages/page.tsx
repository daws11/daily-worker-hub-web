"use client"

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { getUserConversations, getUnreadCount } from '@/lib/supabase/queries/messages'
import { getBusinessBookings } from '@/lib/supabase/queries/bookings'
import type { MessageWithRelations } from '@/lib/types/message'
import type { JobBookingWithDetails } from '@/lib/supabase/queries/bookings'
import { MessageCircle, Loader2, AlertCircle, Clock, User, Calendar, Building2, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface ConversationWithDetails extends MessageWithRelations {
  bookingDetails?: {
    job?: {
      id: string
      title: string
      address?: string
      deadline?: string
    }
    worker?: {
      id: string
      full_name: string
      phone?: string
    }
    status: string
  }
  unreadCount?: number
}

interface ConversationsData {
  total: number
  unread: number
  conversationsList: ConversationWithDetails[]
}

export default function BusinessMessagesPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ConversationsData>({ total: 0, unread: 0, conversationsList: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch business conversations
  const fetchConversations = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setError(null)

    try {
      // Fetch all user conversations (last message per booking)
      const { data: conversationsData, error: conversationsError } = await getUserConversations(user.id)

      if (conversationsError) {
        throw conversationsError
      }

      // Get unread count
      const { data: unreadData, error: unreadError } = await getUnreadCount(user.id)

      if (unreadError) {
        throw unreadError
      }

      // Get all business bookings to add job details
      const { data: bookingsData, error: bookingsError } = await getBusinessBookings(user.id)

      if (bookingsError) {
        throw bookingsError
      }

      // Create a map of booking_id to booking details
      const bookingMap = new Map()
      bookingsData?.forEach(booking => {
        bookingMap.set(booking.id, {
          job: booking.job,
          worker: booking.worker,
          status: booking.status
        })
      })

      // Enrich conversations with booking details
      const conversationsWithDetails: ConversationWithDetails[] = (conversationsData || []).map(conv => {
        const bookingDetails = conv.booking_id ? bookingMap.get(conv.booking_id) : undefined

        // Calculate unread count for this booking
        const unreadForBooking = unreadData?.by_booking?.find(b => b.booking_id === conv.booking_id)?.count || 0

        return {
          ...conv,
          bookingDetails,
          unreadCount: unreadForBooking
        }
      })

      // Sort by most recent message and by unread first
      conversationsWithDetails.sort((a, b) => {
        // Prioritize unread conversations
        if (a.unreadCount && !b.unreadCount) return -1
        if (!a.unreadCount && b.unreadCount) return 1
        // Then sort by created_at
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      setConversations({
        total: conversationsWithDetails.length,
        unread: unreadData?.total_unread || 0,
        conversationsList: conversationsWithDetails
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Format date to Indonesian locale
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } else if (diffDays === 1) {
      return 'Kemarin'
    } else if (diffDays < 7) {
      return date.toLocaleDateString('id-ID', { weekday: 'long' })
    } else {
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    }
  }

  // Get other user info from message
  const getOtherUser = (message: MessageWithRelations) => {
    // If current user is the sender, show receiver
    if (message.sender.id === user?.id) {
      return message.receiver
    }
    // Otherwise show sender
    return message.sender
  }

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Pesan
          </h1>
          <p style={{ color: '#666', fontSize: '0.875rem' }}>
            Kelola komunikasi dengan pekerja untuk setiap booking
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <AlertCircle style={{ width: '1.25rem', height: '1.25rem', color: '#dc2626' }} />
            <div style={{ flex: 1 }}>
              <p style={{ color: '#991b1b', fontWeight: 500, marginBottom: '0.25rem' }}>
                Gagal memuat data
              </p>
              <p style={{ color: '#b91c1c', fontSize: '0.875rem' }}>{error}</p>
            </div>
            <button
              onClick={fetchConversations}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Loader2 style={{ width: '1rem', height: '1rem' }} />
              Coba Lagi
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '3rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <Loader2 style={{ width: '2rem', height: '2rem', color: '#2563eb', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#666' }}>Memuat pesan...</p>
          </div>
        )}

        {/* Stats Cards */}
        {!loading && !error && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              backgroundColor: 'white'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Total Percakapan
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>
                {conversations.total ?? 0}
              </p>
            </div>

            <div style={{
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              backgroundColor: 'white'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Belum Dibaca
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>
                  {conversations.unread ?? 0}
                </p>
                {conversations.unread > 0 && (
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 500
                  }}>
                    Baru
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && conversations.conversationsList?.length === 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '3rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            border: '1px dashed #d1d5db'
          }}>
            <MessageCircle style={{ width: '3rem', height: '3rem', color: '#9ca3af', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Belum Ada Percakapan
            </h3>
            <p style={{ color: '#666' }}>
              Pesan akan muncul di sini setelah Anda memiliki booking aktif dengan pekerja
            </p>
          </div>
        )}

        {/* Conversations List */}
        {!loading && !error && conversations.conversationsList && conversations.conversationsList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {conversations.conversationsList.map((conversation) => {
              const otherUser = getOtherUser(conversation)
              const isUnread = !conversation.is_read && conversation.receiver_id === user?.id

              return (
                <Link
                  key={conversation.id}
                  href={`/business/messages/${conversation.booking_id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '0.5rem',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      padding: '1rem 1.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: isUnread ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {/* Unread Indicator */}
                    {isUnread && (
                      <div style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        width: '0.5rem',
                        height: '0.5rem',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6'
                      }} />
                    )}

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {/* Avatar */}
                      <div style={{
                        width: '3rem',
                        height: '3rem',
                        borderRadius: '50%',
                        backgroundColor: '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        {otherUser.avatar_url ? (
                          <img
                            src={otherUser.avatar_url}
                            alt={otherUser.full_name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <User style={{ width: '1.5rem', height: '1.5rem', color: '#666' }} />
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Header: Name + Time */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <h3 style={{
                            fontSize: '1rem',
                            fontWeight: isUnread ? 600 : 500,
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {otherUser.full_name}
                            {otherUser.role === 'worker' && (
                              <span style={{
                                marginLeft: '0.5rem',
                                fontSize: '0.75rem',
                                color: '#666',
                                fontWeight: 400
                              }}>
                                (Pekerja)
                              </span>
                            )}
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af', flexShrink: 0, marginLeft: '0.5rem' }}>
                            {formatDate(conversation.created_at)}
                          </span>
                        </div>

                        {/* Job Title */}
                        {conversation.bookingDetails?.job && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.875rem',
                            color: '#666',
                            marginBottom: '0.5rem'
                          }}>
                            <Building2 style={{ width: '0.875rem', height: '0.875rem' }} />
                            <span style={{ fontWeight: 500 }}>
                              {conversation.bookingDetails.job.title}
                            </span>
                          </div>
                        )}

                        {/* Last Message */}
                        <p style={{
                          fontSize: '0.875rem',
                          color: isUnread ? '#1f2937' : '#6b7280',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: isUnread ? 500 : 400
                        }}>
                          {conversation.content}
                        </p>

                        {/* Footer: Status + Unread Count */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '0.5rem',
                          fontSize: '0.75rem',
                          color: '#9ca3af'
                        }}>
                          {conversation.bookingDetails && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Calendar style={{ width: '0.875rem', height: '0.875rem' }} />
                              <span>
                                Status: {conversation.bookingDetails.status}
                              </span>
                            </div>
                          )}
                          {conversation.unreadCount && conversation.unreadCount > 0 && (
                            <div style={{
                              padding: '0.125rem 0.5rem',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: 500
                            }}>
                              {conversation.unreadCount} baru
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
