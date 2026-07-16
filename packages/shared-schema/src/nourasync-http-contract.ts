import * as z from 'zod';

export const NOURA_SYNC_CLIENT_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
export const NOURA_SYNC_MAX_CLIENT_ID_LENGTH = 255;
export const NOURA_SYNC_MAX_OPS_PER_UPLOAD = 100;
export const NOURA_SYNC_MAX_ENTITY_IDS_PER_OP = 1000;

// Upload-only fields must be loose enough to reach per-operation validation,
// but still bounded so one invalid item cannot amplify logs/responses or make
// semantic validation walk an arbitrarily large identifier collection.
const NOURA_SYNC_MAX_INVALID_FIELD_TRANSPORT_LENGTH = 4096;
const NOURA_SYNC_MAX_INVALID_ENTITY_IDS_TRANSPORT = NOURA_SYNC_MAX_ENTITY_IDS_PER_OP * 2;

export const NOURA_SYNC_OP_TYPES = [
  'CRT',
  'UPD',
  'DEL',
  'MOV',
  'BATCH',
  'SYNC_IMPORT',
  'BACKUP_IMPORT',
  'REPAIR',
] as const;

export const NOURA_SYNC_IMPORT_REASONS = [
  'PASSWORD_CHANGED',
  'FILE_IMPORT',
  'BACKUP_RESTORE',
  'FORCE_UPLOAD',
  'SERVER_MIGRATION',
  'REPAIR',
] as const;

export const NOURA_SYNC_SNAPSHOT_REASONS = ['initial', 'recovery', 'migration'] as const;

export const NOURA_SYNC_SNAPSHOT_OP_TYPES = [
  'SYNC_IMPORT',
  'BACKUP_IMPORT',
  'REPAIR',
] as const;

/**
 * Constrains client-generated dedup keys to URL-safe chars so they can be
 * embedded in log lines without escape risk and trivially compared on the
 * server. Length is intentionally permissive (1..64) so existing clients
 * keep working; the charset restriction alone closes the log-injection
 * vector that motivated this regex.
 */
const NOURA_SYNC_REQUEST_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

const NouraSyncRequestIdSchema = z.string().regex(NOURA_SYNC_REQUEST_ID_REGEX);

export const NouraSyncVectorClockSchema = z.record(z.string(), z.number());

export const NouraSyncClientIdSchema = z
  .string()
  .min(1)
  .max(NOURA_SYNC_MAX_CLIENT_ID_LENGTH)
  .regex(
    NOURA_SYNC_CLIENT_ID_REGEX,
    'clientId must be alphanumeric with underscores/hyphens only',
  );

export const NouraSyncOperationSchema = z.object({
  id: z.string().min(1).max(255),
  clientId: NouraSyncClientIdSchema,
  actionType: z.string().min(1).max(255),
  opType: z.enum(NOURA_SYNC_OP_TYPES),
  entityType: z.string().min(1).max(255),
  entityId: z.string().max(255).optional(),
  entityIds: z
    .array(z.string().max(255))
    .max(NOURA_SYNC_MAX_ENTITY_IDS_PER_OP)
    .optional(),
  payload: z.unknown(),
  vectorClock: NouraSyncVectorClockSchema,
  timestamp: z.number(),
  schemaVersion: z.number().int().min(1).max(100),
  isPayloadEncrypted: z.boolean().optional(),
  syncImportReason: z.enum(NOURA_SYNC_IMPORT_REASONS).optional(),
  /** Server cursor proven to be included in a causally accepted REPAIR snapshot. */
  repairBaseServerSeq: z.number().int().min(0).optional(),
});

