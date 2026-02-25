"use client"

import { useAuth } from '../../../providers/auth-provider'
import { ConversationList } from '@/components/messaging/conversation-list'

export default function WorkerMessagesPage() {
  const { signOut, user, isLoading } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header with logout button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            Pesan
          </h1>
          <button
            onClick={handleLogout}
            disabled={isLoading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: isLoading ? '#9ca3af' : '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 500,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              opacity: isLoading ? 0.6 : 1,
              transition: 'background-color 0.2s'
            }}
          >
            {isLoading ? 'Memproses...' : 'Keluar'}
          </button>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          {user ? (
            <ConversationList userId={user.id} />
          ) : isLoading ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
              Memuat informasi pengguna...
            </p>
          ) : (
            <p style={{ color: '#ef4444', textAlign: 'center', padding: '2rem' }}>
              Error: Tidak dapat memuat informasi pengguna. Silakan refresh halaman.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
