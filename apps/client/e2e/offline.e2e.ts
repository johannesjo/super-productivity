import { expect, test } from '@playwright/test';

// Phase 8 gate: PWA offline. Runs against the production static build served by
// `vite preview` (service worker active + caching the shell), then reloads with
// the network fully offline and asserts the app + persisted task still render.
test('app shell and persisted data render fully offline', async ({ page, context }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	// Service worker: first load registers it; a reload makes it the controller
	// and the install handler has populated the asset cache by then.
	await page.waitForFunction(
		() => typeof navigator !== 'undefined' && 'serviceWorker' in navigator
	);
	await page.waitForTimeout(1500);
	await page.reload();
	await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
		timeout: 20_000
	});

	const title = `Offline proof ${Date.now()}`;
	const quickAdd = page.getByRole('textbox', { name: 'Add a task' });
	await quickAdd.fill(title);
	await quickAdd.press('Enter');
	await page.reload();
	await expect(
		page.locator('button[draggable="true"]').filter({ visible: true }).filter({ hasText: title })
	).toBeVisible();

	// Go fully offline and reload from the service worker + local storage.
	await context.setOffline(true);
	await page.reload();
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
	await expect(
		page.locator('button[draggable="true"]').filter({ visible: true }).filter({ hasText: title })
	).toBeVisible();

	await context.setOffline(false);
});
