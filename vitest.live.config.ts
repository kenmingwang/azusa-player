import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/live-regression.live.test.ts'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      enabled: false,
    },
  },
});
