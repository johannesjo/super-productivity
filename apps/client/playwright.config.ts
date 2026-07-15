import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'bun run dev -- --host 127.0.0.1', port: 5173, reuseExistingServer: true },
	use: { baseURL: 'http://127.0.0.1:5173', colorScheme: 'dark' },
	testMatch: '**/*.e2e.{ts,js}'
});
