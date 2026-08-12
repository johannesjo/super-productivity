import { expect, test } from '@playwright/test';

// Phase 4 gate: visual baseline screenshots for the DESIGN.md surfaces. Each
// capture is written to tests/visual/ and referenced by DESIGN.md so layout and
// density regressions are reviewable in CI diffs. Run: bunx playwright test
// e2e/baselines.e2e.ts --config=<preview-or-dev config> (dev server is enough).

const shot = (name: string) => `tests/visual/${name}.png`;

test('captures the task list / Today surface', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
	// Select a seeded task so the inspector baseline includes content.
	await page.locator('button[draggable="true"]').filter({ visible: true }).first().click();
	await page.waitForTimeout(250);
	await page.screenshot({ path: shot('today-task-list') });
});

test('captures each planner view surface', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
	for (const [label, name] of [
		['Planner', 'planner-week'],
		['Schedule', 'schedule'],
		['Boards', 'boards'],
		['Eisenhower', 'eisenhower'],
		['Notes', 'notes'],
		['History', 'history'],
		['Insights', 'insights'],
		['Focus', 'focus']
	] as const) {
		await page.locator(`button[aria-label='${label}']`).click();
		await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
		await page.waitForTimeout(150);
		await page.screenshot({ path: shot(name) });
	}
});

test('captures the command palette and settings dialog', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');
	await expect(page.getByRole('dialog', { name: 'Search Noura' })).toBeVisible();
	await page.screenshot({ path: shot('command-palette') });
	await page.keyboard.press('Escape');

	await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,');
	await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
	await page.screenshot({ path: shot('settings-appearance') });
});
