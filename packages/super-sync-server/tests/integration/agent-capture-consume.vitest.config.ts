import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Worktrees can share node_modules with another checkout. Resolve changed
// workspace contracts here so the actual HTTP parser uses this experiment.
export default defineConfig({
  resolve: {
    alias: {
      '@sp/shared-schema': resolve(__dirname, '../../../shared-schema/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/agent-capture-consume.integration.spec.ts'],
  },
});
