import { expect, test } from '@playwright/test';

// Phase 4 gate: Boards drag-to-move, full-index Search, Insights charts.
test('boards: drag an open task into Done and persist the transition', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	const title = `Board drag ${Date.now()}`;
	const quickAdd = page.getByRole('textbox', { name: 'Add a task' });
	await quickAdd.fill(title);
	await quickAdd.press('Enter');

	await page.locator("button[aria-label='Boards']").click();
	await expect(page.getByRole('heading', { name: 'Boards' })).toBeVisible();

	const card = page.locator('.task-card', { hasText: title });
	await expect(card).toBeVisible();
	const done = page.locator('section.column', { hasText: /^Done/ }).first();
	await card.dragTo(done);

	await page.reload();
	await page.locator("button[aria-label='Boards']").click();
	await expect(page.locator('section.column', { hasText: /^Done/ }).first()).toContainText(title);
	await expect(page.locator('section.column', { hasText: /^Open/ }).first()).not.toContainText(
		title
	);
});

test('search covers tasks, tags, and navigation actions', async ({ page }) => {
	page.on('dialog', (dialog) => dialog.accept('reading'));
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	// Make the "reading" tag a real entity so search can index it.
	await page.locator('aside').getByRole('button', { name: 'Add tag' }).click();

	await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');
	const input = page.getByPlaceholder('Search tasks, notes, projects…');
	await expect(input).toBeVisible();
	await input.fill('distributed');
	await expect(page.locator('[data-slot="command-group"]', { hasText: 'Tasks' })).toContainText(
		'Read distributed systems paper'
	);

	await input.fill('reading');
	await expect(page.locator('[data-slot="command-group"]', { hasText: 'Tags' })).toContainText(
		'reading'
	);
	await page
		.locator('[data-slot="command-group"]', { hasText: 'Tags' })
		.getByRole('option')
		.click();
	await expect(page.getByRole('heading', { name: /Task: reading/ })).toBeVisible();
});

test('insights charts daily focus after a recorded focus segment', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	await page.locator("button[aria-label='Focus']").click();
	await page.getByRole('button', { name: 'Start', exact: true }).click();
	await page.getByRole('button', { name: 'Pause', exact: true }).click();

	await page.locator("button[aria-label='Insights']").click();
	await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();
	await expect(page.getByRole('img', { name: /Bar chart of daily focus minutes/ })).toBeVisible();
	await expect(page.locator('.week-grid')).toBeVisible();
});
