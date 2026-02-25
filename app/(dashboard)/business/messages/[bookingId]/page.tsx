"use client"

import { useState, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { getBookingMessages, getUnreadCount } from '@/lib/supabase/queries/messages'
import { getBookingById } from '@/lib/supabase/queries/bookings'
import { MessageBubble } from '@/components/messaging/message-bubble'
import { MessageInput } from '@/components/messaging/message-input'
import { sendMessage } from '@/lib/actions/messages'
import { Loader2, AlertCircle, ArrowLeft, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRealtimeMessages } from '@/lib/hooks/use-realtime-messages'
import type { MessageWithRelations } from '@/lib/types/message'

export default function BusinessBookingMessagePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const bookingId = params.bookingId as string

  const [messages, setMessages] = useState<MessageWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receiverInfo, setReceiverInfo] = useState<{ id: string; name: string } | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Fetch messages and booking details
  const fetchMessages = useCallback(async () => {
    if (!bookingId || !user?.id) return

    setLoading(true)
    setError(null)

    try {
      // Fetch messages for this booking
      const { data: messagesData, error: messagesError } = await getBookingMessages(bookingId)

      if (messagesError) {
        throw messagesError
      }

      // Fetch booking details to get worker info
      const { data: bookingData, error: bookingError } = await getBookingById(bookingId)

      if (bookingError) {
        throw bookingError
      }

      // Determine receiver (worker)
      if (bookingData?.worker) {
        setReceiverInfo({
          id: bookingData.worker.id,
          name: bookingData.worker.full_name || 'Pekerja'
        })
      }

      setMessages(messagesData || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat pesan'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [bookingId, user?.id])

  // Subscribe to realtime message updates
  useRealtimeMessages(
    { bookingId, enabled: true },
    {
      onMessageChange: async () => {
        await fetchMessages()
      },
      onConnect: () => {
        setIsConnected(true)
      },
      onDisconnect: () => {
        setIsConnected(false)
      }
    }
  )

  // Fetch messages on mount
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Send message
  const handleSendMessage = async (content: string) => {
    if (!receiverInfo || !user?.id) return

    setSending(true)
    try {
      const result = await sendMessage(user.id, receiverInfo.id, content, bookingId)

      if (!result.success) {
        throw new Error(result.error || 'Gagal mengirim pesan')
      }

      // Refresh messages after sending
      await fetchMessages()
      toast.success('Pesan terkirim')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengirim pesan'
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  // Format date to Indonesian locale
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={() => router.back()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
            Kembali
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Pesan
              </h1>
              <p style={{ color: '#666', fontSize: '0.875rem' }}>
                {receiverInfo ? `Percakapan dengan ${receiverInfo.name}` : 'Memuat...'}
              </p>
            </div>

            {/* Connection Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#10b981' : '#f59e0b'
              }} />
              <span style={{ fontSize: '0.75rem', color: '#666' }}>
                {isConnected ? 'Terhubung' : 'Menghubungkan...'}
              </span>
            </div>
          </div>
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
                Gagal memuat pesan
              </p>
              <p style={{ color: '#b91c1c', fontSize: '0.875rem' }}>{error}</p>
            </div>
            <button
              onClick={fetchMessages}
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

        {/* Messages Area */}
        {!loading && !error && (
          <>
            {/* Messages List */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              marginBottom: '1rem',
              minHeight: '400px',
              maxHeight: '600px',
              overflowY: 'auto',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {messages.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem',
                  color: '#666'
                }}>
                  <MessageCircle style={{ width: '3rem', height: '3rem', color: '#9ca3af', margin: '0 auto 1rem' }} />
                  <p>Belum ada pesan</p>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    Mulai percakapan dengan {receiverInfo?.name || 'pekerja'}
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const isSent = message.sender_id === user?.id
                  return (
                    <div
                      key={message.id}
                      style={{
                        display: 'flex',
                        justifyContent: isSent ? 'flex-end' : 'flex-start',
                        marginBottom: '0.5rem'
                      }}
                    >
                      <div style={{
                        maxWidth: '70%',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        backgroundColor: isSent ? '#2563eb' : '#f3f4f6',
                        color: isSent ? 'white' : '#1f2937'
                      }}>
                        <p style={{ margin: 0, fontSize: '0.875rem' }}>
                          {message.content}
                        </p>
                        <p style={{
                          margin: '0.25rem 0 0 0',
                          fontSize: '0.75rem',
                          opacity: 0.7,
                          textAlign: 'right'
                        }}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Message Input */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              padding: '1rem'
            }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Ketik pesan..."
                  disabled={sending || !isConnected}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      const target = e.target as HTMLInputElement
                      if (target.value.trim()) {
                        handleSendMessage(target.value.trim())
                        target.value = ''
                      }
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('input[type="text"]') as HTMLInputElement
                    if (input?.value.trim()) {
                      handleSendMessage(input.value.trim())
                      input.value = ''
                    }
                  }}
                  disabled={sending || !isConnected}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: sending || !isConnected ? '#9ca3af' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: sending || !isConnected ? 'not-allowed' : 'pointer'
                  }}
                >
                  {sending ? 'Mengirim...' : 'Kirim'}
                </button>
              </div>
              {!isConnected && (
                <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.5rem' }}>
                  Menunggu koneksi...
                </p>
              )}
            </div>
          </>
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
