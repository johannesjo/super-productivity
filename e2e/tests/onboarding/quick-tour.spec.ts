import { expect, test } from '../../fixtures/test.fixture';
import { Locator, Page } from '@playwright/test';
import {
  assertNoRuntimeBrowserErrors,
  attachPageErrorCollector,
  installDevErrorDialogHandler,
} from '../../utils/runtime-errors';
import { waitForStatePersistence } from '../../utils/waits';

// Up to the inline icon, whose ligature name is part of the text content.
const INBOX_TIP = 'Tasks without a project of your own stay in';
const DECLINED = "It's under Help → Quick tour";

/** First run without the seeded Inbox tasks, so the user's task is the only one. */
const openFreshApp = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    localStorage.setItem('SUP_EXAMPLE_TASKS_CREATED', 'true');
  });
  await page.goto('/');
};

const addTaskViaComposer = async (page: Page, title: string): Promise<void> => {
  await page.locator('.tour-addBtn').click();
  const composer = page.locator('add-task-bar.global');
  const input = composer.locator('.main-input');
  await input.fill(title);
  await input.press('Enter');
  await expect(composer).toBeVisible();
  await input.press('Escape');
  await expect(composer).toBeHidden();
};

/** Adds the first task and waits for part 1's last tip with the tour offer. */
const reachTourOffer = async (page: Page, title: string): Promise<Locator> => {
  await openFreshApp(page);
  await addTaskViaComposer(page, title);
  const hint = page.locator('onboarding-hint');
  await expect(hint).toContainText(INBOX_TIP);
  // Focus returns to + after the composer closes; move it so the + tooltip
  // does not sit on top of the hint's buttons.
  await page.mouse.click(640, 600);
  return hint;
};

const openQuickTourFromHelp = async (page: Page): Promise<void> => {
  await page.locator('magic-side-nav').getByText('Help', { exact: true }).click();
  await page.getByText('Quick tour', { exact: true }).click();
};

