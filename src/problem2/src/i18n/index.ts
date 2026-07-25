import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import viJson from './locales/vi.json'
import type { TranslationCatalog } from './locales/types'

// Compile-time guard: every locale must expose exactly the English key set.
const vi: TranslationCatalog = viJson

export const SUPPORTED_LANGUAGES = ['en', 'vi'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

/** Map an i18next language code to a BCP-47 locale for number formatting. */
export function localeFor(language: string): string {
  return language.startsWith('vi') ? 'vi-VN' : 'en-US'
}

// Resources are bundled inline (no HTTP backend) so translations resolve
// synchronously and neither the UI nor the tests need to await a load.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      // React already escapes; our values contain characters like → and " that
      // must not be HTML-escaped.
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  })

// Keep the document language attribute in sync with the active locale.
if (typeof document !== 'undefined') {
  const applyLang = (lng: string) => {
    document.documentElement.lang = lng.startsWith('vi') ? 'vi' : 'en'
  }
  applyLang(i18n.language ?? 'en')
  i18n.on('languageChanged', applyLang)
}

export default i18n
