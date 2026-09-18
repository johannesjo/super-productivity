/**
 * Test-only publication harness for the Stage A agent-capture feasibility spike.
 *
 * It deliberately stores its queue outside Prisma's schema. This lets the
 * integration and Playwright suites exercise an atomic handoff against the real
 * operation upload service without proposing a production data model.
 * The Prisma client supplied to this helper must point at the same database as
 * SyncService's configured Prisma singleton, because the latter owns the normal
 * upload transaction that this helper wraps.
 *
 * The helper bypasses HTTP authentication, route quotas, and request deduplication.
 * It does use the real PostgreSQL transaction, state-replacement fence, upload
 * validation/conflict/sequence path, storage accounting, and virtual-device touch.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { classifyOpAgainstSyncImport, type VectorClock } from '@sp/sync-core';
import {
  latestCausalFullStateSql,
  LatestCausalFullStateRow,
  Operation,
  UploadResult,
} from '../../src/sync/sync.types';
import { SyncService } from '../../src/sync/sync.service';

// Exported so a spec can snapshot and roll back these rows when it simulates a
// server database restore. Nothing outside the tests may depend on them.
export const ACCOUNT_TABLE = 'agent_capture_spike_accounts';
export const QUEUE_TABLE = 'agent_capture_spike_queue';
const MAX_TRANSACTION_ATTEMPTS = 3;

type CaptureAccountRow = { publishedCounter: number };
type CaptureQueueRow = {
  captureId: string;
  title: string;
  notes: string | null;
  publishedOpId: string | null;
  publishedServerSeq: number | null;
};

export interface CapturePublicationReceipt {
  captureId: string;
  opId: string;
  serverSeq: number;
}

export interface PendingCapture {
  captureId: string;
  title: string;
  notes: string | null;
  /** The stable capture actor's latest published counter for this account. */
  captureCounter: number;
  /**
   * The account's data generation at read time. A preparer must carry this with
   * its candidate; `deleteAllUserData` advances it, and the ciphertext prepared
   * under the retired encryption context must not outlive that.
   *
   * It rides the queue read on purpose: consuming a capture is already an
   * authenticated read from the same server, so the preparer needs neither a
   * sync-contract field nor a client-persisted copy. Reading it here rather
   * than at publication is what makes it evidence about the candidate.
   */
  dataGeneration: number;
}

export type PublishCaptureResult =
  | { status: 'published' | 'already_published'; receipt: CapturePublicationReceipt }
  | { status: 'rejected'; error: string; errorCode?: UploadResult['errorCode'] };

export interface CapturePublicationHarness {
  initialize(): Promise<void>;
  enqueueCapture(input: {
    userId: number;
    captureId: string;
    title: string;
    notes?: string | null;
  }): Promise<PendingCapture>;
  readPendingCapture(input: {
    userId: number;
    captureId: string;
  }): Promise<PendingCapture | null>;
  readPublicationWatermark(input: { userId: number }): Promise<number>;
  publishCapture(input: {
    userId: number;
    captureId: string;
    candidate: Operation;
    lastKnownServerSeq: number;
    expectedCaptureCounter: number;
    /** The `dataGeneration` the candidate was prepared under. */
    expectedDataGeneration: number;
    /** Encrypted candidates must authenticate this current full-state op locally. */
    verifiedEncryptionOpId?: string;
  }): Promise<PublishCaptureResult>;
  readCaptureReceipt(input: {
    userId: number;
    captureId: string;
  }): Promise<CapturePublicationReceipt | null>;
  countPublishedCaptures(input: { userId: number }): Promise<number>;
  countCaptureActorOperations(input: { userId: number }): Promise<number>;
  removeCaptureRowsForUsers(input: { userIds: number[] }): Promise<void>;
}

export const getAgentCaptureActorId = (userId: number): string =>
  `agent-capture-${userId}`;

const isRetryableUploadResult = (result: UploadResult | undefined): boolean =>
  result?.error === 'Concurrent transaction conflict - please retry';

