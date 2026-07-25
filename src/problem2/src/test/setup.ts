/**
 * Global test setup, loaded once before the test suite runs (see
 * `test.setupFiles` in vite.config.ts).
 *
 * - Registers the `@testing-library/jest-dom` custom matchers
 *   (`toBeInTheDocument`, `toBeDisabled`, ...).
 * - Unmounts React trees and clears the DOM after every test so cases stay
 *   isolated from one another.
 */
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
// Initialize i18n once so `t()` resolves to real strings (default 'en') in
// every test without any per-file setup.
import i18n from '../i18n'

afterEach(() => {
  cleanup()
  // Reset to the default locale so a test that switches language can't leak
  // into the next one via the shared i18next singleton / localStorage cache.
  if (i18n.language !== 'en') {
    i18n.changeLanguage('en')
  }
})
