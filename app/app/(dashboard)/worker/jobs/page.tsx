"use client"

import { useState } from "react"

export default function WorkerJobsPage() {
  const [profileHovered, setProfileHovered] = useState(false)
  const [kycHovered, setKycHovered] = useState(false)

  const handleProfileClick = () => {
    window.location.href = "/worker/profile"
  }

  const handleKycClick = () => {
    window.location.href = "/worker/kyc"
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
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
                backgroundColor: kycHovered ? '#f59e0b' : '#fbbf24',
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
          </div>
        </div>
        
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
