export type Locale = 'id' | 'en'

export type LocaleDirection = 'ltr' | 'rtl'

export interface LocaleConfig {
  code: Locale
  name: string
  nativeName: string
  direction: LocaleDirection
  flag: string
}

export interface TranslationNamespace {
  [key: string]: string | TranslationNamespace
}

export interface Translations {
  common: TranslationNamespace
  auth: TranslationNamespace
  navigation: TranslationNamespace
  jobs: TranslationNamespace
  bookings: TranslationNamespace
  attendance: TranslationNamespace
  wallet: TranslationNamespace
  profile: TranslationNamespace
  validation: TranslationNamespace
  errors: TranslationNamespace
}

export interface I18nConfig {
  defaultLocale: Locale
  locales: Locale[]
  fallbackLocale: Locale
}

export type TranslationKey = keyof Translations | string

export interface UseTranslationReturn {
  t: (key: string, params?: Record<string, string | number>) => string
  locale: Locale
  setLocale: (locale: Locale) => void
  isRTL: boolean
}

export interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
  isRTL: boolean
}
