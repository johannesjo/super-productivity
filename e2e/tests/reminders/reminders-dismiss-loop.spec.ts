import { expect, test } from '../../fixtures/test.fixture';
import { addTaskWithReminder } from '../../utils/schedule-task-helper';

// Repro for: "had some problems where no controls were working" (Android, SuperSync).
// Session log showed two OVERDUE scheduled reminders re-opening the reminder modal
// every ~10s and on every app resume. Dismissing the modal via backdrop / Android
// back button (== Escape) runs none of the dialog's clear logic — ngOnDestroy only
// clears DEADLINE reminders, never scheduled ones — so the worker
// (reminder.worker.ts CHECK_INTERVAL_DURATION = 10000) keeps re-emitting the overdue
// reminder and reminder.module.ts re-opens the modal (its only guard is
// openDialogs.length === 0). The modal repeatedly seizing the screen reads, on
// device, as a fully frozen app where no controls respond.

const DIALOG = 'dialog-view-task-reminder';
const DIALOG_TASK1 = `${DIALOG} .task:first-of-type`;
const SCHEDULE_MAX_WAIT_TIME = 60000;
// The reminder worker re-checks every 10s; wait out more than one full cycle.
const WORKER_RECHECK_WINDOW = 13000;

test.describe('Reminders dismiss loop', () => {
  test('should not re-open a scheduled reminder after it is dismissed without acting', async ({
    page,
    workViewPage,
    testPrefix,
  }) => {
    test.setTimeout(SCHEDULE_MAX_WAIT_TIME + 60000);

    await workViewPage.waitForTaskList();

    // A scheduled (non-deadline) reminder due ~now: minute-granular time input
    // rounds it to the current minute, so it is overdue the instant it fires —
    // the exact state from the bug log.
    const taskTitle = `${testPrefix}-0 dismiss-loop task`;
    await addTaskWithReminder(page, workViewPage, taskTitle, Date.now() + 8000);

    // The reminder fires and the modal appears.
    const dialog = page.locator(DIALOG);
    await dialog.waitFor({ state: 'visible', timeout: SCHEDULE_MAX_WAIT_TIME });
    await expect(page.locator(DIALOG_TASK1)).toContainText(taskTitle);

    // The user dismisses it without acting (backdrop tap / Android back == Escape).
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden', timeout: 10000 });

    // EXPECTED (correct behaviour, currently fails): a reminder the user has
    // actively dismissed must not re-seize the screen on its own. With the bug the
    // worker re-emits within ~10s and the modal reopens, so this assertion fails
    // because the dialog reappears inside the re-check window.
    const reappeared = await dialog
      .waitFor({ state: 'visible', timeout: WORKER_RECHECK_WINDOW })
      .then(() => true)
      .catch(() => false);

    expect(reappeared).toBe(false);
  });
});
