/**
 * Fixtures for the production capture publication service.
 * Submission behavior is still test-only: it does not define an HTTP/MCP contract.
 * The database must have the production Prisma schema and capture migration.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { Operation } from '../../src/sync/sync.types';
import {
  CapturePublicationReceipt,
  CapturePublicationService,
  PendingCapture,
  PublishCaptureResult,
  createCapturePublicationService,
  getAgentCaptureActorId,
} from '../../src/sync/capture-publication.service';

export { getAgentCaptureActorId };
export type { CapturePublicationReceipt, PendingCapture, PublishCaptureResult };
export const ACCOUNT_TABLE = 'agent_capture_accounts';
export const QUEUE_TABLE = 'agent_captures';

export interface CapturePublicationHarness extends Pick<
  CapturePublicationService,
  'readNextPendingCapture' | 'resolveCapture' | 'readUnresolvedCaptureBacklog'
> {
  initialize(): Promise<void>;
  enqueueCapture(input: {
    userId: number;
    captureId: string;
    title: string;
    notes?: string | null;
    /** Seeds a row on either side of a restore snapshot; defaults to now. */
    createdAt?: Date;
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

export const createAgentCapturePublicationHarness = (
  prisma: PrismaClient,
  options: {
    afterGenerationRead?: () => Promise<void> | void;
    afterOperationAccepted?: () => Promise<void> | void;
    beforeTransactionCommit?: () => Promise<void> | void;
  } = {},
): CapturePublicationHarness => {
  // Inject faults around real database calls without adding test callbacks to
  // production. The operation insert and all receipt writes still hit PostgreSQL.
  const publicationPrisma = new Proxy(prisma, {
    get(target, property) {
      if (property !== '$transaction') return Reflect.get(target, property);
      return async <T>(
        work: (tx: Prisma.TransactionClient) => Promise<T>,
        transactionOptions?: {
          maxWait?: number;
          timeout?: number;
          isolationLevel?: Prisma.TransactionIsolationLevel;
        },
      ): Promise<T> =>
        target.$transaction(async (tx) => {
          const observedTx = new Proxy(tx, {
            get(transaction, key) {
              if (key === 'user') {
                return {
                  ...transaction.user,
                  findUniqueOrThrow: async (args: Prisma.UserFindUniqueOrThrowArgs) => {
                    const user = await transaction.user.findUniqueOrThrow(args);
                    if (args.select?.syncDataGeneration)
                      await options.afterGenerationRead?.();
                    return user;
                  },
                };
              }
              if (key === 'agentCaptureAccount') {
                return {
                  ...transaction.agentCaptureAccount,
                  update: async (args: Prisma.AgentCaptureAccountUpdateArgs) => {
                    await options.afterOperationAccepted?.();
                    return transaction.agentCaptureAccount.update(args);
                  },
                };
              }
              return Reflect.get(transaction, key);
            },
          });
          const result = await work(observedTx);
          await options.beforeTransactionCommit?.();
          return result;
        }, transactionOptions);
    },
  });
  const publication = createCapturePublicationService(publicationPrisma);

  const initialize = async (): Promise<void> => {
    // Fail if the production tables are absent; fixtures must never install them.
    await prisma.agentCapture.count();
  };

  const enqueueCapture: CapturePublicationHarness['enqueueCapture'] = async (input) => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO agent_capture_accounts (user_id) VALUES (${input.userId})
        ON CONFLICT (user_id) DO NOTHING
      `;
      // Match publication's account -> capture lock order, including insertion.
      await tx.$queryRaw`
        SELECT user_id FROM agent_capture_accounts WHERE user_id = ${input.userId} FOR UPDATE
      `;
      await tx.agentCapture.createMany({
        data: {
          userId: input.userId,
          captureId: input.captureId,
          title: input.title,
          notes: input.notes ?? null,
          ...(input.createdAt ? { createdAt: input.createdAt } : {}),
        },
        skipDuplicates: true,
      });
      const capture = await tx.agentCapture.findUniqueOrThrow({
        where: { userId_captureId: { userId: input.userId, captureId: input.captureId } },
      });
      if (capture.title !== input.title || capture.notes !== (input.notes ?? null)) {
        throw new Error(`Capture ${input.captureId} is immutable once queued`);
      }
    });
    const pending = await publication.readPendingCapture(input);
    if (!pending) throw new Error(`Capture ${input.captureId} is no longer pending`);
    return pending;
  };

  return {
    ...publication,
    initialize,
    enqueueCapture,
    countPublishedCaptures: ({ userId }) =>
      prisma.agentCapture.count({
        where: { userId, publishedOpId: { not: null } },
      }),
    countCaptureActorOperations: ({ userId }) =>
      prisma.operation.count({
        where: { userId, clientId: getAgentCaptureActorId(userId) },
      }),
    removeCaptureRowsForUsers: async ({ userIds }) => {
      await prisma.agentCapture.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.agentCaptureAccount.deleteMany({ where: { userId: { in: userIds } } });
    },
  };
};
