/**
 * Internal publication-before-application path for agent capture.
 * Publication and its terminal receipt share the ordinary upload transaction.
 * Assistant submission is separate; authenticated app delivery routes call this service.
 * The supplied client must use the same database as SyncService's singleton.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { classifyOpAgainstSyncImport, type VectorClock } from '@sp/sync-core';
import {
  latestCausalFullStateSql,
  LatestCausalFullStateRow,
  Operation,
  UploadResult,
} from './sync.types';
import { SyncService } from './sync.service';

const MAX_TRANSACTION_ATTEMPTS = 3;

type CaptureAccountRow = { publishedCounter: number };
type CaptureQueueRow = {
  captureId: string;
  title: string;
  notes: string | null;
  publishedOpId: string | null;
  publishedServerSeq: number | null;
  resolution: string | null;
};

/**
 * Terminal outcomes an operator records during recovery, when a restored
 * pending row's delivery cannot be read from the restored database itself.
 * `delivered_out_of_band` reclaims the publisher clock value that the lost
 * publication already consumed on devices; `discarded_by_user` consumed none.
 */
export const CAPTURE_RECOVERY_RESOLUTIONS = [
  'delivered_out_of_band',
  'discarded_by_user',
] as const;
export type CaptureRecoveryResolution = (typeof CAPTURE_RECOVERY_RESOLUTIONS)[number];

export const isCaptureRecoveryResolution = (
  value: unknown,
): value is CaptureRecoveryResolution =>
  CAPTURE_RECOVERY_RESOLUTIONS.includes(value as CaptureRecoveryResolution);

export type ResolveCaptureResult =
  | {
      status: 'resolved' | 'already_resolved';
      resolution: CaptureRecoveryResolution;
      publicationWatermark: number;
    }
  | { status: 'already_published'; receipt: CapturePublicationReceipt }
  | { status: 'missing' };

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

export interface PendingCaptureDelivery extends PendingCapture {
  publisherClientId: string;
  encryptionBaseline?: { opId: string; serverSeq: number };
}

export type PublishCaptureResult =
  | { status: 'published' | 'already_published'; receipt: CapturePublicationReceipt }
  | { status: 'rejected'; error: string; errorCode?: UploadResult['errorCode'] };

export interface CapturePublicationService {
  readNextPendingCapture(input: {
    userId: number;
  }): Promise<PendingCaptureDelivery | null>;
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
    expectedDataGeneration: number;
    /** Encrypted candidates must authenticate this current full-state op locally. */
    verifiedEncryptionOpId?: string;
  }): Promise<PublishCaptureResult>;
  readCaptureReceipt(input: {
    userId: number;
    captureId: string;
  }): Promise<CapturePublicationReceipt | null>;
  /**
   * Operator recovery command, never called by delivery. It records an outcome
   * established outside this database; it cannot derive one from these rows.
   */
  resolveCapture(input: {
    userId: number;
    captureId: string;
    resolution: CaptureRecoveryResolution;
  }): Promise<ResolveCaptureResult>;
  /** The resumption gate: capture delivery stays paused while this is non-empty. */
  readUnresolvedCaptureBacklog(input?: {
    userIds?: number[];
  }): Promise<Array<{ userId: number; unresolved: number }>>;
}

export const getAgentCaptureActorId = (userId: number): string =>
  `agent-capture-${userId}`;

const isRetryableUploadResult = (result: UploadResult | undefined): boolean =>
  result?.error === 'Concurrent transaction conflict - please retry';

