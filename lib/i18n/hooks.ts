'use client'

import { createContext, useContext } from 'react'
import type { I18nContextValue } from './types'

/**
 * I18n Context for managing translations across the app
 * This context is provided by I18nProvider component
 */
export const I18nContext = createContext<I18nContextValue | undefined>(undefined)

/**
 * Hook to access translations and locale management
 * Must be used within an I18nProvider
 *
 * @returns Translation functions and locale state
 * @throws Error if used outside of I18nProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { t, locale, setLocale, isRTL } = useTranslation()
 *
 *   return (
 *     <div>
 *       <h1>{t('common.welcome')}</h1>
 *       <p>{t('common.greeting', { name: 'John' })}</p>
 *       <button onClick={() => setLocale('en')}>English</button>
 *       <button onClick={() => setLocale('id')}>Indonesian</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext)

  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }

  return context
}

/**
 * Safe hook to access translations with graceful fallback
 * Returns a safe translation function even if used outside I18nProvider
 * Useful for non-component utilities or edge cases
 *
 * @returns Safe translation function that returns the key if context is unavailable
 *
 * @example
 * ```tsx
 * function MyUtility() {
 *   const { t } = useTranslationSafe()
 *   // Will return the key itself if used outside I18nProvider
 *   const message = t('some.key') // Returns 'some.key' if no context
 * }
 * ```
 */
export function useTranslationSafe(): {
  t: (key: string, params?: Record<string, string | number>) => string
} {
  try {
    const context = useContext(I18nContext)

    if (context === undefined) {
      // Return a safe fallback that returns the key itself
      return {
        t: (key: string) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[i18n] useTranslationSafe: No I18nContext available, returning key: ${key}`)
          }
          return key
        },
      }
    }

    return { t: context.t }
  } catch {
    // Handle any errors gracefully
    return {
      t: (key: string) => key,
    }
  }
}
