import { type Locator, type Page } from '@playwright/test';
import { expect, test } from '../../fixtures/test.fixture';

const ADD_TASK_BAR = 'add-task-bar.global';
const ADD_TASK_INPUT = `${ADD_TASK_BAR} input`;
const DUE_BUTTON = `${ADD_TASK_BAR} [data-test="add-task-bar-due-btn"]`;
const SCHEDULE_DIALOG = 'dialog-schedule-task';
const QUICK_ACCESS_BTN = `${SCHEDULE_DIALOG} .quick-access button`;

const ensureGlobalAddTaskBarOpen = async (page: Page): Promise<Locator> => {
  const addTaskInput = page.locator(ADD_TASK_INPUT).first();
  const isVisible = await addTaskInput.isVisible().catch(() => false);

  if (!isVisible) {
    const addBtn = page.locator('.tour-addBtn').first();
    await addBtn.waitFor({ state: 'visible', timeout: 10000 });
    await addBtn.click();
  }

  await addTaskInput.waitFor({ state: 'visible', timeout: 10000 });
  return addTaskInput;
};

const openScheduleDialogFromBar = async (
  page: Page,
): Promise<{ dialog: Locator; dueButton: Locator }> => {
  const dueButton = page.locator(DUE_BUTTON).first();
  await dueButton.waitFor({ state: 'visible', timeout: 10000 });
  await dueButton.click();

  const dialog = page.locator(SCHEDULE_DIALOG);
  await dialog.waitFor({ state: 'visible', timeout: 10000 });

  return { dialog, dueButton };
};

test.describe('Add Task Bar date picker', () => {
  test.beforeEach(async ({ workViewPage }) => {
    await workViewPage.waitForTaskList();
  });

  test('selecting Today keeps add-task-bar open and sets the date', async ({
    page,
    testPrefix,
  }) => {
    const input = await ensureGlobalAddTaskBarOpen(page);
    await input.fill(`${testPrefix}-today quick date`);

    const { dialog, dueButton } = await openScheduleDialogFromBar(page);
    await dialog.locator(QUICK_ACCESS_BTN).first().click();
    await dialog.waitFor({ state: 'hidden', timeout: 10000 });

    await expect(page.locator(ADD_TASK_INPUT)).toBeVisible();
    await expect(dueButton).toHaveClass(/has-value/);
    await expect(dueButton).toContainText(/today/i);
  });

  test('selecting Tomorrow keeps add-task-bar open and sets the date', async ({
    page,
    testPrefix,
  }) => {
    const input = await ensureGlobalAddTaskBarOpen(page);
    await input.fill(`${testPrefix}-tomorrow quick date`);

    const { dialog, dueButton } = await openScheduleDialogFromBar(page);
    await dialog.locator(QUICK_ACCESS_BTN).nth(1).click();
    await dialog.waitFor({ state: 'hidden', timeout: 10000 });

    await expect(page.locator(ADD_TASK_INPUT)).toBeVisible();
    await expect(dueButton).toHaveClass(/has-value/);
    await expect(dueButton).toContainText(/tomorrow/i);
  });

  test('canceling the dialog keeps add-task-bar open without setting a date', async ({
    page,
    testPrefix,
  }) => {
    const input = await ensureGlobalAddTaskBarOpen(page);
    await input.fill(`${testPrefix}-cancel quick date`);

    const { dialog, dueButton } = await openScheduleDialogFromBar(page);
    await dialog.locator('button:has-text("Cancel")').click();
    await dialog.waitFor({ state: 'hidden', timeout: 10000 });

    await expect(page.locator(ADD_TASK_INPUT)).toBeVisible();
    await expect(dueButton).not.toHaveClass(/has-value/);
    await expect(dueButton).toContainText(/due/i);
  });
});
