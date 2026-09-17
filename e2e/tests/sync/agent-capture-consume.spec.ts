import { PrismaClient } from '@prisma/client';
import { expect, test } from '../../fixtures/supersync.fixture';
import {
  closeClient,
  createSimulatedClient,
  createTestUser,
  deleteTask,
  getSuperSyncConfig,
  type SimulatedE2EClient,
} from '../../utils/supersync-helpers';
import { waitForAppReady } from '../../utils/waits';
import { createAgentCaptureConsumeHarness } from '../../../packages/super-sync-server/tests/integration/agent-capture-consume.harness';

interface CaptureHelpers {
  store: {
    subscribe: (listener: (state: CaptureState) => void) => { unsubscribe: () => void };
  };
  addCaptureTask: (input: {
    captureId: string;
    title: string;
  }) => Promise<{ taskId: string; operationId: string }>;
  compactOperationLog: () => Promise<boolean>;
}
interface CaptureState {
  tasks: { entities: Record<string, Record<string, unknown>>; ids: string[] };
  projects: { entities: Record<string, { taskIds: string[]; backlogTaskIds: string[] }> };
  tag: { entities: Record<string, { taskIds: string[] }> };
}
interface CaptureProjection {
  task: Record<string, unknown> | null;
  taskIds: string[];
  projects: string[];
  tags: string[];
}
interface CaptureEntry {
  op: { id: string; q?: string; t: number };
  rejectedAt?: number;
  syncedAt?: number;
}
const addCapture = (
  client: SimulatedE2EClient,
  captureId: string,
  title: string,
): Promise<{ taskId: string; operationId: string }> =>
  client.page.evaluate(
    (input) =>
      (
        window as unknown as { __e2eTestHelpers: CaptureHelpers }
      ).__e2eTestHelpers.addCaptureTask(input),
    { captureId, title },
  );

// Missing/unreadable store is a test failure, never evidence of task absence.
const readState = (
  client: SimulatedE2EClient,
  taskId: string,
): Promise<CaptureProjection> =>
  client.page.evaluate(async (id) => {
    const helpers = (window as unknown as { __e2eTestHelpers?: CaptureHelpers })
      .__e2eTestHelpers;
    if (!helpers?.store) throw new Error('Live NgRx store unavailable');
    const state = await new Promise<CaptureState>((resolve) => {
      const subscription = helpers.store.subscribe(resolve);
      subscription.unsubscribe();
    });
    if (!state.tasks?.entities || !state.projects?.entities || !state.tag?.entities) {
      throw new Error('Expected hydrated task/project/tag state');
    }
    return {
      task: state.tasks.entities[id] ?? null,
      taskIds: state.tasks.ids.filter((value) => value === id),
      projects: Object.entries(state.projects.entities).flatMap(([projectId, project]) =>
        ['taskIds', 'backlogTaskIds'].flatMap((key) =>
          (project[key as 'taskIds' | 'backlogTaskIds'] ?? [])
            .filter((value) => value === id)
            .map(() => `${projectId}:${key}`),
        ),
      ),
      tags: Object.entries(state.tag.entities).flatMap(([tagId, tag]) =>
        (tag.taskIds ?? []).filter((value) => value === id).map(() => tagId),
      ),
    };
  }, taskId);

const readEntry = (
  client: SimulatedE2EClient,
  operationId: string,
): Promise<CaptureEntry | null> =>
  client.page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('SUP_OPS');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<CaptureEntry | null>((resolve, reject) => {
        const request = db.transaction('ops').objectStore('ops').getAll();
        request.onsuccess = () =>
          resolve(
            request.result.find((entry: { op: { id: string } }) => entry.op.id === id) ??
              null,
          );
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }, operationId);

