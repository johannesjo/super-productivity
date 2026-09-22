import { PrismaClient } from '@prisma/client';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, expect } from '../../fixtures/supersync.fixture';
import {
  closeClient,
  createSimulatedClient,
  createTestUser,
  deleteTask,
  getSuperSyncConfig,
  renameTask,
  SUPERSYNC_BASE_URL,
  type SimulatedE2EClient,
} from '../../utils/supersync-helpers';
import { assertNoRuntimeBrowserErrors } from '../../utils/runtime-errors';
import {
  createAgentCapturePublicationHarness,
  getAgentCaptureActorId,
} from '../../../packages/super-sync-server/tests/integration/agent-capture-publication.harness';

const CAPTURE_TABLES = [
  'operations',
  'user_sync_state',
  'sync_devices',
  'agent_capture_accounts',
  'agent_captures',
] as const;

interface CaptureAccountSnapshot {
  userId: number;
  user: { syncDataGeneration: number; storageUsedBytes: bigint };
  tables: { table: (typeof CAPTURE_TABLES)[number]; rows: string }[];
}

// Snapshot exact database rows without advancing generation or replacing state.
// Table identifiers are fixed here; account IDs and row values are bound parameters.
const snapshotAccount = (
  prisma: PrismaClient,
  userId: number,
): Promise<CaptureAccountSnapshot> =>
  prisma.$transaction(
    async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { syncDataGeneration: true, storageUsedBytes: true },
      });
      const tables: { table: (typeof CAPTURE_TABLES)[number]; rows: string }[] = [];
      for (const table of CAPTURE_TABLES) {
        const [data] = await tx.$queryRawUnsafe<{ rows: string }[]>(
          `SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb)::text AS rows FROM ${table} t WHERE user_id = $1`,
          userId,
        );
        tables.push({ table, rows: data.rows });
      }
      return { userId, user, tables };
    },
    { isolationLevel: 'RepeatableRead' },
  );