// Upload requests are envelopes for independently validated operations. Keep
// structural types and fields that ValidationService does not handle strict,
// but defer semantic operation validation to the server so one malformed op
// cannot reject and stall every valid sibling in the batch. Download/response
// schemas remain strict.
const NouraSyncUploadOperationSchema = NouraSyncOperationSchema.extend({
  id: z.string().max(NOURA_SYNC_MAX_INVALID_FIELD_TRANSPORT_LENGTH),
  clientId: z.string().max(NOURA_SYNC_MAX_INVALID_FIELD_TRANSPORT_LENGTH),
  opType: z.string().max(NOURA_SYNC_MAX_INVALID_FIELD_TRANSPORT_LENGTH),
  entityType: z.string().max(NOURA_SYNC_MAX_INVALID_FIELD_TRANSPORT_LENGTH),
  entityId: z.string().max(NOURA_SYNC_MAX_INVALID_FIELD_TRANSPORT_LENGTH).optional(),
  entityIds: z
    .array(z.string().max(NOURA_SYNC_MAX_INVALID_FIELD_TRANSPORT_LENGTH))
    .max(NOURA_SYNC_MAX_INVALID_ENTITY_IDS_TRANSPORT)
    .optional(),
  vectorClock: z.record(z.string(), z.unknown()),
  schemaVersion: z.number(),
});

export const NouraSyncUploadOpsRequestSchema = z.object({
  ops: z.array(NouraSyncUploadOperationSchema).min(1).max(NOURA_SYNC_MAX_OPS_PER_UPLOAD),
  clientId: NouraSyncClientIdSchema,
  lastKnownServerSeq: z.number().optional(),
  requestId: NouraSyncRequestIdSchema.optional(),
});

export const NouraSyncDownloadOpsQuerySchema = z.object({
  sinceSeq: z.coerce.number().int().min(0),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  excludeClient: NouraSyncClientIdSchema.optional(),
});

export const NouraSyncUploadSnapshotRequestSchema = z
  .object({
    state: z.unknown(),
    clientId: NouraSyncClientIdSchema,
    reason: z.enum(NOURA_SYNC_SNAPSHOT_REASONS),
    vectorClock: NouraSyncVectorClockSchema,
    schemaVersion: z.number().int().min(1).max(100).optional(),
    isPayloadEncrypted: z.boolean().optional(),
    syncImportReason: z.enum(NOURA_SYNC_IMPORT_REASONS).optional(),
    opId: z.string().uuid().optional(),
    isCleanSlate: z.boolean().optional(),
    snapshotOpType: z.enum(NOURA_SYNC_SNAPSHOT_OP_TYPES).optional(),
    repairBaseServerSeq: z.number().int().min(0).optional(),
    requestId: NouraSyncRequestIdSchema.optional(),
  })
  .superRefine((request, context) => {
    if (request.isCleanSlate && !request.opId) {
      context.addIssue({
        code: 'custom',
        path: ['opId'],
        message: 'opId is required for clean-slate snapshot idempotency',
      });
    }
  });

export const NouraSyncOperationResponseSchema = NouraSyncOperationSchema.passthrough();

export const NouraSyncServerOperationSchema = z
  .object({
    serverSeq: z.number(),
    op: NouraSyncOperationResponseSchema,
    receivedAt: z.number(),
  })
  .passthrough();

export const NouraSyncUploadResultSchema = z
  .object({
    opId: z.string(),
    accepted: z.boolean(),
    serverSeq: z.number().optional(),
    error: z.string().optional(),
    errorCode: z.string().optional(),
    existingClock: NouraSyncVectorClockSchema.optional(),
  })
  .passthrough();

export const NouraSyncUploadOpsResponseSchema = z
  .object({
    results: z.array(NouraSyncUploadResultSchema),
    newOps: z.array(NouraSyncServerOperationSchema).optional(),
    latestSeq: z.number(),
    hasMorePiggyback: z.boolean().optional(),
  })
  .passthrough();

