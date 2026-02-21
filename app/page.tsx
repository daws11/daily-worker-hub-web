"use client"

import { useState } from "react"

export default function HomePage() {
  const [loginHovered, setLoginHovered] = useState(false)
  const [registerHovered, setRegisterHovered] = useState(false)

  const handleLoginClick = () => {
    window.location.href = "/login"
  }

  const handleRegisterClick = () => {
    window.location.href = "/register"
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#18181b',
      color: 'white',
      padding: '1rem'
    }}>
      <div style={{
        maxWidth: '28rem',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold' }}>Daily Worker Hub</h1>
          <p style={{ marginTop: '0.5rem', color: '#a1a1aa' }}>
            Platform Harian Lepas Pekerja & Pelaku Usaha
          </p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            onClick={handleLoginClick}
            onMouseEnter={() => setLoginHovered(true)}
            onMouseLeave={() => setLoginHovered(false)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'center',
              padding: '0.75rem 1rem',
              backgroundColor: loginHovered ? '#1d4ed8' : '#2563eb',
              color: 'white',
              borderRadius: '0.5rem',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'background-color 0.2s'
            }}
          >
            Masuk (Login)
          </button>
          <button
            onClick={handleRegisterClick}
            onMouseEnter={() => setRegisterHovered(true)}
            onMouseLeave={() => setRegisterHovered(false)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'center',
              padding: '0.75rem 1rem',
              backgroundColor: registerHovered ? '#3f3f46' : '#27272a',
              color: 'white',
              borderRadius: '0.5rem',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'background-color 0.2s'
            }}
          >
            Daftar (Register)
          </button>
        </div>
        
        <div style={{
          backgroundColor: '#27272a',
          borderRadius: '0.5rem',
          padding: '1rem',
          fontSize: '0.875rem',
          color: '#a1a1aa'
        }}>
          <p style={{ fontWeight: 500, color: 'white', marginBottom: '0.5rem' }}>Status Project:</p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', listStyle: 'none', padding: 0, margin: 0 }}>
            <li>✅ Phase 1: Setup & Infrastructure</li>
            <li>✅ Phase 2: shadcn/ui & Authentication</li>
            <li>⏳ Phase 3: Business Portal</li>
            <li>⏳ Phase 4: Worker Portal</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
