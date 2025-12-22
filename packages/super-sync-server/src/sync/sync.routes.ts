import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { uuidv7 } from 'uuidv7';
import { authenticate, getAuthUser } from '../middleware';
import { getSyncService } from './sync.service';
import { Logger } from '../logger';
import {
  UploadOpsRequest,
  UploadOpsResponse,
  DownloadOpsResponse,
  SnapshotResponse,
  SyncStatusResponse,
  DEFAULT_SYNC_CONFIG,
  OP_TYPES,
  SYNC_ERROR_CODES,
} from './sync.types';

const gunzipAsync = promisify(zlib.gunzip);

// Validation constants
const CLIENT_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_CLIENT_ID_LENGTH = 255;
const MAX_DECOMPRESSED_SIZE = 100 * 1024 * 1024; // 100MB - prevents zip bombs

// Zod Schemas
const ClientIdSchema = z
  .string()
  .min(1)
  .max(MAX_CLIENT_ID_LENGTH)
  .regex(CLIENT_ID_REGEX, 'clientId must be alphanumeric with underscores/hyphens only');

const OperationSchema = z.object({
  id: z.string().min(1).max(255),
  clientId: ClientIdSchema,
  actionType: z.string().min(1).max(255),
  opType: z.enum(OP_TYPES),
  entityType: z.string().min(1).max(255),
  entityId: z.string().max(255).optional(),
  entityIds: z.array(z.string().max(255)).optional(), // For batch operations
  payload: z.unknown(),
  vectorClock: z.record(z.string(), z.number()),
  timestamp: z.number(),
  schemaVersion: z.number(),
  parentOpId: z.string().max(255).optional(), // For conflict resolution chain tracking
  isPayloadEncrypted: z.boolean().optional(), // True if payload is E2E encrypted
});

const UploadOpsSchema = z.object({
  ops: z.array(OperationSchema).min(1).max(DEFAULT_SYNC_CONFIG.maxOpsPerUpload),
  clientId: ClientIdSchema,
  lastKnownServerSeq: z.number().optional(),
  requestId: z.string().min(1).max(64).optional(), // For request deduplication
});

const DownloadOpsQuerySchema = z.object({
  sinceSeq: z.coerce.number().int().min(0),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  excludeClient: ClientIdSchema.optional(),
});

const UploadSnapshotSchema = z.object({
  state: z.unknown(),
  clientId: ClientIdSchema,
  reason: z.enum(['initial', 'recovery', 'migration']),
  vectorClock: z.record(z.string(), z.number()),
  schemaVersion: z.number().optional(),
  isPayloadEncrypted: z.boolean().optional(),
});

// Error helper
const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Unknown error';

