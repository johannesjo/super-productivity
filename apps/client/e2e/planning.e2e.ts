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

// Phase 4 gate: Planner week view, drag an unscheduled task onto a day column.
test('planner: drop an unscheduled task onto a week day and persist it', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	const title = `Meeting ${Date.now()}`;
	// Add from Upcoming so the task has no due day.
	await page.locator('aside').getByRole('button', { name: 'Upcoming' }).click();
	await expect(page.getByRole('heading', { name: 'Upcoming' })).toBeVisible();
	const quickAdd = page.getByRole('textbox', { name: 'Add a task' });
	await quickAdd.fill(title);
	await quickAdd.press('Enter');

	await page.locator("button[aria-label='Planner']").click();
	await expect(page.getByRole('heading', { name: 'Planner' })).toBeVisible();
	const card = page.locator('.unscheduled-card', { hasText: title });
	await expect(card).toBeVisible();
	await card.dragTo(page.locator('.week-day').first());

	await page.reload();
	await page.locator("button[aria-label='Planner']").click();
	await expect(page.locator('.week-day').first()).toContainText(title);
});

// Phase 4 gate: project/tag management dialog (rename + delete).
test('organizes projects: rename then delete from the projects & tags dialog', async ({ page }) => {
	// A single handler accepts the delete confirm (multiple handlers make Playwright dismiss instead).
	page.on('dialog', (dialog) => dialog.accept());
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	await page.locator('aside').getByRole('button', { name: 'Projects & tags' }).click();
	const dialog = page.getByRole('dialog', { name: 'Projects & tags' });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByLabel('Rename project Study')).toBeVisible();

	await dialog.getByLabel('Rename project Study').fill('Learning');
	await dialog.getByLabel('Rename project Study').press('Enter');
	await expect(dialog.getByLabel('Rename project Learning')).toBeVisible();
	await dialog.getByLabel('Delete project Learning').click();
	await expect(dialog.locator('.org-row', { hasText: 'Learning' })).toHaveCount(0);
});

// Phase 4 gate: Schedule/TickTick planning pane — plan an inbox task Today.
test('schedule: move an inbox task to Today via quick plan and persist it', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	const title = `Triaged ${Date.now()}`;
	// Add from Upcoming so the task is unscheduled (lands in the planning inbox).
	await page.locator('aside').getByRole('button', { name: 'Upcoming' }).click();
	const quickAdd = page.getByRole('textbox', { name: 'Add a task' });
	await quickAdd.fill(title);
	await quickAdd.press('Enter');

	await page.locator("button[aria-label='Schedule']").click();
	await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
	const inboxCard = page.locator('.inbox-card', { hasText: title });
	await expect(inboxCard).toBeVisible();
	await inboxCard.getByRole('button', { name: 'Today' }).click();
	await expect(page.locator('.today-panel')).toContainText(title);
	// Let the async IndexedDB write settle before reloading.
	await page.waitForTimeout(400);

	await page.reload();
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
	// The task is due today, so it must survive reload in the durable store.
	await expect(
		page.locator('button[draggable="true"]').filter({ visible: true }).filter({ hasText: title })
	).toBeVisible();
});

// Phase 7 gate: calendar feed -> iCal parse -> Planner agenda.
test('planner: load a calendar feed and show its events in the agenda', async ({ page }) => {
	const now = new Date();
	const monday = new Date(
		Date.UTC(
			now.getUTCFullYear(),
			now.getUTCMonth(),
			now.getUTCDate() - ((now.getUTCDay() + 6) % 7)
		)
	);
	const dt = monday.toISOString().slice(0, 10).replace(/-/g, '');
	const ics = [
		'BEGIN:VCALENDAR',
		'BEGIN:VEVENT',
		'UID:evt-1',
		'SUMMARY:Architecture review',
		'DTSTART:' + dt + 'T150000Z',
		'DTEND:' + dt + 'T160000Z',
		'END:VEVENT',
		'END:VCALENDAR'
	].join('\r\n');

	await page.route('**/calendar.ics', (route) =>
		route.fulfill({ status: 200, contentType: 'text/calendar', body: ics })
	);
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
	await page.locator("button[aria-label='Planner']").click();

	page.on('dialog', (dialog) => dialog.accept('https://example.test/calendar.ics'));
	await page.getByRole('button', { name: /Load calendar/ }).click();

	await expect(page.locator('.agenda-list')).toContainText('Architecture review');
});
