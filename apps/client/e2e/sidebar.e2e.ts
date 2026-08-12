import { expect, test } from '@playwright/test';

// Phase 3/4 gate: sidebar real smart lists, tags, and archives navigation.
test('creates and opens a smart list, then navigates archives', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	page.on('dialog', (dialog) => dialog.accept('Focus'));
	await page.getByRole('button', { name: 'Add smart list' }).click();

	const smartList = page.locator('aside').getByRole('button', { name: /^Focus/ });
	await expect(smartList).toBeVisible();
	await smartList.click();
	await expect(page.getByRole('heading', { name: 'Focus' })).toBeVisible();

	await page.locator('aside').getByRole('button', { name: 'Archives' }).click();
	await expect(page.getByRole('heading', { name: 'Archives' })).toBeVisible();
});
