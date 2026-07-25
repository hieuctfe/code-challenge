import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n'

const LABELS: Record<SupportedLanguage, string> = {
  en: 'EN',
  vi: 'VI',
}

/**
 * A compact segmented control that switches the active language. The choice is
 * persisted to localStorage automatically by i18next's LanguageDetector
 * (`caches: ['localStorage']`).
 */
export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  // Normalize e.g. 'en-US' -> 'en' so the active pill highlights correctly.
  const active = (i18n.language?.split('-')[0] ?? 'en') as SupportedLanguage

  return (
    <div
      role="group"
      aria-label="Language"
      className="flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] p-0.5 text-[11px] font-semibold"
    >
      {SUPPORTED_LANGUAGES.map((lng) => {
        const isActive = lng === active
        return (
          <button
            key={lng}
            type="button"
            onClick={() => i18n.changeLanguage(lng)}
            aria-pressed={isActive}
            className={`rounded-full px-2 py-0.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
              ${isActive ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {LABELS[lng]}
          </button>
        )
      })}
    </div>
  )
}
