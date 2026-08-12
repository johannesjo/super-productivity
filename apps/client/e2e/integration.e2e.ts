import { expect, test } from '@playwright/test';

// Phase 7 gate: Jira connection test + backlog import against an intercepted
// mock Jira server, producing linked tasks in the active project.
test('tests a Jira connection and imports its backlog', async ({ page }) => {
	await page.route('**/rest/api/2/**', (route) => {
		const url = route.request().url();
		if (url.includes('/serverInfo'))
			return route.fulfill({ status: 200, json: { id: 'mock', version: '1000' } });
		if (url.includes('/search'))
			return route.fulfill({
				status: 200,
				json: {
					issues: [
						{
							id: '10001',
							key: 'SP-1',
							fields: {
								summary: 'Ship release',
								description: {
									type: 'doc',
									content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Go live' }] }]
								},
								status: { name: 'To Do' },
								priority: { name: 'High' }
							}
						}
					]
				}
			});
		return route.continue();
	});

	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,');
	await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
	await page.getByRole('button', { name: 'Integrations' }).click();
	await page
		.getByRole('button', { name: /^Configure$/ })
		.first()
		.click();

	const dialog = page.getByRole('dialog', { name: 'Configure Jira' });
	await dialog
		.getByRole('textbox', { name: 'Server or workspace URL' })
		.fill('https://jira.example.test');
	await dialog.getByRole('textbox', { name: 'Access token' }).fill('test-token');

	await dialog.getByRole('button', { name: 'Test connection' }).click();
	await expect(dialog.getByText(/Connection verified/)).toBeVisible();

	await dialog.getByRole('button', { name: 'Import backlog' }).click();
	await expect(dialog.getByText(/Imported 1 open issues/)).toBeVisible();
	await expect(dialog).toBeHidden();
	// Close the parent Settings dialog so the shell is interactive again.
	await page.keyboard.press('Escape');

	// The imported task lands in the active project (Inbox).
	await page
		.locator('aside[aria-label="Task navigation"]')
		.getByRole('button', { name: /^Inbox/ })
		.click();
	await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
	await expect(
		page.locator('button[draggable="true"]').filter({ visible: true }).filter({ hasText: 'SP-1' })
	).toBeVisible();
});
