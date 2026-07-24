import { expect, test } from '../../fixtures/test.fixture';
import { devices } from '@playwright/test';
import {
  assertNoRuntimeBrowserErrors,
  attachPageErrorCollector,
  installDevErrorDialogHandler,
} from '../../utils/runtime-errors';
import { waitForStatePersistence } from '../../utils/waits';

test.describe('First-run onboarding', () => {
  test('applies a preset and does not show onboarding again after reload', async ({
    isolatedContext,
  }) => {
    const page = await isolatedContext.newPage();
    await page.setViewportSize({ width: 599, height: 800 });
    const runtimeErrors = attachPageErrorCollector(page, 'onboarding');
    installDevErrorDialogHandler(page, 'onboarding');

    await page.goto('/');

    const onboarding = page.locator('onboarding-preset-selection');
    await expect(onboarding).toBeVisible();
    await expect(onboarding.locator('.preset-card')).toHaveCount(3);

    await onboarding.getByRole('button', { name: /Simple Todo/ }).click();

    await expect(onboarding).toBeHidden();
    await expect(page.locator('task-list').first()).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem('SUP_ONBOARDING_PRESET_DONE')),
    ).toBe('true');

    const taskTitle = `Simple Todo preset ${Date.now()}`;
    await page.getByRole('button', { name: 'Add new task' }).click();
    const input = page.locator('add-task-bar.global .main-input');
    await input.fill(taskTitle);
    await input.press('Enter');
    await expect(page.locator('add-task-bar.global')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('add-task-bar.global')).toBeHidden();
    await page.setViewportSize({ width: 1280, height: 720 });
    const task = page.locator('task').filter({ hasText: taskTitle }).first();
    await expect(task).toBeVisible();
    await task.hover();
    await expect(task.locator('.start-task-btn')).toHaveCount(0);
    await waitForStatePersistence(page);

    await page.reload();

    await expect(page.locator('task-list').first()).toBeVisible();
    await expect(onboarding).toHaveCount(0);
    const reloadedTask = page.locator('task').filter({ hasText: taskTitle }).first();
    await expect(reloadedTask).toBeVisible();
    await reloadedTask.hover();
    await expect(reloadedTask.locator('.start-task-btn')).toHaveCount(0);
    assertNoRuntimeBrowserErrors(runtimeErrors, 'onboarding');
    await page.close();
  });

  test('closes the mobile composer after the first onboarding task', async ({
    baseURL,
    browser,
  }) => {
    const context = await browser.newContext({
      ...devices['Pixel 5'],
      baseURL: baseURL ?? 'http://localhost:4242',
      storageState: undefined,
    });
    const page = await context.newPage();
    const runtimeErrors = attachPageErrorCollector(page, 'mobile onboarding');
    installDevErrorDialogHandler(page, 'mobile onboarding');

    await page.addInitScript(() => {
      localStorage.setItem('SUP_EXAMPLE_TASKS_CREATED', 'true');
    });

    try {
      await page.goto('/');

      const onboarding = page.locator('onboarding-preset-selection');
      await onboarding.getByRole('button', { name: /Simple Todo/ }).tap();
      await expect(onboarding).toBeHidden();
      await expect(page.locator('onboarding-hint')).toContainText(
        'Tap + to add your first task',
      );

      await page.getByRole('button', { name: 'Add new task' }).tap();
      const input = page.locator('add-task-bar.global .main-input');
      await input.fill('My first mobile task');
      await input.press('Enter');

      await expect(page.locator('add-task-bar.global')).toBeHidden();
      await expect(page.locator('onboarding-hint')).toContainText(
        'Tap a task to open its details.',
      );
      assertNoRuntimeBrowserErrors(runtimeErrors, 'mobile onboarding');
    } finally {
      await context.close();
    }
  });
});
