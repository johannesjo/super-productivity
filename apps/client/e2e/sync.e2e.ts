import { expect, test } from '@playwright/test';

// Phase 9 gate: sync status rail widget reflects a routed NouraSync connect
// (HTTP contract served by Playwright), then a disconnect.
test('sync rail widget moves offline -> connecting -> connected -> offline', async ({ page }) => {
	await page.route('**/api/sync/ops*', (route) =>
		route.fulfill({ status: 200, json: { ops: [], latestSeq: 0, hasMore: false } })
	);

	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
	const pill = page.locator('.sync-indicator');
	await expect(pill).toHaveAttribute('aria-label', 'Sync: offline');

	await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,');
	await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
	await page.getByRole('button', { name: 'Account & sync' }).click();

	await page.getByLabel('NouraSync server').fill('http://127.0.0.1:5984');
	await page.getByLabel('Access token').fill('test-token');
	await page.getByLabel('Encryption password').fill('correct-horse-battery');
	await page.getByRole('button', { name: 'Connect NouraSync' }).click();

	await expect(pill).toHaveAttribute('aria-label', 'Sync: connected', { timeout: 15_000 });

	await page.getByRole('button', { name: 'Disconnect' }).click();
	await expect(pill).toHaveAttribute('aria-label', 'Sync: offline');
});
