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

// Phase 6 gate: language selector persists and the shell translates to German.
test('switches language to German and persists accross reload', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,');
	await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
	await page.getByRole('button', { name: 'Appearance' }).click();

	const trigger = page.locator('[data-slot="select-trigger"]', { hasText: 'en' }).first();
	await trigger.click();
	await page.getByRole('option', { name: 'Deutsch' }).click();
	await page.keyboard.press('Escape');

	await expect(page.getByRole('heading', { name: 'Heute' })).toBeVisible();
	await page.locator("button[aria-label='Aufgaben']").click();
	await expect(page.getByRole('heading', { name: 'Heute' })).toBeVisible();

	await page.reload();
	await expect(page.getByRole('heading', { name: 'Heute' })).toBeVisible();

	// Restore English so seed expectations stay stable. Settings nav is not
	// translated, so the section keeps its English label.
	await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,');
	await page.getByRole('button', { name: 'Appearance' }).click();
	const deTrigger = page.locator('[data-slot="select-trigger"]', { hasText: 'de' }).first();
	await deTrigger.click();
	await page.getByRole('option', { name: 'English' }).click();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});

// Phase 6 gate: welcome (onboarding) tour from Settings completes and persists.
test('runs the welcome tour and marks onboarding complete', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,');
	await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
	const startTour = page.getByRole('button', { name: 'Start tour' });
	await startTour.scrollIntoViewIfNeeded();
	await startTour.click();

	const tour = page.getByRole('dialog', { name: 'Welcome to Noura' });
	await expect(tour).toBeVisible();
	for (let index = 0; index < 5; index += 1) {
		const next = tour.getByRole('button', { name: 'Next' });
		if ((await next.count()) === 0) break;
		await next.click();
	}
	await tour.getByRole('button', { name: 'Get started' }).click();
	await expect(tour).toBeHidden();
	await page.keyboard.press('Escape');

	// The completed flag persists across reload.
	await page.reload();
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
	await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,');
	await expect(
		page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: 'Completed' })
	).toBeVisible();
});

// Phase 6 gate: Smart lists and About settings sections.
test('smart-list and about settings sections render and interact', async ({ page }) => {
	page.on('dialog', (dialog) => dialog.accept('Deep work'));
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	await page
		.locator('aside[aria-label="Task navigation"]')
		.getByRole('button', { name: 'Add smart list' })
		.click();

	await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,');
	const settings = page.getByRole('dialog', { name: 'Settings' });
	await settings.getByRole('button', { name: 'Smart lists' }).click();
	await expect(settings.getByRole('heading', { name: 'Smart lists' })).toBeVisible();
	const row = settings.locator('.smartlist-row', { hasText: 'Deep work' });
	await expect(row).toBeVisible();
	await row.getByRole('button', { name: 'Delete smart list Deep work' }).click();
	await expect(settings.locator('.smartlist-row', { hasText: 'Deep work' })).toHaveCount(0);

	await settings.getByRole('button', { name: 'About' }).click();
	await expect(settings.getByRole('heading', { name: 'About' })).toBeVisible();
	await expect(settings.getByText(/Noura 0.1.0/)).toBeVisible();
	await expect(settings.getByText(/MIT License/)).toBeVisible();
});
