import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { uuidv7 } from 'uuidv7';
import { authenticate } from '../middleware';
import { getSyncService } from './sync.service';
import { Logger } from '../logger';
import {
  UploadOpsRequest,
  UploadOpsResponse,
  DownloadOpsResponse,
  SnapshotResponse,
  SyncStatusResponse,
  DEFAULT_SYNC_CONFIG,
} from './sync.types';

// Zod Schemas
const OperationSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  actionType: z.string().min(1),
  opType: z.enum([
    'CRT',
    'UPD',
    'DEL',
    'MOV',
    'BATCH',
    'SYNC_IMPORT',
    'BACKUP_IMPORT',
    'REPAIR',
  ]),
  entityType: z.string().min(1),
  entityId: z.string().optional(),
  entityIds: z.array(z.string()).optional(), // For batch operations
  payload: z.unknown(),
  vectorClock: z.record(z.string(), z.number()),
  timestamp: z.number(),
  schemaVersion: z.number(),
});

const UploadOpsSchema = z.object({
  ops: z.array(OperationSchema).min(1).max(DEFAULT_SYNC_CONFIG.maxOpsPerUpload),
  clientId: z.string().min(1),
  lastKnownServerSeq: z.number().optional(),
});

const DownloadOpsQuerySchema = z.object({
  sinceSeq: z.coerce.number().int().min(0),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  excludeClient: z.string().optional(),
});

const UploadSnapshotSchema = z.object({
  state: z.unknown(),
  clientId: z.string().min(1),
  reason: z.enum(['initial', 'recovery', 'migration']),
  vectorClock: z.record(z.string(), z.number()),
  schemaVersion: z.number().optional(),
});

const AckSchema = z.object({
  lastSeq: z.number().int().min(0),
});

// Error helper
const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Unknown error';

