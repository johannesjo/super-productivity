import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'bun run dev -- --host 127.0.0.1 --port 5180 --strictPort', port: 5180, reuseExistingServer: false, timeout: 60_000 },
	use: { baseURL: 'http://127.0.0.1:5180', colorScheme: 'dark' },
	testMatch: '**/*.e2e.{ts,js}',
	testIgnore: ['**/offline.e2e.ts']
});
