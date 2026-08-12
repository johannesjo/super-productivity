import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});

test('captures, completes, and persists a task offline', async ({ page }) => {
	const title = `Offline task ${Date.now()}`;
	await page.getByRole('textbox', { name: 'Add a task' }).fill(title);
	await page.getByRole('textbox', { name: 'Add a task' }).press('Enter');
	const row = page
		.locator('button[draggable="true"]')
		.filter({ visible: true })
		.filter({ hasText: title });
	await expect(row).toBeVisible();
	await page.reload();
	const persistedCheckbox = page.getByRole('checkbox', { name: `Complete ${title}` });
	await expect(persistedCheckbox).toBeVisible();
	await persistedCheckbox.click();
});

test('opens command search and settings from keyboard shortcuts', async ({ page }) => {
	await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');
	await expect(page.getByRole('dialog', { name: 'Search Noura' })).toBeVisible();
	await page.keyboard.press('Escape');
	await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,');
	await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
});

test('navigates planner, boards, focus, and insights', async ({ page }) => {
	await page.locator("button[aria-label='Planner']").click();
	await expect(page.getByRole('heading', { name: 'Planner' })).toBeVisible();
	await page.locator("button[aria-label='Boards']").click();
	await expect(page.getByRole('heading', { name: 'Boards' })).toBeVisible();
	await page.locator("button[aria-label='Focus']").click();
	await expect(page.getByRole('heading', { name: 'Focus', exact: true })).toBeVisible();
	await page.locator("button[aria-label='Insights']").click();
	await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();
});

test('uses smart lists, activity, task tools, and integration setup', async ({ page }) => {
	await page.getByRole('button', { name: 'High priority', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'High priority' })).toBeVisible();
	const group = page.getByRole('button', { name: /^Open / });
	await group.click();
	await expect(group).toHaveAttribute('aria-expanded', 'false');

	await page.getByRole('button', { name: 'Activity', exact: true }).click();
	await expect(page.getByRole('dialog', { name: 'Activity' })).toBeVisible();
	await page
		.getByRole('dialog', { name: 'Activity' })
		.getByRole('button', { name: 'Close' })
		.click();

	await page.locator("button[aria-label='Settings']").click();
	await page.getByRole('button', { name: 'Integrations', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Configure', exact: true })).toHaveCount(15);
	await page.getByRole('button', { name: 'Configure', exact: true }).first().click();
	const integration = page.getByRole('dialog', { name: 'Configure Jira' });
	await integration
		.getByRole('textbox', { name: 'Server or workspace URL' })
		.fill('https://jira.example.test');
	await integration.getByRole('textbox', { name: 'Access token' }).fill('test-token');
	await integration.getByRole('button', { name: 'Save connection' }).click();
	await expect(page.getByRole('button', { name: 'Configured', exact: true })).toBeVisible();
});

test('records a focus segment and restores it after reload', async ({ page }) => {
	await page.locator("button[aria-label='Focus']").click();
	await page.getByRole('button', { name: 'Start', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Pause', exact: true }).click();
	await expect(page.getByText('pomodoro', { exact: true })).toBeVisible();
	await page.reload();
	await page.locator("button[aria-label='Focus']").click();
	await expect(page.getByText('pomodoro', { exact: true })).toBeVisible();
});