export const syncRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // Add content type parser for gzip-encoded JSON
  // This allows clients to send compressed request bodies with Content-Encoding: gzip
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body: Buffer, done) => {
      const contentEncoding = req.headers['content-encoding'];
      if (contentEncoding === 'gzip') {
        // Return raw buffer for gzip - will be decompressed in route handler
        done(null, body);
      } else {
        // Parse JSON normally for uncompressed requests
        try {
          const json = JSON.parse(body.toString('utf-8'));
          done(null, json);
        } catch (err) {
          done(err as Error, undefined);
        }
      }
    },
  );

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
        const userId = getAuthUser(req).userId;

        // Support gzip-encoded uploads to save bandwidth
        let body: unknown = req.body;
        const contentEncoding = req.headers['content-encoding'];

        if (contentEncoding === 'gzip') {
          const rawBody = req.body as unknown as Buffer;
          if (!Buffer.isBuffer(rawBody)) {
            return reply.status(400).send({
              error: 'Expected compressed body with Content-Encoding: gzip',
            });
          }

          try {
            const decompressed = await gunzipAsync(rawBody);
            if (decompressed.length > MAX_DECOMPRESSED_SIZE) {
              Logger.warn(
                `[user:${userId}] Decompressed upload too large: ${decompressed.length} bytes (max ${MAX_DECOMPRESSED_SIZE})`,
              );
              return reply.status(413).send({
                error: 'Decompressed payload too large',
              });
            }
            body = JSON.parse(decompressed.toString('utf-8'));
            Logger.debug(
              `[user:${userId}] Ops upload decompressed: ${rawBody.length} -> ${decompressed.length} bytes`,
            );
          } catch (decompressErr) {
            Logger.warn(
              `[user:${userId}] Failed to decompress ops upload: ${errorMessage(decompressErr)}`,
            );
            return reply.status(400).send({
              error: 'Failed to decompress gzip body',
            });
          }
        }

        // Validate request body
        const parseResult = UploadOpsSchema.safeParse(body);
        if (!parseResult.success) {
          Logger.warn(
            `[user:${userId}] Upload validation failed`,
            parseResult.error.issues,
          );
          return reply.status(400).send({
            error: 'Validation failed',
            details: parseResult.error.issues,
          });
        }

        const { ops, clientId, lastKnownServerSeq, requestId } = parseResult.data;
        const syncService = getSyncService();

        Logger.info(
          `[user:${userId}] Upload: ${ops.length} ops from client ${clientId.slice(0, 8)}...`,
        );

        // Rate limit check BEFORE deduplication to prevent bypass
        // (attacker could retry with same requestId to skip rate limiting)
        if (syncService.isRateLimited(userId)) {
          Logger.audit({
            event: 'RATE_LIMITED',
            userId,
            clientId,
            errorCode: SYNC_ERROR_CODES.RATE_LIMITED,
            opsCount: ops.length,
          });
          return reply.status(429).send({
            error: 'Rate limited',
            errorCode: SYNC_ERROR_CODES.RATE_LIMITED,
          });
        }

        // Check for duplicate request (client retry) BEFORE quota check
        // This ensures retries after successful uploads don't fail with 413
        // if the original upload pushed the user over quota
        if (requestId) {
          const cachedResults = syncService.checkRequestDeduplication(userId, requestId);
          if (cachedResults) {
            Logger.info(
              `[user:${userId}] Returning cached results for request ${requestId}`,
            );

            // IMPORTANT: Recompute piggybacked ops using the retry request's lastKnownServerSeq.
            // The original response may have contained newOps that the client missed if the
            // network dropped the response. By using the CURRENT request's lastKnownServerSeq,
            // we ensure the client gets all ops it hasn't seen yet.
            let newOps: import('./sync.types').ServerOperation[] | undefined;
            let latestSeq: number;

            if (lastKnownServerSeq !== undefined) {
              const opsResult = await syncService.getOpsSinceWithSeq(
                userId,
                lastKnownServerSeq,
                clientId,
                100,
              );
              newOps = opsResult.ops;
              latestSeq = opsResult.latestSeq;
              if (newOps.length > 0) {
                Logger.info(
                  `[user:${userId}] Dedup request: piggybacking ${newOps.length} ops (since seq ${lastKnownServerSeq})`,
                );
              }
            } else {
              latestSeq = await syncService.getLatestSeq(userId);
            }

            return reply.send({
              results: cachedResults,
              newOps: newOps?.length ? newOps : undefined,
              latestSeq,
              deduplicated: true,
            } as UploadOpsResponse & { deduplicated: boolean });
          }
        }

        // Check storage quota before processing (after dedup to allow retries)
        const payloadSize = JSON.stringify(body).length;
        const quotaCheck = await syncService.checkStorageQuota(userId, payloadSize);
        if (!quotaCheck.allowed) {
          Logger.warn(
            `[user:${userId}] Storage quota exceeded: ${quotaCheck.currentUsage}/${quotaCheck.quota} bytes`,
          );
          return reply.status(413).send({
            error: 'Storage quota exceeded',
            errorCode: SYNC_ERROR_CODES.STORAGE_QUOTA_EXCEEDED,
            storageUsedBytes: quotaCheck.currentUsage,
            storageQuotaBytes: quotaCheck.quota,
          });
        }

        // Process operations - cast to Operation[] since Zod validates the structure
        const results = await syncService.uploadOps(
          userId,
          clientId,
          ops as unknown as import('./sync.types').Operation[],
        );

        // Cache results for deduplication if requestId was provided
        if (requestId) {
          syncService.cacheRequestResults(userId, requestId, results);
        }

        const accepted = results.filter((r) => r.accepted).length;
        const rejected = results.filter((r) => !r.accepted).length;
        Logger.info(
          `[user:${userId}] Upload result: ${accepted} accepted, ${rejected} rejected`,
        );

        if (rejected > 0) {
          Logger.debug(
            `[user:${userId}] Rejected ops:`,
            results.filter((r) => !r.accepted),
          );
        }

        // Update storage usage after successful operations
        if (accepted > 0) {
          await syncService.updateStorageUsage(userId);
        }

        // Optionally include new ops from other clients (with atomic latestSeq read)
        let newOps: import('./sync.types').ServerOperation[] | undefined;
        let latestSeq: number;

        if (lastKnownServerSeq !== undefined) {
          // Use atomic read to get ops and latestSeq together
          const opsResult = await syncService.getOpsSinceWithSeq(
            userId,
            lastKnownServerSeq,
            clientId,
            100,
          );
          newOps = opsResult.ops;
          latestSeq = opsResult.latestSeq;
          if (newOps.length > 0) {
            Logger.info(
              `[user:${userId}] Piggybacking ${newOps.length} ops (since seq ${lastKnownServerSeq})`,
            );
          }
        } else {
          latestSeq = await syncService.getLatestSeq(userId);
        }

        const response: UploadOpsResponse = {
          results,
          newOps: newOps && newOps.length > 0 ? newOps : undefined,
          latestSeq,
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
    async (
      req: FastifyRequest<{
        Querystring: { sinceSeq: string; limit?: string; excludeClient?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const userId = getAuthUser(req).userId;

        // Validate query params
        const parseResult = DownloadOpsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
          Logger.warn(
            `[user:${userId}] Download validation failed`,
            parseResult.error.issues,
          );
          return reply.status(400).send({
            error: 'Validation failed',
            details: parseResult.error.issues,
          });
        }

        const { sinceSeq, limit = 500, excludeClient } = parseResult.data;
        const syncService = getSyncService();

        Logger.debug(
          `[user:${userId}] Download request: sinceSeq=${sinceSeq}, limit=${limit}`,
        );

        const maxLimit = Math.min(limit, 1000);

        // Use atomic read to get ops and latestSeq in one transaction
        // This prevents race conditions where new ops arrive between the two reads
        const { ops, latestSeq, gapDetected, latestSnapshotSeq, snapshotVectorClock } =
          await syncService.getOpsSinceWithSeq(
            userId,
            sinceSeq,
            excludeClient,
            maxLimit + 1,
          );

        const hasMore = ops.length > maxLimit;
        if (hasMore) ops.pop();

        if (gapDetected) {
          Logger.warn(
            `[user:${userId}] Download: gap detected, client should resync from snapshot`,
          );
        }

        Logger.info(
          `[user:${userId}] Download: ${ops.length} ops ` +
            `(sinceSeq=${sinceSeq}, latestSeq=${latestSeq}, hasMore=${hasMore}, gap=${gapDetected}` +
            `${latestSnapshotSeq ? `, snapshotSeq=${latestSnapshotSeq}` : ''})`,
        );

        const response: DownloadOpsResponse = {
          ops,
          hasMore,
          latestSeq,
          gapDetected: gapDetected || undefined, // Only include if true
          latestSnapshotSeq, // Optimization: tells client where effective state starts
          snapshotVectorClock, // Aggregated clock from skipped ops for conflict resolution
        };

        return reply.send(response);
      } catch (err) {
        Logger.error(`Download ops error: ${errorMessage(err)}`);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    },
  );

  // GET /api/sync/snapshot - Get full state snapshot
  fastify.get('/snapshot', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getAuthUser(req).userId;
      const syncService = getSyncService();

      Logger.info(`[user:${userId}] Snapshot requested`);

      // Check if we have a cached snapshot
      const cached = await syncService.getCachedSnapshot(userId);
      if (
        cached &&
        Date.now() - cached.generatedAt < DEFAULT_SYNC_CONFIG.snapshotCacheTtlMs
      ) {
        Logger.info(
          `[user:${userId}] Returning cached snapshot (seq=${cached.serverSeq}, age=${Math.round((Date.now() - cached.generatedAt) / 1000)}s)`,
        );
        return reply.send(cached as SnapshotResponse);
      }

      // Generate fresh snapshot by replaying ops
      Logger.info(`[user:${userId}] Generating fresh snapshot...`);
      const snapshot = await syncService.generateSnapshot(userId);
      Logger.info(`[user:${userId}] Snapshot generated (seq=${snapshot.serverSeq})`);
      return reply.send(snapshot as SnapshotResponse);
    } catch (err) {
      Logger.error(`Get snapshot error: ${errorMessage(err)}`);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /api/sync/snapshot - Upload full state
  // Supports gzip-compressed request bodies via Content-Encoding: gzip header
  fastify.post<{ Body: unknown }>(
    '/snapshot',
    {
      bodyLimit: 30 * 1024 * 1024, // 30MB - needed for backup/repair imports
    },
    async (req: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      try {
        const userId = getAuthUser(req).userId;

        // Handle gzip-compressed request body
        let body: unknown = req.body;
        const contentEncoding = req.headers['content-encoding'];

        if (contentEncoding === 'gzip') {
          // Body comes as Buffer when compressed
          const rawBody = req.body as Buffer;
          if (!Buffer.isBuffer(rawBody)) {
            return reply.status(400).send({
              error: 'Expected compressed body with Content-Encoding: gzip',
            });
          }

          try {
            const decompressed = await gunzipAsync(rawBody);
            if (decompressed.length > MAX_DECOMPRESSED_SIZE) {
              Logger.warn(
                `[user:${userId}] Decompressed snapshot too large: ${decompressed.length} bytes (max ${MAX_DECOMPRESSED_SIZE})`,
              );
              return reply.status(413).send({
                error: 'Decompressed payload too large',
              });
            }
            body = JSON.parse(decompressed.toString('utf-8'));
            Logger.debug(
              `[user:${userId}] Snapshot decompressed: ${rawBody.length} -> ${decompressed.length} bytes`,
            );
          } catch (decompressErr) {
            Logger.warn(
              `[user:${userId}] Failed to decompress snapshot: ${errorMessage(decompressErr)}`,
            );
            return reply.status(400).send({
              error: 'Failed to decompress gzip body',
            });
          }
        }

        // Validate request body
        const parseResult = UploadSnapshotSchema.safeParse(body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: 'Validation failed',
            details: parseResult.error.issues,
          });
        }

        const {
          state,
          clientId,
          reason,
          vectorClock,
          schemaVersion,
          isPayloadEncrypted,
        } = parseResult.data;
        const syncService = getSyncService();

        // Check storage quota before processing
        const payloadSize = JSON.stringify(body).length;
        const quotaCheck = await syncService.checkStorageQuota(userId, payloadSize);
        if (!quotaCheck.allowed) {
          Logger.warn(
            `[user:${userId}] Storage quota exceeded for snapshot: ${quotaCheck.currentUsage}/${quotaCheck.quota} bytes`,
          );
          return reply.status(413).send({
            error: 'Storage quota exceeded',
            errorCode: SYNC_ERROR_CODES.STORAGE_QUOTA_EXCEEDED,
            storageUsedBytes: quotaCheck.currentUsage,
            storageQuotaBytes: quotaCheck.quota,
          });
        }

        // Create a SYNC_IMPORT operation
        // Use the correct NgRx action type so the operation can be replayed on other clients
        const op = {
          id: uuidv7(),
          clientId,
          actionType: '[SP_ALL] Load(import) all data',
          opType: 'SYNC_IMPORT' as const,
          entityType: 'ALL',
          payload: state,
          vectorClock,
          timestamp: Date.now(),
          schemaVersion: schemaVersion ?? 1,
          isPayloadEncrypted: isPayloadEncrypted ?? false,
        };

        const results = await syncService.uploadOps(userId, clientId, [op]);
        const result = results[0];

        if (result.accepted && result.serverSeq !== undefined) {
          // Cache the snapshot
          await syncService.cacheSnapshot(userId, state, result.serverSeq);
          // Update storage usage
          await syncService.updateStorageUsage(userId);
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
  fastify.get('/status', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getAuthUser(req).userId;
      const syncService = getSyncService();

      const latestSeq = await syncService.getLatestSeq(userId);
      const devicesOnline = await syncService.getOnlineDeviceCount(userId);

      const cached = await syncService.getCachedSnapshot(userId);
      const snapshotAge = cached ? Date.now() - cached.generatedAt : undefined;

      const storageInfo = await syncService.getStorageInfo(userId);

      Logger.debug(`[user:${userId}] Status: seq=${latestSeq}, devices=${devicesOnline}`);

      const response: SyncStatusResponse = {
        latestSeq,
        devicesOnline,
        pendingOps: 0, // Deprecated: ACK-based tracking removed
        snapshotAge,
        storageUsedBytes: storageInfo.storageUsedBytes,
        storageQuotaBytes: storageInfo.storageQuotaBytes,
      };

      return reply.send(response);
    } catch (err) {
      Logger.error(`Get status error: ${errorMessage(err)}`);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /api/sync/restore-points - List available restore points
  fastify.get<{
    Querystring: { limit?: string };
  }>('/restore-points', async (req, reply) => {
    try {
      const userId = getAuthUser(req).userId;
      const syncService = getSyncService();
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 30;

      if (isNaN(limit) || limit < 1 || limit > 100) {
        return reply.status(400).send({
          error: 'Invalid limit parameter (must be 1-100)',
        });
      }

      Logger.debug(`[user:${userId}] Restore points requested (limit=${limit})`);

      const restorePoints = await syncService.getRestorePoints(userId, limit);

      Logger.info(`[user:${userId}] Returning ${restorePoints.length} restore points`);

      return reply.send({ restorePoints });
    } catch (err) {
      Logger.error(`Get restore points error: ${errorMessage(err)}`);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /api/sync/restore/:serverSeq - Get state snapshot at specific serverSeq
  fastify.get<{
    Params: { serverSeq: string };
  }>('/restore/:serverSeq', async (req, reply) => {
    try {
      const userId = getAuthUser(req).userId;
      const syncService = getSyncService();
      const targetSeq = parseInt(req.params.serverSeq, 10);

      if (isNaN(targetSeq) || targetSeq < 1) {
        return reply.status(400).send({
          error: 'Invalid serverSeq parameter (must be a positive integer)',
        });
      }

      Logger.info(`[user:${userId}] Restore snapshot requested at seq=${targetSeq}`);

      const snapshot = await syncService.generateSnapshotAtSeq(userId, targetSeq);

      Logger.info(`[user:${userId}] Restore snapshot generated at seq=${targetSeq}`);

      return reply.send(snapshot);
    } catch (err) {
      const message = errorMessage(err);
      if (
        message.includes('exceeds latest sequence') ||
        message.includes('must be at least')
      ) {
        Logger.warn(
          `[user:${getAuthUser(req).userId}] Invalid restore request: ${message}`,
        );
        return reply.status(400).send({ error: message });
      }
      // Handle encrypted ops error - this is a known limitation, not a server error
      if (message.includes('ENCRYPTED_OPS_NOT_SUPPORTED')) {
        Logger.info(
          `[user:${getAuthUser(req).userId}] Restore blocked due to encrypted ops`,
        );
        return reply.status(400).send({
          error: message,
          errorCode: SYNC_ERROR_CODES.ENCRYPTED_OPS_NOT_SUPPORTED,
        });
      }
      Logger.error(`Get restore snapshot error: ${message}`);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};
