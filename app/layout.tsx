import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from './providers/auth-provider'
import { I18nProvider } from './providers/i18n-provider'
import { Toaster } from '../components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Daily Worker Hub',
  description: 'Platform Harian Lepas Pekerja & Pelaku Usaha',
}

/**
 * Get locale from cookie or return default
 */
async function getLocale(): Promise<string> {
  const cookieStore = await cookies()
  const locale = cookieStore.get('user-locale')?.value
  // Validate locale - only 'id' or 'en' are supported
  return locale === 'id' || locale === 'en' ? locale : 'id'
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()

  return (
    <html lang={locale} dir="ltr">
      <body className={inter.className}>
        <I18nProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </I18nProvider>
        <Toaster />
      </body>
    </html>
  )
}
