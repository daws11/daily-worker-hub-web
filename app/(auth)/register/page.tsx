"use client"

import Link from "next/link"
import { useState } from "react"
import { useAuth } from "../../providers/auth-provider"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RadioGroup } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"

// Simple translation function
function t(key: string): string {
  const translations: Record<string, string> = {
    'auth.registerTitle': 'Daftar Akun',
    'auth.fullName': 'Nama Lengkap',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.accountType': 'Tipe Akun',
    'auth.worker': 'Pekerja',
    'auth.business': 'Bisnis',
    'auth.register': 'Daftar',
    'auth.registering': 'Mendaftar...',
    'auth.or': 'ATAU',
    'auth.continueWithGoogle': 'Lanjut dengan Google',
    'auth.hasAccount': 'Sudah punya akun?',
    'auth.loginHere': 'Masuk sekarang',
    'auth.emailPlaceholder': 'nama@email.com',
    'auth.passwordPlaceholder': '•••••••',
    'auth.fullNamePlaceholder': 'Budi Santoso',
  }
  return translations[key] || key
}

export default function RegisterPage() {
  const { signUp, signInWithGoogle, isLoading } = useAuth()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"worker" | "business">("worker")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await signUp(email, password, fullName, role)
  }

  const handleGoogleSignUp = async () => {
    await signInWithGoogle(role)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <Card className="border border-border">
          <CardHeader className="space-y-1 pb-4">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('auth.registerTitle')}
            </h1>
            <p className="text-sm text-muted-foreground">
              Buat akun baru untuk mulai bekerja
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                type="text"
                label={t('auth.fullName')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('auth.fullNamePlaceholder')}
                required
                autoComplete="name"
              />

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
                autoComplete="new-password"
              />

              <RadioGroup
                name="role"
                value={role}
                onValueChange={(value: string) => setRole(value as "worker" | "business")}
                options={[
                  {
                    value: "worker",
                    label: t('auth.worker'),
                    icon: (
                      <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ),
                  },
                  {
                    value: "business",
                    label: t('auth.business'),
                    icon: (
                      <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    ),
                  },
                ]}
              />

              <Button
                type="submit"
                variant="default"
                size="lg"
                isLoading={isLoading}
                fullWidth
              >
                {isLoading
                  ? t('auth.registering')
                  : t('auth.register')
                }
              </Button>
            </form>

            <Separator>{t('auth.or')}</Separator>

            <Button
              type="button"
              variant="outline"
              size="lg"
              isLoading={isLoading}
              fullWidth
              onClick={handleGoogleSignUp}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
                <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
                <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
              </svg>
              {t('auth.continueWithGoogle')}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          {t('auth.hasAccount')}{" "}
          <Link
            href="/login"
            className="text-foreground hover:underline font-medium"
          >
            {t('auth.loginHere')}
          </Link>
        </p>
      </div>
    </div>
  )
}
