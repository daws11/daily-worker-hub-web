"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../../providers/auth-provider"
import { supabase } from "../../../../lib/supabase/client"

type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

interface WorkerProfile {
  full_name: string | null
  gender: string | null
  dob: string | null
  phone: string | null
  address: string | null
  experience_years: number | null
  kyc_status: KycStatus
}

export default function WorkerJobsPage() {
  const { signOut, user, isLoading } = useAuth()
  const [profileHovered, setProfileHovered] = useState(false)
  const [kycHovered, setKycHovered] = useState(false)
  const [logoutHovered, setLogoutHovered] = useState(false)
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  const handleLogout = async () => {
    await signOut()
  }

  const handleProfileClick = () => {
    window.location.href = "/worker/profile"
  }

  const handleKycClick = () => {
    window.location.href = "/worker/kyc"
  }

  // Load worker profile on mount
  useEffect(() => {
    async function loadWorkerProfile() {
      if (!user) {
        setIsLoadingProfile(false)
        return
      }

      setIsLoadingProfile(true)

      const { data, error } = await supabase
        .from('workers')
        .select('full_name, gender, dob, phone, address, experience_years, kyc_status')
        .eq('user_id', user.id)
        .maybeSingle()

      setIsLoadingProfile(false)

      if (error) {
        console.error('Error loading worker profile:', error)
        return
      }

      if (data) {
        setWorkerProfile(data as WorkerProfile)
      }
    }

    loadWorkerProfile()
  }, [user])

  // Check if profile is complete
  const isProfileComplete = workerProfile && (
    workerProfile.full_name &&
    workerProfile.gender &&
    workerProfile.dob &&
    workerProfile.phone &&
    workerProfile.address &&
    workerProfile.experience_years !== null
  )

  // Check if KYC is verified
  const isKycVerified = workerProfile?.kyc_status === 'verified'

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header with action buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            Dashboard Worker - Jobs
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleProfileClick}
              onMouseEnter={() => setProfileHovered(true)}
              onMouseLeave={() => setProfileHovered(false)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: profileHovered ? '#1d4ed8' : '#2563eb',
                color: 'white',
                borderRadius: '0.375rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                fontSize: '0.875rem'
              }}
            >
              Profile
            </button>
            <button
              onClick={handleKycClick}
              onMouseEnter={() => setKycHovered(true)}
              onMouseLeave={() => setKycHovered(false)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: kycHovered ? '#d97706' : '#f59e0b',
                color: 'white',
                borderRadius: '0.375rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                fontSize: '0.875rem'
              }}
            >
              KYC Verification
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoading}
              onMouseEnter={() => setLogoutHovered(true)}
              onMouseLeave={() => setLogoutHovered(false)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: isLoading ? '#9ca3af' : logoutHovered ? '#dc2626' : '#ef4444',
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
        </div>

        {/* Profile Completion Prompt */}
        {!isLoadingProfile && !isProfileComplete && (
          <div style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #3b82f6',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="10" fill="#3b82f6"/>
              <path d="M10 5V10M10 15H10.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: '#1e40af' }}>
                Profil Anda Belum Lengkap
              </p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#1e3a8a' }}>
                Lengkapi profil Anda agar dapat menerima pekerjaan.
              </p>
              <a
                href="/worker/profile"
                style={{
                  display: 'inline-block',
                  marginTop: '0.5rem',
                  padding: '0.375rem 0.75rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}
              >
                Lengkapi Profil
              </a>
            </div>
          </div>
        )}

        {/* KYC Verification Prompt */}
        {!isLoadingProfile && !isKycVerified && workerProfile && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="10" fill="#f59e0b"/>
              <path d="M10 6V10L13 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: '#92400e' }}>
                Verifikasi KYC Belum Selesai
              </p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#b45309' }}>
                {workerProfile.kyc_status === 'unverified'
                  ? 'Lengkapi verifikasi KYC agar profil Anda terverifikasi.'
                  : workerProfile.kyc_status === 'pending'
                  ? 'KYC Anda sedang dalam proses verifikasi.'
                  : 'KYC Anda ditolak. Silakan submit ulang.'}
              </p>
              {workerProfile.kyc_status !== 'pending' && (
                <a
                  href="/worker/kyc"
                  style={{
                    display: 'inline-block',
                    marginTop: '0.5rem',
                    padding: '0.375rem 0.75rem',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: 500
                  }}
                >
                  {workerProfile.kyc_status === 'unverified' ? 'Verifikasi Sekarang' : 'Submit Ulang'}
                </a>
              )}
            </div>
          </div>
        )}

        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Selamat datang di dashboard Worker!
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1rem',
            marginTop: '1rem'
          }}>
            <div style={{
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Total Jobs
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>
                0
              </p>
            </div>

            <div style={{
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Applied
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
                0
              </p>
            </div>

            <div style={{
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Booked
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                0
              </p>
            </div>

            <div style={{
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Completed
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6b7280' }}>
                0
              </p>
            </div>
          </div>

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
              Job discovery feature coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
