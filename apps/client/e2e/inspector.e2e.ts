import { expect, test } from '@playwright/test';

// Phase 3 gate: inspector completeness — engine-backed repeat editor, Markdown
// preview, per-task tracking; repeat config persists across reload.
test('edits a task: repeat via engine, markdown preview, per-task tracking', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	// The seeded "Plan the week" task is due today and its row opens the inspector.
	const row = page
		.locator('button[draggable="true"]')
		.filter({ visible: true })
		.filter({ hasText: 'Plan the week' });
	await row.click();
	await expect(page.getByLabel('Task details')).toBeVisible();

	// Repeat editor: set interval, pick a weekday, apply (engine-backed).
	await page.getByRole('spinbutton', { name: 'Repeat interval' }).fill('2');
	await page.getByRole('button', { name: 'Repeat on M' }).click();
	await page.getByRole('button', { name: 'Apply', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeVisible();
	const preview = page.locator('.repeat-preview span');
	await expect(preview).toContainText('20');

	// Markdown preview mode renders escaped notes.
	await page.getByRole('button', { name: 'Preview', exact: true }).click();
	const markdown = page.locator('.markdown');
	await expect(markdown).toBeVisible();
	await expect(markdown).toContainText('Review');

	// Per-task tracking control toggles and attributes time.
	const track = page.getByRole('button', { name: 'Track Plan the week' });
	await track.click();
	await expect(page.getByRole('button', { name: 'Stop tracking Plan the week' })).toBeVisible();
	await page.getByRole('button', { name: 'Stop tracking Plan the week' }).click();

	// Repeat links persist across reload.
	await page.reload();
	const reloadedRow = page
		.locator('button[draggable="true"]')
		.filter({ visible: true })
		.filter({ hasText: 'Plan the week' });
	await reloadedRow.click();
	await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeVisible();
});
