"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../providers/auth-provider"
import { useTranslation } from "@/lib/i18n/hooks"

export default function RegisterPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { signUp, isLoading } = useAuth()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"worker" | "business">("worker")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await signUp(email, password, fullName, role)
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
          {t('auth.registerTitle')}
        </h1>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              {t('auth.fullName')}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                outline: 'none'
              }}
              placeholder={t('auth.fullNamePlaceholder')}
              required
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              {t('auth.email')}
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
              placeholder={t('auth.emailPlaceholder')}
              required
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              {t('auth.password')}
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
              placeholder={t('auth.passwordPlaceholder')}
              required
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              {t('auth.accountType')}
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
                <span>{t('auth.worker')}</span>
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
                <span>{t('auth.business')}</span>
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
            {isLoading ? t('auth.registering') : t('auth.register')}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>
          {t('auth.hasAccount')}{' '}
          <a href="/login" style={{ color: '#2563eb', textDecoration: 'none' }}>
            {t('auth.loginHere')}
          </a>
        </p>
      </div>
    </div>
  )
}