test.describe('@supersync Consume-on-accept experiment', () => {
  test.skip(
    !process.env.DATABASE_URL || process.env.E2E_AGENT_CAPTURE_CONSUME !== 'true',
    'Opt in with E2E_AGENT_CAPTURE_CONSUME=true and the isolated consume test server',
  );

  for (const scenario of [
    'stale-after-delete',
    'loser-created-earlier',
    'loser-created-later',
  ] as const) {
    test(scenario, async ({ browser, baseURL, testRunId }, testInfo) => {
      const prisma = new PrismaClient();
      const harness = createAgentCaptureConsumeHarness(prisma);
      const clients: SimulatedE2EClient[] = [];
      try {
        const user = await createTestUser(`${testRunId}-consume`);
        const config = getSuperSyncConfig(user);
        for (const name of ['winner', 'loser']) {
          const client = await createSimulatedClient(browser, baseURL!, name, testRunId);
          clients.push(client);
          await client.sync.setupSuperSync(config);
          await client.page.goto(`${baseURL}/#/project/INBOX_PROJECT/tasks`);
          await client.workView.waitForTaskList();
        }
        const [winner, loser] = clients;
        await winner.sync.syncAndWait();
        await loser.sync.syncAndWait();
        const captureId = `${testRunId}-consume`;
        const title = `Capture ${testRunId}`;
        await harness.enqueueCapture({ userId: user.userId, captureId, title });
        const earlyLoser =
          scenario === 'loser-created-earlier'
            ? await addCapture(loser, captureId, title)
            : null;
        const accepted = await addCapture(winner, captureId, title);
        const lateLoser =
          scenario === 'loser-created-later'
            ? await addCapture(loser, captureId, title)
            : null;
        await winner.sync.syncAndWait();
        const receipt = await harness.readCaptureReceipt({
          userId: user.userId,
          captureId,
        });
        expect(receipt?.opId).toBe(accepted.operationId);
        const stored = await prisma.operation.findUnique({
          where: { id: accepted.operationId },
        });
        expect(stored?.isPayloadEncrypted).toBe(true);
        expect(JSON.stringify(stored?.payload)).not.toContain(title);

        if (scenario === 'stale-after-delete') {
          await loser.sync.syncAndWait();
          await deleteTask(winner, title);
          await winner.sync.syncAndWait();
          await loser.sync.syncAndWait();
          expect((await readState(loser, accepted.taskId)).task).toBeNull();
        }
        const rejected =
          earlyLoser ?? lateLoser ?? (await addCapture(loser, captureId, title));
        const before = {
          winner: await readState(winner, accepted.taskId),
          loser: await readState(loser, accepted.taskId),
        };
        if (scenario !== 'stale-after-delete') {
          const loserCreated = Number(before.loser.task?.created);
          const winnerCreated = Number(before.winner.task?.created);
          if (scenario === 'loser-created-earlier')
            expect(loserCreated).toBeLessThan(winnerCreated);
          else expect(loserCreated).toBeGreaterThan(winnerCreated);
        }
        try {
          await loser.sync.syncAndWait();
        } catch (error) {
          // The existing UI reports permanent rejection as sync failure. Continue
          // only when this exact capture op was durably rejected, to inspect the
          // state that rejection left behind. Other failures still fail the test.
          if (
            !(error instanceof Error) ||
            error.message !== 'Sync failed with error state during syncAndWait()'
          )
            throw error;
          await expect
            .poll(async () => (await readEntry(loser, rejected.operationId))?.rejectedAt)
            .toBeGreaterThan(0);
          expect(
            await prisma.operation.findUnique({ where: { id: rejected.operationId } }),
          ).toBeNull();
        }
        await winner.sync.syncAndWait();
        await loser.sync.syncAndWait();
        const after = {
          winner: await readState(winner, accepted.taskId),
          loser: await readState(loser, accepted.taskId),
        };
        const loserEntry = await readEntry(loser, rejected.operationId);
        const serverOps = await prisma.operation.findMany({
          where: { userId: user.userId, entityId: accepted.taskId },
          orderBy: { serverSeq: 'asc' },
          select: {
            id: true,
            opType: true,
            actionType: true,
            clientId: true,
            serverSeq: true,
          },
        });
        await testInfo.attach('consume-outcome', {
          body: JSON.stringify(
            { scenario, receipt, before, after, loserEntry, serverOps },
            null,
            2,
          ),
          contentType: 'application/json',
        });
        const compacted = await loser.page.evaluate(() =>
          (
            window as unknown as { __e2eTestHelpers: CaptureHelpers }
          ).__e2eTestHelpers.compactOperationLog(),
        );
        expect(compacted).toBe(true);
        await loser.page.reload({ waitUntil: 'domcontentloaded' });
        await waitForAppReady(loser.page);
        const restarted = await readState(loser, accepted.taskId);
        await testInfo.attach('consume-after-compaction-reload', {
          body: JSON.stringify({ compacted, restarted }, null, 2),
          contentType: 'application/json',
        });
        // Characterize the unchanged protocol, including durable divergence.
        // Set expected failure only after all pipeline/recovery assertions pass:
        // fixture, upload, encryption, or compaction failures must remain errors.
        expect(restarted).toEqual(after.loser);
        test.fail(true, 'Consume-on-accept alone does not reconcile the losing device');
        expect(after.loser).toEqual(after.winner);
        expect(restarted).toEqual(after.winner);
      } finally {
        for (const client of clients) await closeClient(client);
        await prisma.$disconnect();
      }
    });
  }
});
