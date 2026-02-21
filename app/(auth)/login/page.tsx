"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../providers/auth-provider"

export default function LoginPage() {
  const router = useRouter()
  const { signIn, isLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"worker" | "business">("worker")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await signIn(email, password, role)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6',
      padding: '1rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '28rem',
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        padding: '2rem'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '1.5rem' }}>
          Masuk ke Akun
        </h1>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                outline: 'none'
              }}
              placeholder="email@contoh.com"
              required
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                outline: 'none'
              }}
              placeholder="••••••"
              required
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              Tipe Akun
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="role"
                  value="worker"
                  checked={role === "worker"}
                  onChange={(e) => setRole(e.target.value as "worker" | "business")}
                  style={{ cursor: 'pointer' }}
                />
                <span>Worker</span>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="role"
                  value="business"
                  checked={role === "business"}
                  onChange={(e) => setRole(e.target.value as "worker" | "business")}
                  style={{ cursor: 'pointer' }}
                />
                <span>Business</span>
              </label>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.5rem 1rem',
              backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
              color: 'white',
              borderRadius: '0.375rem',
              fontWeight: 500,
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>
          Belum punya akun?{' '}
          <a href="/register" style={{ color: '#2563eb', textDecoration: 'none' }}>
            Daftar disini
          </a>
        </p>
      </div>
    </div>
  )
}