export const NouraSyncDownloadOpsResponseSchema = z
  .object({
    ops: z.array(NouraSyncServerOperationSchema),
    hasMore: z.boolean(),
    latestSeq: z.number(),
    gapDetected: z.boolean().optional(),
    snapshotVectorClock: NouraSyncVectorClockSchema.optional(),
    serverTime: z.number().optional(),
    capabilities: z
      .object({
        causalRepairSnapshots: z.literal(true).optional(),
      })
      .optional(),
  })
  .passthrough();

export const NouraSyncSnapshotResponseSchema = z
  .object({
    state: z.unknown(),
    serverSeq: z.number(),
    generatedAt: z.number(),
  })
  .passthrough();

export const NouraSyncSnapshotUploadResponseSchema = z
  .object({
    accepted: z.boolean(),
    serverSeq: z.number().optional(),
    error: z.string().optional(),
    errorCode: z.string().optional(),
  })
  .passthrough();

export const NouraSyncStatusResponseSchema = z
  .object({
    latestSeq: z.number(),
    devicesOnline: z.number(),
    snapshotAge: z.number().optional(),
    storageUsedBytes: z.number(),
    storageQuotaBytes: z.number(),
  })
  .passthrough();

export const NouraSyncRestorePointSchema = z
  .object({
    serverSeq: z.number(),
    timestamp: z.number(),
    type: z.enum(NOURA_SYNC_SNAPSHOT_OP_TYPES),
    clientId: z.string(),
    description: z.string().optional(),
  })
  .passthrough();

export const NouraSyncRestorePointsResponseSchema = z
  .object({
    restorePoints: z.array(NouraSyncRestorePointSchema),
  })
  .passthrough();

export const NouraSyncRestoreSnapshotResponseSchema = NouraSyncSnapshotResponseSchema;

export const NouraSyncDeleteAllDataResponseSchema = z
  .object({
    success: z.boolean(),
  })
  .passthrough();

export type NouraSyncOpType = (typeof NOURA_SYNC_OP_TYPES)[number];
export type NouraSyncImportReason = (typeof NOURA_SYNC_IMPORT_REASONS)[number];
export type NouraSyncSnapshotReason = (typeof NOURA_SYNC_SNAPSHOT_REASONS)[number];
export type NouraSyncSnapshotOpType = (typeof NOURA_SYNC_SNAPSHOT_OP_TYPES)[number];

export type NouraSyncOperation = z.infer<typeof NouraSyncOperationSchema>;
export type NouraSyncUploadOpsRequest = z.infer<typeof NouraSyncUploadOpsRequestSchema>;
export type NouraSyncDownloadOpsQuery = z.infer<typeof NouraSyncDownloadOpsQuerySchema>;
export type NouraSyncUploadSnapshotRequest = z.infer<
  typeof NouraSyncUploadSnapshotRequestSchema
>;
export type NouraSyncServerOperation = z.infer<typeof NouraSyncServerOperationSchema>;
export type NouraSyncUploadResult = z.infer<typeof NouraSyncUploadResultSchema>;
export type NouraSyncUploadOpsResponse = z.infer<typeof NouraSyncUploadOpsResponseSchema>;
export type NouraSyncDownloadOpsResponse = z.infer<
  typeof NouraSyncDownloadOpsResponseSchema
>;
export type NouraSyncSnapshotResponse = z.infer<typeof NouraSyncSnapshotResponseSchema>;
export type NouraSyncSnapshotUploadResponse = z.infer<
  typeof NouraSyncSnapshotUploadResponseSchema
>;
export type NouraSyncStatusResponse = z.infer<typeof NouraSyncStatusResponseSchema>;
export type NouraSyncRestorePoint = z.infer<typeof NouraSyncRestorePointSchema>;
export type NouraSyncRestorePointsResponse = z.infer<
  typeof NouraSyncRestorePointsResponseSchema
>;
export type NouraSyncRestoreSnapshotResponse = z.infer<
  typeof NouraSyncRestoreSnapshotResponseSchema
>;
export type NouraSyncDeleteAllDataResponse = z.infer<
  typeof NouraSyncDeleteAllDataResponseSchema
>;
