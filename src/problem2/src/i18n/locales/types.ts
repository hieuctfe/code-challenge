import en from './en.json'

/**
 * The catalog shape, derived from the English JSON (JSON imports are typed with
 * `string` leaves). This powers `t()`'s compile-time key checking via the
 * react-i18next module augmentation, and other locales are checked against it.
 */
export type TranslationCatalog = typeof en