test.describe('Quick tour', () => {
  test('walks through the steps on the first task, then offers more', async ({
    isolatedContext,
  }) => {
    const page = await isolatedContext.newPage();
    const runtimeErrors = attachPageErrorCollector(page, 'quick tour');
    installDevErrorDialogHandler(page, 'quick tour');
    const title = `Tour task ${Date.now()}`;
    const hint = await reachTourOffer(page, title);
    const task = page.locator('task').filter({ hasText: title }).first();

    await hint.getByRole('button', { name: 'Show me more ›' }).click();
    await expect(hint).toContainText('to track time');
    await expect(hint).toContainText('1 of 5');

    // 1: track time. Doing it shows ✓, then the chip moves on by itself.
    await task.hover();
    await task.locator('.start-task-btn').click();
    await expect(hint.locator('.ack')).toBeVisible();
    await expect(hint).toContainText('Break it down');
    await expect(hint).toContainText('2 of 5');
    await expect(hint).toContainText("Timer's running");

    // 2: add a subtask from the task's menu.
    await task.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Add subtask' }).click();
    const subtaskInput = page.locator('.e2e-add-subtask-input');
    await subtaskInput.fill('Tour subtask');
    await subtaskInput.press('Enter');
    await subtaskInput.press('Escape');
    await expect(hint).toContainText('Make a project of your own');
    await expect(hint).toContainText('3 of 5');

    // 3: the nav's + is hover-only; the tour reveals the one it points at.
    const addProjectBtn = page.locator('[data-nav-btn="add-project"]');
    await expect(addProjectBtn).toHaveClass(/onboarding-pulse/);
    await addProjectBtn.click();
    const projectNameInput = page
      .locator('dialog-create-project input[type="text"]')
      .first();
    await projectNameInput.fill(`Tour project ${Date.now()}`);
    await page.locator('dialog-create-project button[type=submit]').click();
    await expect(projectNameInput).toBeHidden();
    await expect(hint).toContainText('Plan the next days');
    await expect(hint).toContainText('4 of 5');

    // 4: open the Planner.
    await page.locator('magic-side-nav .tour-planner').first().click();
    await expect(page).toHaveURL(/\/planner/);
    const card = page.locator('quick-tour-card');
    await expect(card).toContainText('Want more?');
    await expect(card).toContainText('5 of 5');

    // 5: the card leads to the feature switches in Settings.
    await card.getByRole('button', { name: 'Open settings ›' }).click();
    await expect(page).toHaveURL(/\/config\?section=appFeatures/);
    await expect(card).toHaveCount(0);

    await waitForStatePersistence(page);
    await page.reload();
    await expect(page.locator('magic-side-nav')).toBeVisible();
    await expect(page.locator('onboarding-hint')).toHaveCount(0);

    // Help → Quick tour starts over on Today.
    await openQuickTourFromHelp(page);
    await expect(page).toHaveURL(/\/tag\/TODAY\/tasks/);
    await expect(page.locator('onboarding-hint')).toContainText('1 of 5');
    assertNoRuntimeBrowserErrors(runtimeErrors, 'quick tour');
    await page.close();
  });

  test('resumes after a reload and ends on ✕', async ({ isolatedContext }) => {
    const page = await isolatedContext.newPage();
    const runtimeErrors = attachPageErrorCollector(page, 'quick tour resume');
    installDevErrorDialogHandler(page, 'quick tour resume');
    const hint = await reachTourOffer(page, `Resume task ${Date.now()}`);
    await hint.getByRole('button', { name: 'Show me more ›' }).click();
    await hint.getByRole('button', { name: 'Next ›' }).click();
    await expect(hint).toContainText('2 of 5');

    await waitForStatePersistence(page);
    await page.reload();
    await expect(page.locator('onboarding-hint')).toContainText('2 of 5');

    await page
      .locator('onboarding-hint')
      .getByRole('button', { name: 'Close tip' })
      .click();
    await expect(page.locator('onboarding-hint')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('task-list').first()).toBeVisible();
    await expect(page.locator('onboarding-hint')).toHaveCount(0);
    assertNoRuntimeBrowserErrors(runtimeErrors, 'quick tour resume');
    await page.close();
  });

  test('No thanks points to Help once, and nothing follows', async ({
    isolatedContext,
  }) => {
    const page = await isolatedContext.newPage();
    const runtimeErrors = attachPageErrorCollector(page, 'quick tour declined');
    installDevErrorDialogHandler(page, 'quick tour declined');
    const hint = await reachTourOffer(page, `Declined task ${Date.now()}`);

    await hint.getByRole('button', { name: 'No thanks' }).click();
    await expect(hint).toContainText(DECLINED);
    // The pointer to Help leaves by itself after a moment.
    await expect(hint).toHaveCount(0, { timeout: 5000 });

    await waitForStatePersistence(page);
    await page.reload();
    await expect(page.locator('task-list').first()).toBeVisible();
    await expect(page.locator('onboarding-hint')).toHaveCount(0);
    assertNoRuntimeBrowserErrors(runtimeErrors, 'quick tour declined');
    await page.close();
  });

  test('✕ on the last tip ends guidance without an offer', async ({
    isolatedContext,
  }) => {
    const page = await isolatedContext.newPage();
    const runtimeErrors = attachPageErrorCollector(page, 'quick tour skipped');
    installDevErrorDialogHandler(page, 'quick tour skipped');
    const hint = await reachTourOffer(page, `Skipped task ${Date.now()}`);

    await hint.getByRole('button', { name: 'Close tip' }).click();
    await expect(hint).toHaveCount(0);
    await page.locator('magic-side-nav .tour-planner').first().click();
    await expect(page).toHaveURL(/\/planner/);
    await expect(page.locator('onboarding-hint')).toHaveCount(0);
    assertNoRuntimeBrowserErrors(runtimeErrors, 'quick tour skipped');
    await page.close();
  });
});
