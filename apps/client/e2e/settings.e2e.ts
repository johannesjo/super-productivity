import { expect, test } from '@playwright/test';

// Phase 6 gate: settings persist to GlobalConfig and theme mode applies to the
// document (light/dark), surviving a reload.
test('switches light theme and persists it across reload', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,');
	await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
	await page.getByRole('button', { name: 'Appearance' }).click();

	const trigger = page.locator('[data-slot="select-trigger"]', { hasText: 'dark' }).first();
	await trigger.click();
	await page.getByRole('option', { name: 'Light' }).click();

	await expect
		.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
		.toBe(false);

	await page.reload();
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
	const darkAfterReload = await page.evaluate(() =>
		document.documentElement.classList.contains('dark')
	);
	expect(darkAfterReload).toBe(false);

	// Restore the dark theme so the persisted default stays consistent.
	await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,');
	await page.getByRole('button', { name: 'Appearance' }).click();
	const trigger2 = page.locator('[data-slot="select-trigger"]', { hasText: 'light' }).first();
	await trigger2.click();
	await page.getByRole('option', { name: 'Dark' }).click();
	await expect
		.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
		.toBe(true);
});
