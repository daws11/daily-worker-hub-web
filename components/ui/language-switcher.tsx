"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "@/lib/i18n/hooks"
import { LANGUAGES } from "@/lib/constants/languages"

/**
 * LanguageSwitcher Component
 *
 * A dropdown component that allows users to switch between available languages.
 * Displays the current language with a flag indicator and provides a dropdown
 * to select from all available languages.
 *
 * Uses Radix UI's Select component for accessibility and keyboard navigation.
 *
 * @example
 * ```tsx
 * import { LanguageSwitcher } from '@/components/ui/language-switcher'
 *
 * function Header() {
 *   return (
 *     <header>
 *       <LanguageSwitcher />
 *     </header>
 *   )
 * }
 * ```
 */
export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation()

  const currentLanguage = LANGUAGES.find(lang => lang.value === locale)

  const handleValueChange = (value: string) => {
    setLocale(value as typeof locale)
  }

  return (
    <Select value={locale} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[140px]" aria-label="Select language">
        <SelectValue>
          <span className="flex items-center gap-2">
            <span className="text-lg" role="img" aria-label={currentLanguage?.label}>
              {currentLanguage?.flag}
            </span>
            <span className="hidden sm:inline">{currentLanguage?.nativeName}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((language) => (
          <SelectItem key={language.value} value={language.value}>
            <span className="flex items-center gap-2">
              <span className="text-lg" role="img" aria-label={language.label}>
                {language.flag}
              </span>
              <span>{language.nativeName}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
