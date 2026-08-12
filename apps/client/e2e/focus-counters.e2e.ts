import { expect, test } from '@playwright/test';

// Phase 5 gate: simple-counter config in Focus view — create, tick, persist.
test('adds a counter, ticks it, and persists the value', async ({ page }) => {
	page.on('dialog', (dialog) => dialog.accept('Pomodoros'));
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	await page.locator("button[aria-label='Focus']").click();
	await expect(page.getByRole('heading', { name: 'Focus', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Add counter' }).click();

	const counter = page.locator('.counter-row', { hasText: 'Pomodoros' });
	await expect(counter).toBeVisible();
	await expect(counter.locator('.counter-value')).toHaveText('0');
	await counter.getByRole('button', { name: 'Tick Pomodoros' }).click();
	await expect(counter.locator('.counter-value')).toHaveText('1');
	// Let the async IndexedDB write settle before reloading.
	await page.waitForTimeout(400);

	await page.reload();
	await page.locator("button[aria-label='Focus']").click();
	const persisted = page.locator('.counter-row', { hasText: 'Pomodoros' });
	await expect(persisted).toBeVisible();
	await expect(persisted.locator('.counter-value')).toHaveText('1');
});

// Phase 5 gate: idle-split closes the running segment and opens a continuation.
test('splits an active focus segment into two tracked entries', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	await page.locator("button[aria-label='Focus']").click();
	await page.getByRole('button', { name: 'Start', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();

	await page.getByRole('button', { name: 'Focus options' }).first().click();
	await page.getByRole('menuitem', { name: 'Split idle segment' }).click();

	await expect(page.locator('.focus-records > div')).toHaveCount(2);
	await page.getByRole('button', { name: 'Pause', exact: true }).click();
});
