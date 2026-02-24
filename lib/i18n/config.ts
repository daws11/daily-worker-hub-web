import { Locale, LocaleConfig, I18nConfig, TranslationNamespace } from './types'

/**
 * Locale configurations with metadata
 */
export const localeConfigs: Record<Locale, LocaleConfig> = {
  id: {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    direction: 'ltr',
    flag: '🇮🇩',
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    flag: '🇬🇧',
  },
}

/**
 * Default i18n configuration
 */
export const i18nConfig: I18nConfig = {
  defaultLocale: 'id',
  locales: ['id', 'en'],
  fallbackLocale: 'id',
}

/**
 * Translation cache to avoid reloading the same locale
 */
const translationCache = new Map<Locale, TranslationNamespace>()

/**
 * Load translations for a specific locale from JSON files
 * @param locale - The locale code (e.g., 'id', 'en')
 * @returns Translation namespace object
 * @throws Error if locale is invalid or translation file fails to load
 */
export async function loadTranslations(locale: Locale): Promise<TranslationNamespace> {
  // Validate locale
  if (!i18nConfig.locales.includes(locale)) {
    throw new Error(`Invalid locale: ${locale}. Supported locales: ${i18nConfig.locales.join(', ')}`)
  }

  // Return cached translations if available
  if (translationCache.has(locale)) {
    return translationCache.get(locale)!
  }

  try {
    // Dynamically import the translation file
    const translations = await import(`./locales/${locale}.json`)
    translationCache.set(locale, translations.default as TranslationNamespace)
    return translations.default as TranslationNamespace
  } catch (error) {
    throw new Error(`Failed to load translations for locale '${locale}': ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get translations synchronously (requires pre-loading)
 * @param locale - The locale code
 * @returns Translation namespace object
 * @throws Error if translations haven't been loaded yet
 */
export function getTranslations(locale: Locale): TranslationNamespace {
  const cached = translationCache.get(locale)

  if (!cached) {
    throw new Error(
      `Translations for locale '${locale}' not loaded. Call loadTranslations('${locale}') first.`
    )
  }

  return cached
}

/**
 * Get a specific translation value by key
 * @param locale - The locale code
 * @param key - Dot-notation key (e.g., 'common.save', 'auth.login')
 * @param params - Optional parameters for string interpolation
 * @returns Translated string with parameters interpolated
 */
export function getTranslation(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const translations = getTranslations(locale)
  const keys = key.split('.')
  let value: unknown = translations

  // Navigate through nested keys
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k]
    } else {
      // Return the key itself if translation not found
      console.warn(`Translation key not found: ${key}`)
      return key
    }
  }

  // Ensure the final value is a string
  if (typeof value !== 'string') {
    console.warn(`Translation value is not a string: ${key}`)
    return key
  }

  // Interpolate parameters if provided
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey]?.toString() ?? match
    })
  }

  return value
}

/**
 * Get locale configuration by code
 * @param locale - The locale code
 * @returns Locale configuration object
 */
export function getLocaleConfig(locale: Locale): LocaleConfig {
  const config = localeConfigs[locale]

  if (!config) {
    throw new Error(`Locale config not found for: ${locale}`)
  }

  return config
}

/**
 * Check if a locale is RTL (right-to-left)
 * @param locale - The locale code
 * @returns True if the locale uses RTL direction
 */
export function isLocaleRTL(locale: Locale): boolean {
  const config = getLocaleConfig(locale)
  return config.direction === 'rtl'
}

/**
 * Get all available locales
 * @returns Array of locale codes
 */
export function getAvailableLocales(): Locale[] {
  return [...i18nConfig.locales]
}
