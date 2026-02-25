'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { loadTranslations, getTranslation, i18nConfig, isLocaleRTL } from '../../lib/i18n/config'
import { I18nContext } from '../../lib/i18n/hooks'
import type { Locale, I18nContextValue } from '../../lib/i18n/types'
import { supabase } from '../../lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Database } from '../../lib/supabase/types'

type UsersRow = Database['public']['Tables']['users']['Row']

const STORAGE_KEY = 'user-locale-preference'

type I18nProviderProps = {
  children: React.ReactNode
  defaultLocale?: Locale
}

/**
 * Detect browser locale or return default
 */
function detectBrowserLocale(): Locale {
  if (typeof window === 'undefined') return i18nConfig.defaultLocale

  const browserLang = navigator.language.split('-')[0]
  return (browserLang === 'id' || browserLang === 'en') ? browserLang : i18nConfig.defaultLocale
}

/**
 * Load locale from localStorage
 */
function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && (stored === 'id' || stored === 'en')) {
      return stored as Locale
    }
  } catch {
    // localStorage may be disabled
  }
  return null
}

/**
 * Save locale to localStorage
 */
function saveLocale(locale: Locale) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // localStorage may be disabled
  }
}

/**
 * I18n Provider - Manages language state and translations
 *
 * This provider:
 * - Loads translations for the current locale
 * - Detects language preference from database (if logged in), cookie, localStorage, browser locale, or default
 * - Persists language changes to database (if logged in), cookie, and localStorage
 * - Provides translation function and locale controls via context
 *
 * @example
 * ```tsx
 * // In your root layout
 * import { I18nProvider } from '@/app/providers/i18n-provider'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <I18nProvider>
 *       {children}
 *     </I18nProvider>
 *   )
 * }
 *
 * // In any component
 * import { useTranslation } from '@/lib/i18n/hooks'
 *
 * function MyComponent() {
 *   const { t, locale, setLocale, isRTL } = useTranslation()
 *   return <h1>{t('common.welcome')}</h1>
 * }
 * ```
 */
export function I18nProvider({ children, defaultLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale || i18nConfig.defaultLocale)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  /**
   * Get locale from cookie (set by middleware)
   */
  function getCookieLocale(): Locale | null {
    if (typeof window === 'undefined') return null

    try {
      const match = document.cookie.match(new RegExp('(^| )user-locale=([^;]+)'))
      if (match && (match[2] === 'id' || match[2] === 'en')) {
        return match[2] as Locale
      }
    } catch {
      // Cookie access may fail
    }
    return null
  }

  /**
   * Set locale cookie
   */
  function setCookieLocale(locale: Locale) {
    if (typeof window === 'undefined') return

    try {
      const maxAge = 60 * 60 * 24 * 365 // 1 year
      document.cookie = `user-locale=${locale}; path=/; max-age=${maxAge}; SameSite=lax`
    } catch {
      // Cookie setting may fail
    }
  }

  // Get initial session and listen for auth changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load translations and detect initial locale
  useEffect(() => {
    async function initializeLocale() {
      setIsLoading(true)

      // Priority: 1) Database (if logged in), 2) Cookie (from middleware), 3) localStorage, 4) Browser locale, 5) Default
      let dbLocale: Locale | null = null

      // Fetch language preference from database if user is logged in
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('language_preference')
          .eq('id', user.id)
          .single()

        if (!error && data?.language_preference) {
          const pref = data.language_preference
          if (pref === 'id' || pref === 'en') {
            dbLocale = pref as Locale
          }
        }
      }

      const cookieLocale = getCookieLocale()
      const storedLocale = getStoredLocale()
      const browserLocale = detectBrowserLocale()

      const initialLocale = dbLocale || cookieLocale || storedLocale || browserLocale
      setLocaleState(initialLocale)

      // Sync localStorage if needed
      if ((dbLocale || cookieLocale) && (dbLocale || cookieLocale) !== storedLocale) {
        saveLocale((dbLocale || cookieLocale)!)
      }

      // Preload translations
      try {
        await loadTranslations(initialLocale)
      } catch {
        // Fallback to default locale if loading fails
        await loadTranslations(i18nConfig.defaultLocale)
        setLocaleState(i18nConfig.defaultLocale)
      }

      setIsLoaded(true)
      setIsLoading(false)
    }

    initializeLocale()
  }, [defaultLocale, user])

  // Update HTML lang and dir attributes when locale changes
  useEffect(() => {
    if (typeof window === 'undefined' || !isLoaded) return

    const html = document.documentElement
    html.setAttribute('lang', locale)
    html.setAttribute('dir', isLocaleRTL(locale) ? 'rtl' : 'ltr')
  }, [locale, isLoaded])

  /**
   * Set locale and persist to database, cookie, and localStorage
   */
  const setLocale = async (newLocale: Locale) => {
    if (newLocale === locale || isLoading) return

    setIsLoading(true)

    try {
      // Load new translations
      await loadTranslations(newLocale)

      // Update state
      setLocaleState(newLocale)
      saveLocale(newLocale)
      setCookieLocale(newLocale)

      // Persist to database if user is logged in
      if (user) {
        const { error } = await supabase
          .from('users')
          .update({ language_preference: newLocale })
          .eq('id', user.id)

        if (error) {
          // Log error but don't fail the locale change
          console.error('Failed to save language preference to database:', error)
        }
      }
    } catch {
      // Keep current locale if loading fails
      console.error(`Failed to load translations for locale: ${newLocale}`)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Get translation for a key with optional parameters
   */
  const t = (key: string, params?: Record<string, string | number>): string => {
    if (!isLoaded) {
      // Return key while loading to avoid errors
      return key
    }
    return getTranslation(locale, key, params)
  }

  const contextValue: I18nContextValue = {
    locale,
    setLocale,
    t,
    isRTL: isLocaleRTL(locale),
  }

  // Don't render children until translations are loaded
  if (!isLoaded) {
    return null
  }

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  )
}