export const createAgentCapturePublicationHarness = (
  prisma: PrismaClient,
  options: {
    /** Test-only barrier after the account generation has been read under its lock. */
    afterGenerationRead?: () => Promise<void> | void;
    /** Test-only failure point: runs after the real op insert and before receipt persistence. */
    afterOperationAccepted?: () => Promise<void> | void;
    /** Test-only failure point: runs after receipt writes but before transaction commit. */
    beforeTransactionCommit?: () => Promise<void> | void;
  } = {},
): CapturePublicationHarness => {
  const initialize = async (): Promise<void> => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${ACCOUNT_TABLE} (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        published_counter INTEGER NOT NULL DEFAULT 0
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${QUEUE_TABLE} (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        capture_id TEXT NOT NULL,
        title TEXT NOT NULL,
        notes TEXT NULL,
        published_op_id TEXT NULL,
        published_server_seq INTEGER NULL,
        PRIMARY KEY (user_id, capture_id),
        CHECK ((published_op_id IS NULL) = (published_server_seq IS NULL))
      )
    `);
  };

  const ensureAccountRow = async (
    tx: Prisma.TransactionClient,
    userId: number,
  ): Promise<void> => {
    await tx.$executeRawUnsafe(
      `INSERT INTO ${ACCOUNT_TABLE} (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      userId,
    );
  };

  const readAccountForUpdate = async (
    tx: Prisma.TransactionClient,
    userId: number,
  ): Promise<CaptureAccountRow> => {
    const rows = await tx.$queryRawUnsafe<CaptureAccountRow[]>(
      `SELECT published_counter AS "publishedCounter" FROM ${ACCOUNT_TABLE} WHERE user_id = $1 FOR UPDATE`,
      userId,
    );
    const row = rows[0];
    if (!row) throw new Error(`Missing capture account row for user ${userId}`);
    return row;
  };

  const readQueueForUpdate = async (
    tx: Prisma.TransactionClient,
    userId: number,
    captureId: string,
  ): Promise<CaptureQueueRow | null> => {
    const rows = await tx.$queryRawUnsafe<CaptureQueueRow[]>(
      `SELECT capture_id AS "captureId", title, notes, published_op_id AS "publishedOpId", published_server_seq AS "publishedServerSeq"
       FROM ${QUEUE_TABLE}
       WHERE user_id = $1 AND capture_id = $2
       FOR UPDATE`,
      userId,
      captureId,
    );
    return rows[0] ?? null;
  };

  type PublishInput = Parameters<CapturePublicationHarness['publishCapture']>[0];
  type PublicationContext = {
    input: PublishInput;
    stagedReceipt?: CapturePublicationReceipt;
    rejection?: PublishCaptureResult;
  };

  /**
   * The override surrounds SyncService.uploadOps' own callback. That means the
   * queue receipt, normal state-replacement fence, operation insert, device
   * touch, and storage accounting all share the exact transaction the server
   * already uses for an ordinary upload.
   */
  class PublicationSyncService extends SyncService {
    constructor(private readonly publication: PublicationContext) {
      super();
    }

    protected override async runUploadTransaction<T>(
      work: (tx: Prisma.TransactionClient) => Promise<T>,
      transactionOptions?: {
        maxWait?: number;
        timeout?: number;
        isolationLevel?: Prisma.TransactionIsolationLevel;
      },
    ): Promise<T> {
      return super.runUploadTransaction(async (tx) => {
        const { input } = this.publication;
        // Check the generation FIRST: between `deleteAllUserData` and the
        // re-upload that follows it there is no capture row, no sync state and
        // no replacement boundary left to disagree with, so every later check
        // would pass a candidate carrying ciphertext from the retired
        // encryption context. This is the only fence that survives the wipe,
        // because the counter lives on the user row.
        // Match the ordinary upload/reset lock order. This synchronizes the
        // generation read with a wipe without taking `users` ahead of the
        // upload path's existing `user_sync_state` lock.
        await this.lockUserSyncStateForUpdate(tx, input.userId);
        const user = await tx.user.findUniqueOrThrow({
          where: { id: input.userId },
          select: { syncDataGeneration: true },
        });
        if (user.syncDataGeneration !== input.expectedDataGeneration) {
          this.publication.rejection = {
            status: 'rejected',
            error: 'Capture was prepared for a superseded account state',
          };
          return undefined as T;
        }
        await options.afterGenerationRead?.();
        await ensureAccountRow(tx, input.userId);
        const account = await readAccountForUpdate(tx, input.userId);
        const capture = await readQueueForUpdate(tx, input.userId, input.captureId);
        if (!capture) {
          this.publication.rejection = {
            status: 'rejected',
            error: 'Capture is missing or expired',
          };
          return undefined as T;
        }
        if (capture.publishedOpId !== null && capture.publishedServerSeq !== null) {
          this.publication.stagedReceipt = {
            captureId: capture.captureId,
            opId: capture.publishedOpId,
            serverSeq: capture.publishedServerSeq,
          };
          return undefined as T;
        }
        if (account.publishedCounter !== input.expectedCaptureCounter) {
          this.publication.rejection = {
            status: 'rejected',
            error:
              'Capture candidate is stale; rebuild it from the current publication watermark',
          };
          return undefined as T;
        }

        const captureActor = getAgentCaptureActorId(input.userId);
        if (input.candidate.clientId !== captureActor) {
          this.publication.rejection = {
            status: 'rejected',
            error: 'Capture candidate has the wrong publisher identity',
          };
          return undefined as T;
        }
        if (input.candidate.vectorClock[captureActor] !== account.publishedCounter + 1) {
          this.publication.rejection = {
            status: 'rejected',
            error: 'Capture candidate does not advance the publication watermark',
          };
          return undefined as T;
        }

        const occupied = await tx.operation.findUnique({
          where: { id: input.candidate.id },
          select: { id: true },
        });
        if (occupied) {
          this.publication.rejection = {
            status: 'rejected',
            error: 'Capture candidate operation ID is already occupied',
          };
          return undefined as T;
        }

        await work(tx);
        const acceptedOperation = await tx.operation.findFirst({
          where: {
            id: input.candidate.id,
            userId: input.userId,
            clientId: captureActor,
          },
          select: { id: true, serverSeq: true, clientId: true, vectorClock: true },
        });
        if (!acceptedOperation) return undefined as T;

        // The ordinary callback has acquired the per-user replacement lock and
        // inserted the operation. Check the actual stored/pruned clock before
        // committing: a fresh caller cursor is not evidence that this candidate
        // was prepared from the replacement. Throwing rolls back the normal op,
        // sequence, device and storage writes as well as any capture bookkeeping.
        const syncState = await tx.userSyncState.findUniqueOrThrow({
          where: { userId: input.userId },
          select: {
            latestStateReplacementSeq: true,
            latestStateReplacementClientId: true,
            latestStateReplacementVectorClock: true,
          },
        });
        const [latestFullState] = await tx.$queryRaw<LatestCausalFullStateRow[]>(
          latestCausalFullStateSql(input.userId),
        );
        // A causal repair supersedes the import as the applied-state baseline.
        // Pruning protects that repair's author, not the older import's author.
        // Never fall back to a retained row older than the replacement fence.
        const baselineSeq = Math.max(
          syncState.latestStateReplacementSeq ?? 0,
          latestFullState?.server_seq ?? 0,
        );
        if (baselineSeq) {
          const replacement =
            baselineSeq === syncState.latestStateReplacementSeq &&
            syncState.latestStateReplacementClientId !== null &&
            syncState.latestStateReplacementVectorClock !== null
              ? {
                  clientId: syncState.latestStateReplacementClientId,
                  vectorClock: syncState.latestStateReplacementVectorClock,
                }
              : await tx.operation.findUnique({
                  where: {
                    userId_serverSeq: {
                      userId: input.userId,
                      serverSeq: baselineSeq,
                    },
                  },
                  select: { clientId: true, vectorClock: true },
                });
          // Still refuse when neither source has it: a row written before the
          // evidence columns existed and pruned before any upload backfilled
          // them leaves no causal identity. Do not read the missing boundary as
          // an absent one — that would publish work prepared before the import.
          const error = !replacement
            ? 'Capture state replacement is no longer retained'
            : !classifyOpAgainstSyncImport(
                  {
                    clientId: acceptedOperation.clientId,
                    vectorClock: acceptedOperation.vectorClock as unknown as VectorClock,
                  },
                  {
                    clientId: replacement.clientId,
                    vectorClock: replacement.vectorClock as unknown as VectorClock,
                  },
                ).shouldKeep
              ? 'Capture candidate does not include the latest state replacement'
              : undefined;
          if (error) {
            this.publication.rejection = { status: 'rejected', error };
            throw new Error(error);
          }
        }

        if (input.candidate.isPayloadEncrypted) {
          // The client decrypted this baseline with the SAME key used for the
          // candidate. Recheck its identity under the upload's replacement lock:
          // the generation alone also passes a retired-key read inside a wipe.
          const baseline = baselineSeq
            ? await tx.operation.findUnique({
                where: {
                  userId_serverSeq: { userId: input.userId, serverSeq: baselineSeq },
                },
                select: { id: true, isPayloadEncrypted: true },
              })
            : null;
          if (
            !baseline?.isPayloadEncrypted ||
            baseline.id !== input.verifiedEncryptionOpId
          ) {
            const error =
              'Capture requires verification of the current encrypted baseline';
            this.publication.rejection = { status: 'rejected', error };
            throw new Error(error);
          }
        }

        await options.afterOperationAccepted?.();
        await tx.$executeRawUnsafe(
          `UPDATE ${ACCOUNT_TABLE} SET published_counter = published_counter + 1 WHERE user_id = $1`,
          input.userId,
        );
        await tx.$executeRawUnsafe(
          `UPDATE ${QUEUE_TABLE}
           SET published_op_id = $3, published_server_seq = $4, title = '', notes = NULL
           WHERE user_id = $1 AND capture_id = $2`,
          input.userId,
          input.captureId,
          acceptedOperation.id,
          acceptedOperation.serverSeq,
        );
        this.publication.stagedReceipt = {
          captureId: input.captureId,
          opId: acceptedOperation.id,
          serverSeq: acceptedOperation.serverSeq,
        };
        await options.beforeTransactionCommit?.();
        return undefined as T;
      }, transactionOptions);
    }
  }

  const enqueueCapture: CapturePublicationHarness['enqueueCapture'] = async (input) => {
    await initialize();
    return prisma.$transaction(async (tx) => {
      await ensureAccountRow(tx, input.userId);
      await tx.$executeRawUnsafe(
        `INSERT INTO ${QUEUE_TABLE} (user_id, capture_id, title, notes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, capture_id) DO NOTHING`,
        input.userId,
        input.captureId,
        input.title,
        input.notes ?? null,
      );
      // Keep this lock order identical to publication: account counter first,
      // then capture row. Otherwise an enqueue and publish can deadlock.
      const account = await readAccountForUpdate(tx, input.userId);
      const capture = await readQueueForUpdate(tx, input.userId, input.captureId);
      if (!capture) throw new Error(`Capture ${input.captureId} was not persisted`);
      if (capture.title !== input.title || capture.notes !== (input.notes ?? null)) {
        throw new Error(`Capture ${input.captureId} is immutable once queued`);
      }
      const user = await tx.user.findUniqueOrThrow({
        where: { id: input.userId },
        select: { syncDataGeneration: true },
      });
      return {
        captureId: capture.captureId,
        title: capture.title,
        notes: capture.notes,
        captureCounter: account.publishedCounter,
        dataGeneration: user.syncDataGeneration,
      };
    });
  };

  const readPendingCapture: CapturePublicationHarness['readPendingCapture'] = async (
    input,
  ) => {
    await initialize();
    const [accounts, captures, user] = await Promise.all([
      prisma.$queryRawUnsafe<CaptureAccountRow[]>(
        `SELECT published_counter AS "publishedCounter" FROM ${ACCOUNT_TABLE} WHERE user_id = $1`,
        input.userId,
      ),
      prisma.$queryRawUnsafe<CaptureQueueRow[]>(
        `SELECT capture_id AS "captureId", title, notes, published_op_id AS "publishedOpId", published_server_seq AS "publishedServerSeq"
         FROM ${QUEUE_TABLE} WHERE user_id = $1 AND capture_id = $2`,
        input.userId,
        input.captureId,
      ),
      prisma.user.findUnique({
        where: { id: input.userId },
        select: { syncDataGeneration: true },
      }),
    ]);
    const capture = captures[0];
    if (!capture || capture.publishedOpId !== null) return null;
    return {
      captureId: capture.captureId,
      title: capture.title,
      notes: capture.notes,
      captureCounter: accounts[0]?.publishedCounter ?? 0,
      dataGeneration: user?.syncDataGeneration ?? 0,
    };
  };

  const readPublicationWatermark: CapturePublicationHarness['readPublicationWatermark'] =
    async ({ userId }) => {
      await initialize();
      const rows = await prisma.$queryRawUnsafe<CaptureAccountRow[]>(
        `SELECT published_counter AS "publishedCounter" FROM ${ACCOUNT_TABLE} WHERE user_id = $1`,
        userId,
      );
      return rows[0]?.publishedCounter ?? 0;
    };

  const publishCapture: CapturePublicationHarness['publishCapture'] = async (input) => {
    await initialize();
    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt++) {
      const publication: PublicationContext = { input };
      const uploadResults = await new PublicationSyncService(publication).uploadOps(
        input.userId,
        getAgentCaptureActorId(input.userId),
        [input.candidate],
        undefined,
        undefined,
        undefined,
        false,
        input.lastKnownServerSeq,
      );
      const receipt = publication.stagedReceipt;
      if (
        receipt &&
        (uploadResults.length === 0 || uploadResults.some(({ accepted }) => accepted))
      ) {
        return {
          status: uploadResults.length === 0 ? 'already_published' : 'published',
          receipt,
        };
      }
      if (publication.rejection) return publication.rejection;
      const uploadResult = uploadResults[0];
      if (attempt < MAX_TRANSACTION_ATTEMPTS && isRetryableUploadResult(uploadResult))
        continue;
      return {
        status: 'rejected',
        error: uploadResult?.error ?? 'Operation was rejected',
        errorCode: uploadResult?.errorCode,
      };
    }
    throw new Error('Unreachable publication retry state');
  };

  const readCaptureReceipt: CapturePublicationHarness['readCaptureReceipt'] = async (
    input,
  ) => {
    await initialize();
    const rows = await prisma.$queryRawUnsafe<CaptureQueueRow[]>(
      `SELECT capture_id AS "captureId", title, notes, published_op_id AS "publishedOpId", published_server_seq AS "publishedServerSeq"
       FROM ${QUEUE_TABLE} WHERE user_id = $1 AND capture_id = $2`,
      input.userId,
      input.captureId,
    );
    const capture = rows[0];
    return capture &&
      capture.publishedOpId !== null &&
      capture.publishedServerSeq !== null
      ? {
          captureId: capture.captureId,
          opId: capture.publishedOpId,
          serverSeq: capture.publishedServerSeq,
        }
      : null;
  };

  const countPublishedCaptures: CapturePublicationHarness['countPublishedCaptures'] =
    async ({ userId }) => {
      await initialize();
      const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM ${QUEUE_TABLE} WHERE user_id = $1 AND published_op_id IS NOT NULL`,
        userId,
      );
      return Number(rows[0]?.count ?? 0n);
    };

  const countCaptureActorOperations: CapturePublicationHarness['countCaptureActorOperations'] =
    async ({ userId }) =>
      prisma.operation.count({
        where: { userId, clientId: getAgentCaptureActorId(userId) },
      });

  const removeCaptureRowsForUsers: CapturePublicationHarness['removeCaptureRowsForUsers'] =
    async ({ userIds }) => {
      if (userIds.length === 0) return;
      await initialize();
      await prisma.$executeRawUnsafe(
        `DELETE FROM ${QUEUE_TABLE} WHERE user_id = ANY($1::int[])`,
        userIds,
      );
      await prisma.$executeRawUnsafe(
        `DELETE FROM ${ACCOUNT_TABLE} WHERE user_id = ANY($1::int[])`,
        userIds,
      );
    };

  return {
    initialize,
    enqueueCapture,
    readPendingCapture,
    readPublicationWatermark,
    publishCapture,
    readCaptureReceipt,
    countPublishedCaptures,
    countCaptureActorOperations,
    removeCaptureRowsForUsers,
  };
};
