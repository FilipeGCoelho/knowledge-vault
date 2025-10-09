import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/ui/**', 'happy-dom']
    ],
    setupFiles: './tests/setup.ts',
    globals: true,
    coverage: {
      reporter: ['text', 'json', 'html']
    }
  }
});
