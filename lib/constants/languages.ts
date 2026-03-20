import type { Locale } from "../i18n/types";

export interface Language {
  value: Locale;
  label: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  {
    value: "id",
    label: "Indonesian",
    nativeName: "Bahasa Indonesia",
    flag: "🇮🇩",
  },
  {
    value: "en",
    label: "English",
    nativeName: "English",
    flag: "🇬🇧",
  },
];

export function getLanguageByValue(value: Locale): Language | undefined {
  return LANGUAGES.find((lang) => lang.value === value);
}

export function getLanguageFlag(value: Locale): string {
  return getLanguageByValue(value)?.flag || "🌐";
}

export function getLanguageNativeName(value: Locale): string {
  return getLanguageByValue(value)?.nativeName || value;
}
