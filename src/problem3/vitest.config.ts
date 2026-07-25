import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use `describe`/`it`/`expect` without importing when convenient, and make
    // the matching globs explicit.
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
});
