import 'react-i18next'
import type { TranslationCatalog } from './locales/types'

// Give `t()` compile-time key checking against the English catalog.
declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: TranslationCatalog
    }
  }
}
