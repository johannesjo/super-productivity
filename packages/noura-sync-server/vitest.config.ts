import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Integration test that requires real PostgreSQL (run with vitest.integration.config.ts)
      'tests/integration/registration-races.integration.spec.ts',
      'tests/integration/clean-slate-atomicity-sql.integration.spec.ts',
      'tests/integration/snapshot-vector-clock-sql.integration.spec.ts',
      'tests/integration/conflict-detection-sql.integration.spec.ts',
      'tests/integration/repair-causality.integration.spec.ts',
      'tests/integration/two-device-sync.integration.spec.ts',
    ],
  },
});
