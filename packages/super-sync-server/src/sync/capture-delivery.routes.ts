import type { FastifyInstance } from 'fastify';
import { SuperSyncCapturePublicationRequestSchema } from '@sp/shared-schema';
import { prisma } from '../db';
import { getAuthUser } from '../middleware';
import { Logger } from '../logger';
import { createCapturePublicationService } from './capture-publication.service';
import { getSyncService } from './sync.service';
import { getWsConnectionService } from './services/websocket-connection.service';
import type { Operation } from './sync.types';
import { SYNC_ERROR_CODES } from './sync.types';
import {
  createValidationErrorResponse,
  MAX_DECOMPRESSED_SIZE_OPS,
  sendE2eeRequiredReply,
  violatesE2eeGate,
} from './sync.routes.payload';
import {
  computeOpsStorageBytesExcludingUnstorableIds,
  enforceStorageQuota,
} from './sync.routes.quota';

const publication = createCapturePublicationService(prisma);
const rateLimit = { max: 100, timeWindow: '1 minute' };

/** Called inside syncRoutes, after its authentication hook is installed. */
export const registerCaptureDeliveryRoutes = (
  fastify: FastifyInstance,
  enabled: boolean,
): void => {
  fastify.get('/captures/pending', { config: { rateLimit } }, async (req, reply) => {
    if (!enabled) return reply.status(503).send({ error: 'Capture delivery is paused' });
    const userId = getAuthUser(req).userId;
    const capture = await publication.readNextPendingCapture({ userId });
    return reply.send({ capture });
  });

  fastify.post<{ Body: unknown }>(
    '/captures/publish',
    {
      bodyLimit: MAX_DECOMPRESSED_SIZE_OPS,
      config: { rateLimit },
    },
    async (req, reply) => {
      if (!enabled)
        return reply.status(503).send({ error: 'Capture delivery is paused' });
      const userId = getAuthUser(req).userId;
      const parsed = SuperSyncCapturePublicationRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send(createValidationErrorResponse(parsed.error.issues));
      }
      const { captureId, candidate, ...rest } = parsed.data;
      if (
        candidate.opType !== 'CRT' ||
        candidate.entityType !== 'TASK' ||
        candidate.actionType !== '[Task Shared] addTask' ||
        candidate.entityId !== `capture-${captureId}` ||
        candidate.entityIds?.length !== 1 ||
        candidate.entityIds[0] !== candidate.entityId
      ) {
        return reply.status(400).send({ error: 'Invalid capture task operation' });
      }
      const syncService = getSyncService();
      if (syncService.isRateLimited(userId)) {
        Logger.audit({
          event: 'RATE_LIMITED',
          userId,
          clientId: candidate.clientId,
          errorCode: SYNC_ERROR_CODES.RATE_LIMITED,
          opsCount: 1,
        });
        return reply.status(429).send({
          error: 'Rate limited',
          errorCode: SYNC_ERROR_CODES.RATE_LIMITED,
        });
      }
      if (violatesE2eeGate(candidate)) {
        return sendE2eeRequiredReply(reply, userId, {
          clientId: candidate.clientId,
          surface: 'capture',
          opsCount: 1,
        });
      }
      const existingReceipt = await publication.readCaptureReceipt({ userId, captureId });
      if (existingReceipt) {
        return reply.send({ status: 'already_published', receipt: existingReceipt });
      }

      const result = await syncService.runWithStorageUsageLock(userId, async () => {
        const { bytes } = await computeOpsStorageBytesExcludingUnstorableIds([
          candidate as Operation,
        ]);
        if (!(await enforceStorageQuota(userId, bytes, reply))) return null;
        return publication.publishCapture({
          userId,
          captureId,
          candidate: candidate as Operation,
          ...rest,
        });
      });
      if (!result) return reply;
      if (result.status === 'published') {
        getWsConnectionService().notifyNewOps(
          userId,
          candidate.clientId,
          result.receipt.serverSeq,
        );
      }
      return reply.send(result);
    },
  );
};
