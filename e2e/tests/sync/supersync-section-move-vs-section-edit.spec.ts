import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/supersync.fixture';
import {
  closeClient,
  createSimulatedClient,
  createTestUser,
  getSuperSyncConfig,
  type SimulatedE2EClient,
} from '../../utils/supersync-helpers';

/**
 * #10969: a cross-section task move (`addTaskToSection` with a different
 * `sourceSectionId`) declares both sections. A concurrent collapse or rename of
 * either section used to stop sync with the whole-dataset "Keep local / Keep
 * remote" dialog. The move writes only `taskIds` and the edit only `isExpanded`
 * or `title`, so both must apply on every device in either sync order.
 *
 * Actions are dispatched as the UI dispatches them (drag → addTaskToSection,
 * section header → updateSection). syncAndWait() fails on the conflict dialog.
 */

type StoreLike = {
  dispatch: (action: unknown) => void;
  subscribe: (next: (state: unknown) => void) => { unsubscribe: () => void };
};

interface SectionView {
  title: string;
  isExpanded: boolean | undefined;
  tasks: string[];
}

const readSections = async (
  page: Page,
  sectionIds: string[],
): Promise<Record<string, SectionView | null>> =>
  page.evaluate((ids) => {
    type TaskLike = { id: string; title: string };
    type SectionLike = { title: string; isExpanded?: boolean; taskIds: string[] };
    type State = {
      tasks?: { entities?: Record<string, TaskLike | undefined> };
      section?: { entities?: Record<string, SectionLike | undefined> };
    };
    const store = (window as unknown as { __e2eTestHelpers?: { store?: StoreLike } })
      .__e2eTestHelpers?.store;
    if (!store) throw new Error('__e2eTestHelpers.store missing');
    let state: State = {};
    store.subscribe((value) => (state = value as State)).unsubscribe();
    const tasks = state.tasks?.entities ?? {};
    return Object.fromEntries(
      ids.map((id) => {
        const section = state.section?.entities?.[id];
        return [
          id,
          section
            ? {
                title: section.title,
                isExpanded: section.isExpanded,
                tasks: section.taskIds.map(
                  (taskId) => tasks[taskId]?.title ?? `[missing:${taskId}]`,
                ),
              }
            : null,
        ];
      }),
    );
  }, sectionIds);

const dispatch = async (page: Page, action: Record<string, unknown>): Promise<void> => {
  const ok = await page.evaluate((a) => {
    const store = (window as unknown as { __e2eTestHelpers?: { store?: StoreLike } })
      .__e2eTestHelpers?.store;
    if (!store) return false;
    store.dispatch(a);
    return true;
  }, action);
  expect(ok).toBe(true);
};

const getTaskId = async (page: Page, title: string): Promise<string> => {
  const id = await page.evaluate((taskTitle) => {
    type TaskLike = { id: string; title: string };
    const store = (window as unknown as { __e2eTestHelpers?: { store?: StoreLike } })
      .__e2eTestHelpers?.store;
    if (!store) return null;
    let state: { tasks?: { entities?: Record<string, TaskLike | undefined> } } = {};
    store.subscribe((value) => (state = value as typeof state)).unsubscribe();
    return (
      Object.values(state.tasks?.entities ?? {}).find((t) => t?.title === taskTitle)
        ?.id ?? null
    );
  }, title);
  if (!id) throw new Error(`Task "${title}" not found`);
  return id;
};

const addSection = (id: string, title: string): Record<string, unknown> => ({
  type: '[Section] Add Section',
  section: {
    id,
    contextId: 'TODAY',
    contextType: 'TAG',
    title,
    isExpanded: true,
    taskIds: [],
  },
  meta: { isPersistent: true, entityType: 'SECTION', entityId: id, opType: 'CRT' },
});

/** The action task-list.component.ts dispatches for a drag between sections. */
const moveTask = (
  taskId: string,
  sectionId: string,
  sourceSectionId: string | null,
  afterTaskId: string | null,
): Record<string, unknown> => ({
  type: '[Section] Add Task to Section',
  sectionId,
  taskId,
  afterTaskId,
  sourceSectionId,
  meta: {
    isPersistent: true,
    entityType: 'SECTION',
    ...(sourceSectionId && sourceSectionId !== sectionId
      ? { entityIds: [sourceSectionId, sectionId] }
      : { entityId: sectionId }),
    opType: 'MOV',
  },
});

/** The action the section header (collapse, rename) dispatches. */
const updateSection = (
  id: string,
  changes: Record<string, unknown>,
): Record<string, unknown> => ({
  type: '[Section] Update Section',
  section: { id, changes },
  meta: { isPersistent: true, entityType: 'SECTION', entityId: id, opType: 'UPD' },
});