export const createCapturePublicationService = (
  prisma: PrismaClient,
): CapturePublicationService => {
  const ensureAccountRow = async (
    tx: Prisma.TransactionClient,
    userId: number,
  ): Promise<void> => {
    await tx.$executeRaw`
      INSERT INTO agent_capture_accounts (user_id) VALUES (${userId})
      ON CONFLICT (user_id) DO NOTHING
    `;
  };

  const readAccountForUpdate = async (
    tx: Prisma.TransactionClient,
    userId: number,
  ): Promise<CaptureAccountRow> => {
    const rows = await tx.$queryRaw<CaptureAccountRow[]>`
      SELECT published_counter AS "publishedCounter" FROM agent_capture_accounts
      WHERE user_id = ${userId} FOR UPDATE
    `;
    const row = rows[0];
    if (!row) throw new Error(`Missing capture account row for user ${userId}`);
    return row;
  };

  const readQueueForUpdate = async (
    tx: Prisma.TransactionClient,
    userId: number,
    captureId: string,
  ): Promise<CaptureQueueRow | null> => {
    const rows = await tx.$queryRaw<CaptureQueueRow[]>`
      SELECT capture_id AS "captureId", title, notes, published_op_id AS "publishedOpId",
        published_server_seq AS "publishedServerSeq", resolution
      FROM agent_captures
      WHERE user_id = ${userId} AND capture_id = ${captureId}
      FOR UPDATE
    `;
    return rows[0] ?? null;
  };

  type PublishInput = Parameters<CapturePublicationService['publishCapture']>[0];
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
      return prisma.$transaction(async (tx) => {
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
        if (capture.resolution !== null) {
          // Recovery already closed this item. Republishing would recreate work
          // the operator established as delivered, or work the user discarded.
          this.publication.rejection = {
            status: 'rejected',
            error: 'Capture was resolved during recovery and cannot be published',
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

        await tx.agentCaptureAccount.update({
          where: { userId: input.userId },
          data: { publishedCounter: { increment: 1 } },
        });
        await tx.agentCapture.update({
          where: {
            userId_captureId: { userId: input.userId, captureId: input.captureId },
          },
          data: {
            publishedOpId: acceptedOperation.id,
            publishedServerSeq: acceptedOperation.serverSeq,
            title: '',
            notes: null,
          },
        });
        this.publication.stagedReceipt = {
          captureId: input.captureId,
          opId: acceptedOperation.id,
          serverSeq: acceptedOperation.serverSeq,
        };
        return undefined as T;
      }, transactionOptions);
    }
  }

  const publishCapture: CapturePublicationService['publishCapture'] = async (input) => {
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

  const readPendingCapture: CapturePublicationService['readPendingCapture'] = async (
    input,
  ) => {
    const capture = await prisma.agentCapture.findUnique({
      where: { userId_captureId: { userId: input.userId, captureId: input.captureId } },
      include: {
        user: { select: { syncDataGeneration: true, agentCaptureAccount: true } },
      },
    });
    if (!capture || capture.publishedOpId !== null || capture.resolution !== null)
      return null;
    return {
      captureId: capture.captureId,
      title: capture.title,
      notes: capture.notes,
      captureCounter: capture.user.agentCaptureAccount?.publishedCounter ?? 0,
      dataGeneration: capture.user.syncDataGeneration,
    };
  };

  const readNextPendingCapture: CapturePublicationService['readNextPendingCapture'] =
    async ({ userId }) => {
      const capture = await prisma.agentCapture.findFirst({
        where: { userId, publishedOpId: null, resolution: null },
        orderBy: { captureId: 'asc' },
        include: {
          user: { select: { syncDataGeneration: true, agentCaptureAccount: true } },
        },
      });
      if (!capture) return null;
      const [latestFullState] = await prisma.$queryRaw<LatestCausalFullStateRow[]>(
        latestCausalFullStateSql(userId),
      );
      const baseline = latestFullState
        ? await prisma.operation.findUnique({
            where: {
              userId_serverSeq: { userId, serverSeq: latestFullState.server_seq },
            },
            select: { id: true, isPayloadEncrypted: true },
          })
        : null;
      return {
        captureId: capture.captureId,
        title: capture.title,
        notes: capture.notes,
        publisherClientId: getAgentCaptureActorId(userId),
        captureCounter: capture.user.agentCaptureAccount?.publishedCounter ?? 0,
        dataGeneration: capture.user.syncDataGeneration,
        ...(baseline?.isPayloadEncrypted
          ? {
              encryptionBaseline: {
                opId: baseline.id,
                serverSeq: latestFullState.server_seq,
              },
            }
          : {}),
      };
    };

  const readPublicationWatermark: CapturePublicationService['readPublicationWatermark'] =
    async ({ userId }) => {
      const account = await prisma.agentCaptureAccount.findUnique({ where: { userId } });
      return account?.publishedCounter ?? 0;
    };

  const readCaptureReceipt: CapturePublicationService['readCaptureReceipt'] = async (
    input,
  ) => {
    const capture = await prisma.agentCapture.findUnique({
      where: { userId_captureId: { userId: input.userId, captureId: input.captureId } },
    });
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

  /**
   * Recovery-only. Takes the same account -> capture lock order as publication,
   * so a concurrent publisher and a concurrent operator command serialize
   * against each other rather than racing for the row's terminal state.
   */
  const resolveCapture: CapturePublicationService['resolveCapture'] = async (input) => {
    if (!isCaptureRecoveryResolution(input.resolution)) {
      throw new Error(`Unknown capture resolution: ${String(input.resolution)}`);
    }
    return prisma.$transaction(async (tx) => {
      await ensureAccountRow(tx, input.userId);
      const account = await readAccountForUpdate(tx, input.userId);
      const capture = await readQueueForUpdate(tx, input.userId, input.captureId);
      if (!capture) return { status: 'missing' };
      if (capture.publishedOpId !== null && capture.publishedServerSeq !== null) {
        // A receipt is stronger evidence than anything recovery reconstructs.
        return {
          status: 'already_published',
          receipt: {
            captureId: capture.captureId,
            opId: capture.publishedOpId,
            serverSeq: capture.publishedServerSeq,
          },
        };
      }
      if (capture.resolution !== null) {
        if (!isCaptureRecoveryResolution(capture.resolution)) {
          throw new Error(
            `Capture ${input.captureId} holds an unknown stored resolution`,
          );
        }
        // Report what is stored, not what was asked: a retried or contradictory
        // command must not silently replace a recorded outcome.
        return {
          status: 'already_resolved',
          resolution: capture.resolution,
          publicationWatermark: account.publishedCounter,
        };
      }

      // A publication that the restore erased still consumed this clock value on
      // every device that downloaded it. Resuming from the rolled-back counter
      // would mint a second operation claiming the same publisher entry.
      const publicationWatermark =
        input.resolution === 'delivered_out_of_band'
          ? account.publishedCounter + 1
          : account.publishedCounter;
      if (publicationWatermark !== account.publishedCounter) {
        await tx.agentCaptureAccount.update({
          where: { userId: input.userId },
          data: { publishedCounter: publicationWatermark },
        });
      }
      await tx.agentCapture.update({
        where: {
          userId_captureId: { userId: input.userId, captureId: input.captureId },
        },
        // Clear the plaintext on the same terms as publication: a resolved row
        // must not carry submitted content into the backups taken after recovery.
        data: {
          title: '',
          notes: null,
          resolution: input.resolution,
          resolvedAt: new Date(),
        },
      });
      return { status: 'resolved', resolution: input.resolution, publicationWatermark };
    });
  };

  const readUnresolvedCaptureBacklog: CapturePublicationService['readUnresolvedCaptureBacklog'] =
    async ({ userIds } = {}) => {
      const rows = await prisma.agentCapture.groupBy({
        by: ['userId'],
        where: {
          publishedOpId: null,
          resolution: null,
          ...(userIds ? { userId: { in: userIds } } : {}),
        },
        _count: { _all: true },
        orderBy: { userId: 'asc' },
      });
      return rows.map((row) => ({ userId: row.userId, unresolved: row._count._all }));
    };

  return {
    readNextPendingCapture,
    readPendingCapture,
    readPublicationWatermark,
    publishCapture,
    readCaptureReceipt,
    resolveCapture,
    readUnresolvedCaptureBacklog,
  };
};
