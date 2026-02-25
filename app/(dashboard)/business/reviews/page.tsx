"use client"

import { useAuth } from '@/providers/auth-provider'
import { ReviewList } from '@/components/review/review-list'
import { Star } from 'lucide-react'

export default function BusinessReviewsPage() {
  const { user, isLoading: authLoading } = useAuth()

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Star style={{ width: '1.5rem', height: '1.5rem', color: '#fbbf24', fill: '#fbbf24' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
              Ulasan Bisnis
            </h1>
          </div>
          <p style={{ color: '#666', fontSize: '0.875rem' }}>
            Lihat ulasan dari pekerja yang telah bekerja dengan Anda
          </p>
        </div>

        {/* Content Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          {authLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div style={{
                display: 'inline-block',
                width: '2.5rem',
                height: '2.5rem',
                border: '3px solid #e5e7eb',
                borderTopColor: '#2563eb',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ color: '#666', marginTop: '1rem' }}>Memuat informasi pengguna...</p>
            </div>
          ) : user ? (
            <ReviewList entityId={user.id} entityType="business" />
          ) : (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <p style={{ color: '#991b1b', fontWeight: 500, marginBottom: '0.5rem' }}>
                Error: Tidak dapat memuat informasi pengguna
              </p>
              <p style={{ color: '#b91c1c', fontSize: '0.875rem' }}>
                Silakan refresh halaman atau login kembali
              </p>
            </div>
          )}
        </div>
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