export const syncRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // All sync routes require authentication
  fastify.addHook('preHandler', authenticate);

  // POST /api/sync/ops - Upload operations
  fastify.post<{ Body: UploadOpsRequest }>(
    '/ops',
    {
      config: {
        rateLimit: {
          max: 100,
          timeWindow: '1 minute',
        },
      },
    },
    async (req: FastifyRequest<{ Body: UploadOpsRequest }>, reply: FastifyReply) => {
      try {
        const userId = req.user!.userId;

        // Validate request body
        const parseResult = UploadOpsSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: 'Validation failed',
            details: parseResult.error.issues,
          });
        }

        const { ops, clientId, lastKnownServerSeq } = parseResult.data;
        const syncService = getSyncService();

        // Rate limit check
        if (syncService.isRateLimited(userId)) {
          return reply.status(429).send({ error: 'Rate limited' });
        }

        // Process operations - cast to Operation[] since Zod validates the structure
        const results = syncService.uploadOps(
          userId,
          clientId,
          ops as unknown as import('./sync.types').Operation[],
        );

        // Optionally include new ops from other clients
        let newOps: import('./sync.types').ServerOperation[] | undefined;
        if (lastKnownServerSeq !== undefined) {
          newOps = syncService.getOpsSince(userId, lastKnownServerSeq, clientId, 100);
        }

        const response: UploadOpsResponse = {
          results,
          newOps: newOps && newOps.length > 0 ? newOps : undefined,
          latestSeq: syncService.getLatestSeq(userId),
        };

        return reply.send(response);
      } catch (err) {
        Logger.error(`Upload ops error: ${errorMessage(err)}`);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    },
  );

  // GET /api/sync/ops - Download operations
  fastify.get<{
    Querystring: { sinceSeq: string; limit?: string; excludeClient?: string };
  }>(
    '/ops',
    {
      config: {
        rateLimit: {
          max: 200,
          timeWindow: '1 minute',
        },
      },
    },
    async (req, reply) => {
      try {
        const userId = req.user!.userId;

        // Validate query params
        const parseResult = DownloadOpsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: 'Validation failed',
            details: parseResult.error.issues,
          });
        }

        const { sinceSeq, limit = 500, excludeClient } = parseResult.data;
        const syncService = getSyncService();

        const maxLimit = Math.min(limit, 1000);
        const ops = syncService.getOpsSince(
          userId,
          sinceSeq,
          excludeClient,
          maxLimit + 1,
        );

        const hasMore = ops.length > maxLimit;
        if (hasMore) ops.pop();

        const response: DownloadOpsResponse = {
          ops,
          hasMore,
          latestSeq: syncService.getLatestSeq(userId),
        };

        return reply.send(response);
      } catch (err) {
        Logger.error(`Download ops error: ${errorMessage(err)}`);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    },
  );

  // GET /api/sync/snapshot - Get full state snapshot
  fastify.get('/snapshot', async (req, reply) => {
    try {
      const userId = req.user!.userId;
      const syncService = getSyncService();

      // Check if we have a cached snapshot
      const cached = syncService.getCachedSnapshot(userId);
      if (
        cached &&
        Date.now() - cached.generatedAt < DEFAULT_SYNC_CONFIG.snapshotCacheTtlMs
      ) {
        return reply.send(cached as SnapshotResponse);
      }

      // Generate fresh snapshot by replaying ops
      const snapshot = syncService.generateSnapshot(userId);
      return reply.send(snapshot as SnapshotResponse);
    } catch (err) {
      Logger.error(`Get snapshot error: ${errorMessage(err)}`);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /api/sync/snapshot - Upload full state
  fastify.post<{ Body: { state: unknown; clientId: string; reason: string } }>(
    '/snapshot',
    async (req, reply) => {
      try {
        const userId = req.user!.userId;

        // Validate request body
        const parseResult = UploadSnapshotSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: 'Validation failed',
            details: parseResult.error.issues,
          });
        }

        const { state, clientId, reason, vectorClock, schemaVersion } = parseResult.data;
        const syncService = getSyncService();

        // Create a SYNC_IMPORT operation
        const op = {
          id: uuidv7(),
          clientId,
          actionType: 'SYNC_IMPORT',
          opType: 'SYNC_IMPORT' as const,
          entityType: 'all',
          payload: state,
          vectorClock,
          timestamp: Date.now(),
          schemaVersion: schemaVersion ?? 1,
        };

        const results = syncService.uploadOps(userId, clientId, [op]);
        const result = results[0];

        if (result.accepted && result.serverSeq !== undefined) {
          // Cache the snapshot
          syncService.cacheSnapshot(userId, state, result.serverSeq);
        }

        Logger.info(`Snapshot uploaded for user ${userId}, reason: ${reason}`);

        return reply.send({
          accepted: result.accepted,
          serverSeq: result.serverSeq,
          error: result.error,
        });
      } catch (err) {
        Logger.error(`Upload snapshot error: ${errorMessage(err)}`);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    },
  );

  // GET /api/sync/status - Get sync status
  fastify.get('/status', async (req, reply) => {
    try {
      const userId = req.user!.userId;
      const syncService = getSyncService();

      const latestSeq = syncService.getLatestSeq(userId);
      const minAckedSeq = syncService.getMinAckedSeq(userId);
      const pendingOps = minAckedSeq !== null ? latestSeq - minAckedSeq : 0;

      const cached = syncService.getCachedSnapshot(userId);
      const snapshotAge = cached ? Date.now() - cached.generatedAt : undefined;

      const response: SyncStatusResponse = {
        latestSeq,
        devicesOnline: syncService.getOnlineDeviceCount(userId),
        pendingOps,
        snapshotAge,
      };

      return reply.send(response);
    } catch (err) {
      Logger.error(`Get status error: ${errorMessage(err)}`);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /api/sync/devices/:clientId/ack - Acknowledge received sequences
  fastify.post<{ Params: { clientId: string }; Body: { lastSeq: number } }>(
    '/devices/:clientId/ack',
    async (req, reply) => {
      try {
        const userId = req.user!.userId;
        const { clientId } = req.params;

        // Validate body
        const parseResult = AckSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: 'Validation failed',
            details: parseResult.error.issues,
          });
        }

        const { lastSeq } = parseResult.data;
        const syncService = getSyncService();

        syncService.updateDeviceAck(userId, clientId, lastSeq);

        return reply.send({ acknowledged: true });
      } catch (err) {
        Logger.error(`Ack error: ${errorMessage(err)}`);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    },
  );
};
