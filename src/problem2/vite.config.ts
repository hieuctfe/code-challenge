import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Run component tests against a browser-like DOM.
    environment: 'jsdom',
    // Expose describe/it/expect/vi globally (no per-file imports needed).
    globals: true,
    // Registers jest-dom matchers and cleans up the DOM between tests.
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
