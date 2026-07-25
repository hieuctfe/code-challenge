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

afterEach(() => {
  cleanup()
})
