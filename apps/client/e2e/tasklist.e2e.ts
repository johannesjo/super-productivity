import { expect, test } from '@playwright/test';

// Phase 3 gate: task list interactions — subtask via context menu, inline
// edit, drag-and-drop reorder — then persistence across reload. AppShell
// renders a hidden mobile copy of the workspace, so rows are scoped to visible
// ones.
test('adds a subtask, renames inline, reorders by drag, and persists', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

	const visibleRow = (text: string) =>
		page.locator('button[draggable="true"]').filter({ visible: true }).filter({ hasText: text });

	const alpha = `Alpha ${Date.now()}`;
	const beta = `Beta ${Date.now()}`;
	const quickAdd = page.getByRole('textbox', { name: 'Add a task' });
	await quickAdd.fill(alpha);
	await quickAdd.press('Enter');
	await quickAdd.fill(beta);
	await quickAdd.press('Enter');

	await expect(visibleRow(alpha)).toBeVisible();
	await expect(visibleRow(beta)).toBeVisible();

	// Subtask via context menu
	const child = `Child ${Date.now()}`;
	await visibleRow(alpha).click({ button: 'right' });
	const addSub = page.locator('[role="menuitem"]', { hasText: 'Add sub-task' });
	await expect(addSub).toBeVisible();
	await addSub.click();
	const subInput = page.getByRole('textbox', { name: `Add sub-task to ${alpha}` });
	await expect(subInput).toBeVisible();
	await subInput.fill(child);
	await subInput.press('Enter');
	await expect(visibleRow(child)).toBeVisible();

	// Inline rename via double-click
	const renamed = `Beta renamed ${Date.now()}`;
	await visibleRow(beta).dblclick();
	const editInput = page.getByRole('textbox', { name: `Edit ${beta}` });
	await expect(editInput).toBeVisible();
	await editInput.fill(renamed);
	await editInput.press('Enter');
	await expect(visibleRow(renamed)).toBeVisible();

	// Drag Alpha below the (renamed) Beta row
	await visibleRow(alpha).dragTo(visibleRow(renamed));
	await page.reload();

	const rows = page.locator('button[draggable="true"]').filter({ visible: true });
	await expect(rows.filter({ hasText: alpha })).toBeVisible();
	const texts = await rows.allTextContents();
	const indexOf = (text: string) => texts.findIndex((value) => value.includes(text));
	expect(indexOf(alpha)).toBeGreaterThan(-1);
	expect(indexOf(child)).toBeGreaterThan(-1);
	expect(indexOf(renamed)).toBeLessThan(indexOf(alpha));
	expect(indexOf(alpha)).toBeLessThan(indexOf(child));
});
