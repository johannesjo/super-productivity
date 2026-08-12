import { expect, test } from '@playwright/test';

// Phase 3 gate: syntax capture → persist. A single line with a due date, tag,
// and project creates a Today-visible task that survives a reload. Nested
// subtask creation is covered by unit tests (model.spec.ts + capture.spec.ts).
test('capture syntax creates a task and persists it', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	const title = `Deploy ${Date.now()}`;
	await page
		.getByRole('textbox', { name: 'Add a task' })
		.fill(`${title} @Operations #release due:today`);
	await page.getByRole('textbox', { name: 'Add a task' }).press('Enter');

	const row = page
		.locator('button[draggable="true"]')
		.filter({ visible: true })
		.filter({ hasText: title });
	await expect(row).toBeVisible();

	await page.reload();
	const persistedCheckbox = page.getByRole('checkbox', { name: `Complete ${title}` });
	await expect(persistedCheckbox).toBeVisible();
});
