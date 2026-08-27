import { test, expect } from '../../fixtures/supersync.fixture';
import {
  createTestUser,
  getSuperSyncConfig,
  createSimulatedClient,
  closeClient,
  waitForTask,
  type SimulatedE2EClient,
} from '../../utils/supersync-helpers';
import { openRecurDialog, saveRecurDialog } from '../../utils/recurring-task-helpers';

/**
 * Bug: https://github.com/super-productivity/super-productivity/issues/9728
 *
 * A daily recurring task with inherited subtasks shows every subtask twice
 * after the instance is created on more than one device.
 *
 * Why it happens: the repeat INSTANCE has a deterministic id
 * (getRepeatableTaskId -> `rpt_<cfgId>_<dueDay>`), so two devices creating the
 * same day's instance collide on one entity and conflict resolution keeps one.
 * Its SUBTASKS used to get fresh nanoid ids, so the two devices produced
 * DISJOINT entity ids. Conflict detection keys on `ENTITY_TYPE:entityId`
 * (sync-core entity-key.util.ts), so those never form a conflict group and all
 * of them apply — one parent, 2x the subtasks.
 *
 * Fix: getRepeatableSubTaskId() makes subtask ids deterministic too, so the
 * second device's creation is a no-op for the whole instance.
 *
 * NOTE: no client goes offline here. Both simply reach the day change before
 * the other has synced, which is the ordinary case when two devices are open
 * around midnight.
 */

/** Add a subtask via the 'a' keyboard shortcut (mirrors supersync-archive-subtasks). */
const addSubtask = async (
  page: SimulatedE2EClient['page'],
  parentTaskName: string,
  subtaskTitle: string,
): Promise<void> => {
  const parentTask = page.locator(`task:has-text("${parentTaskName}")`).first();
  await parentTask.waitFor({ state: 'visible', timeout: 10000 });
  await parentTask.focus();
  await page.waitForTimeout(100);
  await parentTask.press('a');

  const draftInput = page.locator('.e2e-add-subtask-input');
  await draftInput.waitFor({ state: 'visible', timeout: 5000 });
  await draftInput.fill(subtaskTitle);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await draftInput.waitFor({ state: 'detached', timeout: 5000 });

  await waitForTask(page, subtaskTitle);
  await page.waitForTimeout(200);
};

/**
 * Count rendered SUBTASK rows with the given title.
 * `.hasNoSubTasks` excludes the parent, whose DOM subtree also contains the text.
 */
const countSubtaskRows = async (
  page: SimulatedE2EClient['page'],
  title: string,
): Promise<number> =>
  page.locator(`task.hasNoSubTasks:not(.ng-animating):has-text("${title}")`).count();

/**
 * Move a client past midnight and wait for the fresh instance to appear.
 * setSystemTime (not setFixedTime) so Date.now() keeps advancing — the
 * day-change effect chain's debounceTime(1000) needs a moving clock (#6230).
 */
const advancePastMidnight = async (
  client: SimulatedE2EClient,
  parentName: string,
): Promise<void> => {
  await client.page.clock.setSystemTime(new Date('2026-06-16T00:05:00'));
  await client.page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(
    client.page
      .locator(`task:not(.hasNoSubTasks):not(.isDone):has-text("${parentName}")`)
      .first(),
  ).toBeVisible({ timeout: 60000 });
};

test.describe('@supersync Recurring subtask duplication (#9728)', () => {
  test('creates each inherited subtask once when two devices reach the day change', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    let clientA: SimulatedE2EClient | null = null;
    let clientB: SimulatedE2EClient | null = null;

    try {
      const user = await createTestUser(testRunId);
      const syncConfig = getSuperSyncConfig(user);

      const parentName = `Routine-${testRunId}`;
      const sub1 = `Step1-${testRunId}`;
      const sub2 = `Step2-${testRunId}`;

      clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
      clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);

      // Both devices start on the same day, shortly before midnight.
      for (const client of [clientA, clientB]) {
        await client.page.clock.setSystemTime(new Date('2026-06-15T23:55:00'));
        await client.page.reload();
        await client.workView.waitForTaskList();
      }

      await clientA.sync.setupSuperSync(syncConfig);
      await clientB.sync.setupSuperSync(syncConfig);

      // 1. Device A builds the routine: a parent with two subtasks...
      await clientA.workView.addTask(parentName);
      await waitForTask(clientA.page, parentName);
      await addSubtask(clientA.page, parentName, sub1);
      await addSubtask(clientA.page, parentName, sub2);

      // 2. ...and makes it a daily repeat. shouldInheritSubtasks defaults to true
      //    when the task already has subtasks (dialog-edit-task-repeat-cfg.component.ts).
      await clientA.page.locator(`task:has-text("${parentName}")`).first().click();
      await openRecurDialog(clientA.page);
      await saveRecurDialog(clientA.page);
      await clientA.page.keyboard.press('Escape');

      // 3. Both devices agree on the config and day-15 instance.
      await clientA.sync.syncAndWait();
      await clientB.sync.syncAndWait();
      await waitForTask(clientB.page, parentName);

      // 4. THE SCENARIO: both devices cross midnight before either syncs, so both
      //    independently create the day-16 instance and its inherited subtasks.
      await advancePastMidnight(clientA, parentName);
      await advancePastMidnight(clientB, parentName);

      // 5. Converge.
      await clientA.sync.syncAndWait();
      await clientB.sync.syncAndWait();
      await clientA.sync.syncAndWait();

      // 6. Each inherited subtask must exist exactly once on BOTH devices.
      //    Before the fix this is 2 per device (#9728).
      for (const [name, client] of [
        ['A', clientA],
        ['B', clientB],
      ] as const) {
        expect(
          await countSubtaskRows(client.page, sub1),
          `client ${name}: "${sub1}" should render once`,
        ).toBe(1);
        expect(
          await countSubtaskRows(client.page, sub2),
          `client ${name}: "${sub2}" should render once`,
        ).toBe(1);
      }
    } finally {
      if (clientA) await closeClient(clientA);
      if (clientB) await closeClient(clientB);
    }
  });
});
