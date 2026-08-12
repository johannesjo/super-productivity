import { expect, test } from '@playwright/test';

// Phase 4 gate: Eisenhower matrix and History/timesheet views.
test('buckets a prioritized due task into the Eisenhower Do-first quadrant', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	const title = `Deploy matrix ${Date.now()}`;
	const quickAdd = page.getByRole('textbox', { name: 'Add a task' });
	await quickAdd.fill(`${title} p2 due:today`);
	await quickAdd.press('Enter');

	await page.locator("button[aria-label='Eisenhower']").click();
	await expect(page.getByRole('heading', { name: 'Eisenhower' })).toBeVisible();
	const doFirst = page.locator('section.quadrant', { hasText: 'Do first' });
	await expect(doFirst).toContainText(title);
});

test('history shows completed work, a chart, and an exportable timesheet', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	const title = `Report ${Date.now()}`;
	const quickAdd = page.getByRole('textbox', { name: 'Add a task' });
	await quickAdd.fill(title);
	await quickAdd.press('Enter');

	const complete = page
		.locator('button[draggable="true"]')
		.filter({ visible: true })
		.filter({ hasText: title })
		.getByRole('checkbox');
	await complete.click();

	await page.locator("button[aria-label='History']").click();
	await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
	const completed = page.locator('section.panel', { hasText: 'Completed tasks' });
	await expect(completed).toContainText(title);
	await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
	await expect(page.getByRole('img', { name: /Bar chart/ })).toBeVisible();
});

// Phase 4 gate: Notes view — create, Markdown preview, persist across reload.
test('notes: create a note, preview markdown, and persist it', async ({ page }) => {
	page.on('dialog', (dialog) => dialog.accept('Trip plan'));
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	await page.locator("button[aria-label='Notes']").click();
	await expect(page.getByRole('heading', { name: 'Notes' })).toBeVisible();
	await page.getByRole('button', { name: 'New note' }).click();
	const noteListButton = page.locator('.notes-list button', { hasText: 'Trip plan' });
	await expect(noteListButton).toBeVisible();

	await page.locator('.note-textarea').fill('# Trip plan\n\n**bold** here');
	await page.getByRole('button', { name: 'Preview', exact: true }).click();
	const markdown = page.locator('.markdown');
	await expect(markdown).toContainText('Trip plan');
	await expect(markdown).toContainText('bold');

	await page.reload();
	await page.locator("button[aria-label='Notes']").click();
	await expect(page.locator('.notes-list button', { hasText: 'Trip plan' })).toBeVisible();
});