const restoreAccount = (
  prisma: PrismaClient,
  snapshot: CaptureAccountSnapshot,
): Promise<void> =>
  prisma.$transaction(async (tx) => {
    for (const { table, rows } of snapshot.tables) {
      await tx.$executeRawUnsafe(
        `DELETE FROM ${table} WHERE user_id = $1`,
        snapshot.userId,
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO ${table} SELECT * FROM jsonb_populate_recordset(NULL::${table}, $1::jsonb)`,
        rows,
      );
    }
    await tx.user.update({ where: { id: snapshot.userId }, data: snapshot.user });
  });

const blockBackgroundSync = (): void => {
  const flags = globalThis as typeof globalThis & {
    __SP_E2E_BLOCK_AUTO_SYNC?: boolean;
    __SP_E2E_BLOCK_IMMEDIATE_UPLOAD?: boolean;
    __SP_E2E_BLOCK_WS_DOWNLOAD?: boolean;
  };
  flags.__SP_E2E_BLOCK_AUTO_SYNC = true;
  flags.__SP_E2E_BLOCK_IMMEDIATE_UPLOAD = true;
  flags.__SP_E2E_BLOCK_WS_DOWNLOAD = true;
};

/**
 * Both halves of the restore story: the cases that characterize an unresolved
 * restore with delivery left enabled, and the case that verifies resumption
 * after the operator records an outcome for the restored capture.
 * Owns and restarts its backend; run only with a dedicated local port/database.
 */
test.describe.serial('@supersync Agent capture database restore', () => {
  test.skip(
    !process.env.DATABASE_URL || process.env.CAPTURE_RESTORE_E2E !== 'true',
    'requires an isolated database and CAPTURE_RESTORE_E2E=true',
  );
  let backend: ChildProcess | undefined;
  let serverDir: string;
  const startBackend = async (
    frontendUrl: string,
    { captureDelivery = true }: { captureDelivery?: boolean } = {},
  ): Promise<void> => {
    const url = new URL(SUPERSYNC_BASE_URL);
    expect(url.hostname).toBe('127.0.0.1');
    expect(url.port).not.toBe('');
    backend = spawn(
      process.execPath,
      [
        resolve('node_modules/ts-node/dist/bin.js'),
        '--transpile-only',
        '--project',
        resolve('packages/super-sync-server/tsconfig.json'),
        resolve('packages/super-sync-server/src/index.ts'),
      ],
      {
        cwd: serverDir,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          HOST: url.hostname,
          PORT: url.port,
          CORS_ORIGINS: new URL(frontendUrl).origin,
          TEST_MODE: 'true',
          TEST_MODE_CONFIRM: 'yes-i-understand-the-risks',
          JWT_SECRET: 'capture-restore-isolated-test-secret',
          ENABLE_AGENT_CAPTURE_DELIVERY: captureDelivery ? 'true' : 'false',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    await new Promise<void>((ready, reject) => {
      backend!.once('error', reject);
      backend!.once('exit', (code) =>
        reject(new Error(`Capture test server exited: ${code}`)),
      );
      backend!.stderr!.on('data', (data: Buffer) => process.stderr.write(data));
      backend!.stdout!.on('data', (data: Buffer) => {
        if (data.toString().includes('SuperSync Server is running!')) ready();
      });
    });
  };
  const stopBackend = async (): Promise<void> => {
    if (backend && backend.exitCode === null) {
      const stopped = once(backend, 'exit');
      backend.kill('SIGTERM');
      await stopped;
    }
    backend = undefined;
  };
  test.beforeAll(async ({ baseURL }) => {
    serverDir = mkdtempSync(join(tmpdir(), 'capture-restore-server-'));
    await startBackend(baseURL!);
  });
  test.afterAll(async () => {
    await stopBackend();
    if (serverDir) rmSync(serverDir, { recursive: true, force: true });
  });

  for (const change of ['edit', 'delete'] as const) {
    test(`characterizes republication after restoring away a capture ${change}`, async ({
      browser,
      baseURL,
      testRunId,
    }) => {
      const prisma = new PrismaClient();
      const queue = createAgentCapturePublicationHarness(prisma);
      let client: SimulatedE2EClient | undefined;
      let freshClient: SimulatedE2EClient | undefined;
      try {
        const user = await createTestUser(`${testRunId}-restore-${change}`);
        client = await createSimulatedClient(
          browser,
          baseURL!,
          'Restore-Capture',
          testRunId,
        );
        await client.sync.setupSuperSync(getSuperSyncConfig(user));
        await client.sync.syncAndWait();
        await client.context.addInitScript(blockBackgroundSync);
        await client.page.evaluate(blockBackgroundSync);
        await client.page.goto('/#/project/INBOX_PROJECT/tasks');
        const captureId = `restore-${change}-${testRunId}`;
        const title = `Capture before restore ${testRunId}`;
        const edited = `${title} edited`;
        await queue.enqueueCapture({ userId: user.userId, captureId, title });
        const snapshot = await snapshotAccount(prisma, user.userId);
        await client.sync.syncAndWait();
        const receipt = await queue.readCaptureReceipt({
          userId: user.userId,
          captureId,
        });
        expect(receipt).not.toBeNull();
        await expect(client.page.locator('task').filter({ hasText: title })).toHaveCount(
          1,
        );
        if (change === 'edit') await renameTask(client, title, edited);
        else await deleteTask(client, title);
        await client.sync.syncAndWait();

        await client.context.setOffline(true);
        await stopBackend();
        await restoreAccount(prisma, snapshot);
        expect(
          await queue.readCaptureReceipt({ userId: user.userId, captureId }),
        ).toBeNull();
        expect(
          await queue.readPendingCapture({ userId: user.userId, captureId }),
        ).not.toBeNull();
        expect(await queue.countCaptureActorOperations({ userId: user.userId })).toBe(0);
        await startBackend(baseURL!);
        await client.context.setOffline(false);
        const publications: unknown[] = [];
        await client.page.route('**/api/sync/captures/publish', async (route) => {
          const response = await route.fetch();
          publications.push(await response.json());
          await route.fulfill({ response });
        });
        await client.sync.syncAndWait({ useLocal: true });
        await client.sync.syncAndWait({ useLocal: true });
        // The surviving device retains the edit/deletion despite a new CREATE.
        await expect(client.page.locator('task').filter({ hasText: edited })).toHaveCount(
          change === 'edit' ? 1 : 0,
        );
        await expect(client.page.locator('task').filter({ hasText: title })).toHaveCount(
          change === 'edit' ? 1 : 0,
        );
        expect(publications).toEqual([expect.objectContaining({ status: 'published' })]);
        const restoredReceipt = await queue.readCaptureReceipt({
          userId: user.userId,
          captureId,
        });
        expect(restoredReceipt).not.toBeNull();
        expect(restoredReceipt!.opId).not.toBe(receipt!.opId);
        expect(await queue.countCaptureActorOperations({ userId: user.userId })).toBe(1);
        // A fresh device instead recovers the historical title from republication.
        freshClient = await createSimulatedClient(
          browser,
          baseURL!,
          'Fresh-After-Restore',
          testRunId,
        );
        await freshClient.sync.setupSuperSync(getSuperSyncConfig(user));
        await freshClient.sync.syncAndWait();
        await freshClient.page.goto('/#/project/INBOX_PROJECT/tasks');
        await expect(
          freshClient.page.locator('task').filter({ hasText: title }),
        ).toHaveCount(1);
        await expect(
          freshClient.page.locator('task').filter({ hasText: edited }),
        ).toHaveCount(0);
      } finally {
        if (freshClient) await closeClient(freshClient);
        if (client) await closeClient(client);
        await prisma.$disconnect();
      }
    });
  }

  /**
   * The resolved counterpart of the characterizations above: the operator records
   * an outcome for the restored capture while delivery is paused, and resumption
   * then produces no second publication and no recreated task.
   *
   * Only the `edit` variant runs. The distinguishing evidence is server-side plus
   * fresh-client and is identical for `delete`; `edit` additionally allows the
   * positive "the surviving task is still there" assertion below.
   *
   * What this does NOT establish: **the user's edit is not preserved.** The
   * surviving device keeps the edited title only locally — the restore rolled that
   * operation back server-side and the client does not re-upload it — so the fresh
   * device at the end holds NO task at all for this capture (both the original and
   * the edited title count 0 there). Resolution prevents a zombie recreation; it
   * does not recover data the restore destroyed.
   */
  test('resumes safely after the operator resolves a restored capture', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    const prisma = new PrismaClient();
    const queue = createAgentCapturePublicationHarness(prisma);
    let client: SimulatedE2EClient | undefined;
    let freshClient: SimulatedE2EClient | undefined;
    try {
      const user = await createTestUser(`${testRunId}-restore-resolved`);
      client = await createSimulatedClient(
        browser,
        baseURL!,
        'Resolved-Capture',
        testRunId,
      );
      await client.sync.setupSuperSync(getSuperSyncConfig(user));
      await client.sync.syncAndWait();
      await client.context.addInitScript(blockBackgroundSync);
      await client.page.evaluate(blockBackgroundSync);
      await client.page.goto('/#/project/INBOX_PROJECT/tasks');
      const captureId = `restore-resolved-${testRunId}`;
      const title = `Capture before restore ${testRunId}`;
      const edited = `${title} edited`;
      await queue.enqueueCapture({ userId: user.userId, captureId, title });
      const snapshot = await snapshotAccount(prisma, user.userId);
      await client.sync.syncAndWait();
      expect(
        await queue.readCaptureReceipt({ userId: user.userId, captureId }),
      ).not.toBeNull();
      await expect(client.page.locator('task').filter({ hasText: title })).toHaveCount(1);
      await renameTask(client, title, edited);
      await client.sync.syncAndWait();

      await client.context.setOffline(true);
      await stopBackend();
      await restoreAccount(prisma, snapshot);

      // Phase 1: the restored starting point. The receipt, the accepted operation
      // and the publisher counter rolled back together with the queue row, and the
      // resumption gate is closed on the item nothing in the database can decide.
      expect(
        await queue.readCaptureReceipt({ userId: user.userId, captureId }),
      ).toBeNull();
      expect(
        await queue.readPendingCapture({ userId: user.userId, captureId }),
      ).not.toBeNull();
      expect(await queue.countCaptureActorOperations({ userId: user.userId })).toBe(0);
      expect(
        await queue.readUnresolvedCaptureBacklog({ userIds: [user.userId] }),
      ).toEqual([{ userId: user.userId, unresolved: 1 }]);

      // Phase 2: resume with delivery paused, as the runbook's step 2 requires.
      // Ordinary sync must keep working while the hold is in place.
      await startBackend(baseURL!, { captureDelivery: false });
      await client.context.setOffline(false);
      const queueReads: string[] = [];
      const publications: unknown[] = [];
      await client.page.route('**/api/sync/captures/pending', async (route) => {
        queueReads.push(route.request().url());
        await route.continue();
      });
      await client.page.route('**/api/sync/captures/publish', async (route) => {
        const response = await route.fetch();
        publications.push(await response.json());
        await route.fulfill({ response });
      });
      await client.sync.syncAndWait({ useLocal: true });
      expect(publications).toEqual([]);
      // The paused server advertises capabilities.captureDelivery=false, so the
      // client stops before the queue read rather than being refused at it.
      expect(queueReads).toEqual([]);
      expect(await queue.countCaptureActorOperations({ userId: user.userId })).toBe(0);
      expect(
        await queue.readUnresolvedCaptureBacklog({ userIds: [user.userId] }),
      ).toEqual([{ userId: user.userId, unresolved: 1 }]);
      // Degrading gracefully: a paused deployment is not a client-visible failure.
      assertNoRuntimeBrowserErrors(client.runtimeErrors, 'Resolved-Capture');
      await client.context.setOffline(true);
      await stopBackend();

      // Phase 3: the operator records the established outcome, with delivery down —
      // the runbook allows resolution only while it is paused. Called directly on
      // the production service the CLI wraps, so the real transaction and watermark
      // arithmetic run here; the CLI would only add argv parsing.
      expect(
        await queue.resolveCapture({
          userId: user.userId,
          captureId,
          resolution: 'delivered_out_of_band',
        }),
      ).toEqual({
        status: 'resolved',
        resolution: 'delivered_out_of_band',
        publicationWatermark: 1,
      });
      expect(
        await queue.readUnresolvedCaptureBacklog({ userIds: [user.userId] }),
      ).toEqual([]);

      // Phase 4: clear the pause deliberately and replay the characterization's two
      // sync cycles — its second cycle is the one that republished.
      await startBackend(baseURL!, { captureDelivery: true });
      await client.context.setOffline(false);
      await client.sync.syncAndWait({ useLocal: true });
      await client.sync.syncAndWait({ useLocal: true });
      expect(publications).toEqual([]);
      expect(await queue.countCaptureActorOperations({ userId: user.userId })).toBe(0);
      // Terminal without an invented receipt, and terminal for delivery: no
      // publisher is handed this capture again.
      expect(
        await queue.readCaptureReceipt({ userId: user.userId, captureId }),
      ).toBeNull();
      expect(
        await queue.readPendingCapture({ userId: user.userId, captureId }),
      ).toBeNull();
      await expect(client.page.locator('task').filter({ hasText: edited })).toHaveCount(
        1,
      );
      // `hasText` matches substrings, so the edited task satisfies this filter too.
      // The count stays 1 only while no second task carrying the original title was
      // recreated next to it.
      await expect(client.page.locator('task').filter({ hasText: title })).toHaveCount(1);

      // Phase 5: a later capture publishes above the reclaimed watermark. This is
      // also the negative control for phase 4 — it proves publication still works
      // on this deployment, so the empty array above is a refusal and not a dead
      // delivery path. Keep the two phases in the same test for that reason.
      const nextCaptureId = `after-recovery-${testRunId}`;
      const nextTitle = `Capture after recovery ${testRunId}`;
      await queue.enqueueCapture({
        userId: user.userId,
        captureId: nextCaptureId,
        title: nextTitle,
      });
      // The client is handed the reclaimed watermark, not the rolled-back 0.
      expect(
        await queue.readPendingCapture({ userId: user.userId, captureId: nextCaptureId }),
      ).toMatchObject({ captureCounter: 1 });
      await client.sync.syncAndWait({ useLocal: true });
      expect(publications).toEqual([expect.objectContaining({ status: 'published' })]);
      const nextReceipt = await queue.readCaptureReceipt({
        userId: user.userId,
        captureId: nextCaptureId,
      });
      expect(nextReceipt).not.toBeNull();
      const publishedOp = await prisma.operation.findUniqueOrThrow({
        where: { id: nextReceipt!.opId },
      });
      // Entry 2, not the delivered 1: the ordinary client preparation path minted
      // this clock from the reclaimed watermark.
      expect(publishedOp.vectorClock).toMatchObject({
        [getAgentCaptureActorId(user.userId)]: 2,
      });
      expect(await queue.countCaptureActorOperations({ userId: user.userId })).toBe(1);
      await expect(
        client.page.locator('task').filter({ hasText: nextTitle }),
      ).toHaveCount(1);

      // Phase 6: one fresh device at the end. The sharp inversion of the
      // characterization, which recovers the original title here.
      freshClient = await createSimulatedClient(
        browser,
        baseURL!,
        'Fresh-After-Resolution',
        testRunId,
      );
      await freshClient.sync.setupSuperSync(getSuperSyncConfig(user));
      await freshClient.sync.syncAndWait();
      await freshClient.page.goto('/#/project/INBOX_PROJECT/tasks');
      // Load-bearing and asserted first: without a hydrated post-recovery task the
      // two zero counts below would also pass on a client that failed to hydrate.
      await expect(
        freshClient.page.locator('task').filter({ hasText: nextTitle }),
      ).toHaveCount(1);
      // Nothing was recreated from the resolved capture — and nothing was recovered
      // either. The edit lives only on the surviving device.
      await expect(
        freshClient.page.locator('task').filter({ hasText: title }),
      ).toHaveCount(0);
      await expect(
        freshClient.page.locator('task').filter({ hasText: edited }),
      ).toHaveCount(0);
    } finally {
      if (freshClient) await closeClient(freshClient);
      if (client) await closeClient(client);
      await prisma.$disconnect();
    }
  });
});