type Edit = 'collapse of the source section' | 'rename of the destination section';
type FirstToSync = 'editor syncs first' | 'mover syncs first';

const EDITS: Edit[] = [
  'collapse of the source section',
  'rename of the destination section',
];
const ORDERS: FirstToSync[] = ['editor syncs first', 'mover syncs first'];

test.describe('@supersync Cross-section task move vs concurrent section edit (#10969)', () => {
  for (const edit of EDITS) {
    for (const order of ORDERS) {
      test(`move S1 → S2 vs ${edit}, ${order}`, async ({
        browser,
        baseURL,
        testRunId,
      }) => {
        test.setTimeout(180000);
        const appUrl = baseURL || 'http://localhost:4242';
        const s1 = `s1-${testRunId}`;
        const s2 = `s2-${testRunId}`;
        const moverTitle = `A-${testRunId}-Mover`;
        const stayTitle = `A-${testRunId}-Stay`;
        const otherTitle = `A-${testRunId}-Other`;
        let clientA: SimulatedE2EClient | null = null;
        let clientB: SimulatedE2EClient | null = null;
        let clientC: SimulatedE2EClient | null = null;

        try {
          const user = await createTestUser(testRunId);
          const syncConfig = getSuperSyncConfig(user);

          clientA = await createSimulatedClient(browser, appUrl, 'A', testRunId);
          await clientA.workView.waitForTaskList();
          await clientA.sync.setupSuperSync(syncConfig);
          await clientA.workView.addTask('Mover');
          await clientA.workView.addTask('Stay');
          await clientA.workView.addTask('Other');
          const mover = await getTaskId(clientA.page, moverTitle);
          const stay = await getTaskId(clientA.page, stayTitle);
          const other = await getTaskId(clientA.page, otherTitle);
          await dispatch(clientA.page, addSection(s1, 'One'));
          await dispatch(clientA.page, addSection(s2, 'Two'));
          await dispatch(clientA.page, moveTask(mover, s1, null, null));
          await dispatch(clientA.page, moveTask(stay, s1, null, mover));
          await dispatch(clientA.page, moveTask(other, s2, null, null));
          await clientA.sync.syncAndWait();

          clientB = await createSimulatedClient(browser, appUrl, 'B', testRunId);
          await clientB.workView.waitForTaskList();
          await clientB.sync.setupSuperSync(syncConfig);
          await clientB.sync.syncAndWait();

          const seeded = {
            [s1]: { title: 'One', isExpanded: true, tasks: [moverTitle, stayTitle] },
            [s2]: { title: 'Two', isExpanded: true, tasks: [otherTitle] },
          };
          expect(await readSections(clientA.page, [s1, s2])).toEqual(seeded);
          expect(await readSections(clientB.page, [s1, s2])).toEqual(seeded);

          // Client A drags "Mover" from S1 to the top of S2.
          await dispatch(clientA.page, moveTask(mover, s2, s1, null));
          // Client B, concurrently, edits one of the two sections.
          const isCollapse = edit === 'collapse of the source section';
          await dispatch(
            clientB.page,
            isCollapse
              ? updateSection(s1, { isExpanded: false })
              : updateSection(s2, { title: 'Renamed' }),
          );

          const [first, second] =
            order === 'editor syncs first' ? [clientB, clientA] : [clientA, clientB];
          await first.sync.syncAndWait();
          await second.sync.syncAndWait();
          await first.sync.syncAndWait();
          await second.sync.syncAndWait();

          const expected = {
            [s1]: { title: 'One', isExpanded: !isCollapse, tasks: [stayTitle] },
            [s2]: {
              title: isCollapse ? 'Two' : 'Renamed',
              isExpanded: true,
              tasks: [moverTitle, otherTitle],
            },
          };
          expect({
            clientA: await readSections(clientA.page, [s1, s2]),
            clientB: await readSections(clientB.page, [s1, s2]),
          }).toEqual({ clientA: expected, clientB: expected });

          // Persisted, not only in memory.
          await clientA.page.reload();
          await clientA.workView.waitForTaskList();
          await clientB.page.reload();
          await clientB.workView.waitForTaskList();
          expect(await readSections(clientA.page, [s1, s2])).toEqual(expected);
          expect(await readSections(clientB.page, [s1, s2])).toEqual(expected);

          // A fresh device replays the server history to the same state.
          clientC = await createSimulatedClient(browser, appUrl, 'C', testRunId);
          await clientC.workView.waitForTaskList();
          await clientC.sync.setupSuperSync(syncConfig);
          await clientC.sync.syncAndWait();
          expect(await readSections(clientC.page, [s1, s2])).toEqual(expected);
        } finally {
          if (clientA) await closeClient(clientA);
          if (clientB) await closeClient(clientB);
          if (clientC) await closeClient(clientC);
        }
      });
    }
  }
});
