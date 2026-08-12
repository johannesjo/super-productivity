import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Prefer source specs; the tsc build also emits specs into dist/ which
    // would otherwise be picked up and fail on fixture paths.
    include: ['src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
