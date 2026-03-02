"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "../../providers/auth-provider"
import { Card, CardHeader, CardContent } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { RadioGroup } from "../../components/ui/radio-group"
import { Separator } from "../../components/ui/separator"

// Simple translation function (placeholder for now)
function t(key: string, fallback?: string): string {
  const translations: Record<string, string> = {
    'auth.loginTitle': 'Masuk',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.accountType': 'Tipe Akun',
    'auth.worker': 'Pekerja',
    'auth.business': 'Bisnis',
    'auth.login': 'Masuk',
    'auth.loggingIn': 'Masuk...',
    'auth.noAccount': 'Belum punya akun?',
    'auth.registerHere': 'Daftar sekarang',
    'auth.emailPlaceholder': 'nama@email.com',
    'auth.passwordPlaceholder': '•••••••',
    'auth.forgotPassword': 'Lupa password?',
  }
  return translations[key] || fallback || key
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, isLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"worker" | "business">("worker")

  // Read role from query parameter if present (e.g., from registration redirect)
  useEffect(() => {
    const roleParam = searchParams.get('role')
    if (roleParam === 'worker' || roleParam === 'business') {
      setRole(roleParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await signIn(email, password, role)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-4">
      <div className="w-full max-w-md">
        <Card className="space-y-6">
          <CardHeader className="pb-4">
            <h1 className="text-3xl font-bold text-slate-900">
              {t('auth.loginTitle')}
            </h1>
            <p className="text-sm text-slate-600 mt-2">
              Masuk kembali ke akun Anda
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                type="email"
                label={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                required
                autoComplete="email"
              />

              <Input
                type="password"
                label={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                required
                autoComplete="current-password"
              />

              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>

              <RadioGroup
                name="role"
                value={role}
                onChange={setRole}
                options={[
                  {
                    value: "worker",
                    label: t('auth.worker'),
                    icon: (
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ),
                  },
                  {
                    value: "business",
                    label: t('auth.business'),
                    icon: (
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    ),
                  },
                ]}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                fullWidth
                className="mt-6"
              >
                {isLoading
                  ? t('auth.loggingIn')
                  : t('auth.login')
                }
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-slate-600">
          {t('auth.noAccount')}{" "}
          <Link
            href="/register"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('auth.registerHere')}
          </Link>
        </div>
      </div>
    </div>
  )
}
