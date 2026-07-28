import { expect, test } from '../../fixtures/test.fixture';
import type { Page } from '@playwright/test';

/**
 * REGRESSION GUARD for the #9052 orphan self-heal — NOT a reproduction of #8780.
 *
 * An "orphan" here is the shape that survives hydration: projectId '' (the
 * empty STRING passes typia validation, unlike undefined), no tags, no due
 * date. Its id is then in no project's and no tag's ordering array, so it
 * renders in no list view. There is no UI path that creates this, so it is
 * injected through the store the same way the app's own reducers would.
 *
 * IMPORTANT FINDING (2026-07-28): this test was written to reproduce #8780 and
 * it does NOT. It passes against v18.16.0 — the exact build the reporter says
 * is still broken — as well as against current HEAD. Verified by checking out
 * `v18.16.0:navigate-to-task.service.ts` and re-running: green both times.
 *
 * So the no-project/no-tag/not-due-today case, which #8801 and #9052 both
 * targeted, already works end-to-end through the real search UI. The reporter's
 * failing tasks must differ in some other way (archived? tagged? a dangling
 * projectId? Android WebView specific?). Do not treat #8780 as diagnosed until
 * a trace from the reporter says which. Keep this test as a guard so the
 * behaviour that DOES work cannot silently regress.
 */

const openGlobalSearch = async (page: Page): Promise<void> => {
  await page.keyboard.press('Shift+F');
  await expect(page).toHaveURL(/\/#\/search$/);
  await expect(page.locator('search-page')).toBeVisible();
};

/**
 * Strips every context membership from the task so it renders nowhere.
 * Raw actions carry no `meta`, which is fine here: the reducers apply first and
 * the only consequence is a post-reducer isRemote devError that auto-dismisses.
 */
const makeTaskAnOrphan = async (page: Page, taskId: string): Promise<void> => {
  await page.evaluate((id) => {
    type EntityState = { ids: string[]; entities: Record<string, any> };
    const store = (
      window as unknown as {
        __e2eTestHelpers: {
          store: {
            dispatch: (a: unknown) => void;
            subscribe: (fn: (v: unknown) => void) => { unsubscribe: () => void };
          };
        };
      }
    ).__e2eTestHelpers.store;

    // NgRx Store is backed by a BehaviorSubject, so subscribing emits the
    // current state synchronously. Feature keys are 'projects'/'tasks'/'tag'.
    let rootState!: Record<string, EntityState>;
    store
      .subscribe((v) => {
        rootState = v as Record<string, EntityState>;
      })
      .unsubscribe();

    // 1. Detach from every project ordering array.
    for (const pid of rootState.projects.ids) {
      const project = rootState.projects.entities[pid];
      store.dispatch({
        type: '[Project] Update Project',
        project: {
          id: pid,
          changes: {
            taskIds: (project.taskIds || []).filter((t: string) => t !== id),
            backlogTaskIds: (project.backlogTaskIds || []).filter(
              (t: string) => t !== id,
            ),
          },
        },
      });
    }

    // 2. Detach from every tag ordering array.
    for (const tid of rootState.tag.ids) {
      const tag = rootState.tag.entities[tid];
      store.dispatch({
        type: '[Tag] Update Tag',
        tag: {
          id: tid,
          changes: { taskIds: (tag.taskIds || []).filter((t: string) => t !== id) },
        },
      });
    }

    // 3. Clear projectId/tags/due so no virtual context claims it either.
    store.dispatch({
      type: '[Task Shared] updateTask',
      task: {
        id,
        changes: { projectId: '', tagIds: [], dueDay: undefined, dueWithTime: undefined },
      },
    });
  }, taskId);
};

test.describe('Global Search — orphan task (#8780)', () => {
  test('reveals and focuses a task that belongs to no project, tag or day', async ({
    page,
    workViewPage,
    taskPage,
    testPrefix,
  }) => {
    await workViewPage.waitForTaskList();
    const taskName = `${testPrefix}-OrphanSearchResult`;
    await workViewPage.addTask(taskName);

    const taskEl = taskPage.getTaskByText(taskName);
    await expect(taskEl).toBeVisible();
    const domId = await taskEl.evaluate((el: HTMLElement) => {
      const host = el.closest('task') ?? el;
      return host.id;
    });
    expect(domId).toMatch(/^t-/);
    const taskId = domId.slice(2);

    await makeTaskAnOrphan(page, taskId);

    // Precondition: the task must now render nowhere. If this fails the fixture
    // is wrong and the rest of the test proves nothing.
    await expect(taskPage.getTaskByText(taskName)).toBeHidden();

    await openGlobalSearch(page);
    await page.locator('search-page .search-field input').fill(taskName);
    const result = page
      .locator('search-page mat-list-item')
      .filter({ hasText: taskName });
    await expect(result).toHaveCount(1);
    await result.click();

    // The whole point of #8780: the click must actually land somewhere that
    // shows the task, not silently no-op or open an empty view.
    await expect(page).toHaveURL(/\/#\/project\/INBOX_PROJECT\/tasks/);
    await expect(taskPage.getTaskByText(taskName)).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.id ?? ''))
      .toBe(domId);
  });
});
