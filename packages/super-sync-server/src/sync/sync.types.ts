// Operation types - single source of truth
export const OP_TYPES = [
  'CRT',
  'UPD',
  'DEL',
  'MOV',
  'BATCH',
  'SYNC_IMPORT',
  'BACKUP_IMPORT',
  'REPAIR',
] as const;

export type OpType = (typeof OP_TYPES)[number];

export type VectorClock = Record<string, number>;

export interface Operation {
  id: string;
  clientId: string;
  actionType: string;
  opType: OpType;
  entityType: string;
  entityId?: string;
  entityIds?: string[]; // For batch operations
  payload: unknown;
  vectorClock: VectorClock;
  timestamp: number;
  schemaVersion: number;
}

export interface ServerOperation {
  serverSeq: number;
  op: Operation;
  receivedAt: number;
}

// Upload types
export interface UploadOpsRequest {
  ops: Operation[];
  clientId: string;
  lastKnownServerSeq?: number;
}

export interface UploadResult {
  opId: string;
  accepted: boolean;
  serverSeq?: number;
  error?: string;
}

export interface UploadOpsResponse {
  results: UploadResult[];
  newOps?: ServerOperation[];
  latestSeq: number;
}

// Download types
export interface DownloadOpsQuery {
  sinceSeq: number;
  limit?: number;
  excludeClient?: string;
}

export interface DownloadOpsResponse {
  ops: ServerOperation[];
  hasMore: boolean;
  latestSeq: number;
}

// Snapshot types
export interface SnapshotResponse {
  state: unknown;
  serverSeq: number;
  generatedAt: number;
}

export interface UploadSnapshotRequest {
  state: unknown;
  clientId: string;
  reason: 'initial' | 'recovery' | 'migration';
  vectorClock: VectorClock;
  schemaVersion?: number;
}

// Status types
export interface SyncStatusResponse {
  latestSeq: number;
  devicesOnline: number;
  pendingOps: number;
  snapshotAge?: number;
}

// Payload validation result
export interface PayloadValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates operation payload structure based on operation type.
 * This is a server-side security check to ensure payloads have the expected structure.
 *
 * Rules:
 * - CRT: Must be an object with an 'id' field (string)
 * - UPD: Must be an object (partial update)
 * - DEL: Can be empty object, null, or object with deletion metadata
 * - MOV: Must be an object (contains move/reorder data)
 * - BATCH: Must be an object, optionally with 'entities' object
 * - SYNC_IMPORT/BACKUP_IMPORT/REPAIR: Accept any (too complex to validate)
 */
export const validatePayload = (
  opType: OpType,
  payload: unknown,
): PayloadValidationResult => {
  // Skip validation for full-state operations (too complex to validate server-side)
  if (opType === 'SYNC_IMPORT' || opType === 'BACKUP_IMPORT' || opType === 'REPAIR') {
    return { valid: true };
  }

  // DEL can have empty payload, null, or metadata object
  if (opType === 'DEL') {
    if (payload === null || payload === undefined) {
      return { valid: true };
    }
    if (typeof payload === 'object' && !Array.isArray(payload)) {
      return { valid: true };
    }
    return { valid: false, error: 'DEL payload must be null or an object' };
  }

  // All other operations require an object payload
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { valid: false, error: `${opType} payload must be a non-null object` };
  }

  const payloadObj = payload as Record<string, unknown>;

  // CRT requires an 'id' field
  if (opType === 'CRT') {
    if (!('id' in payloadObj) || typeof payloadObj.id !== 'string') {
      return { valid: false, error: 'CRT payload must contain a string id field' };
    }
    if (payloadObj.id.length === 0 || payloadObj.id.length > 255) {
      return { valid: false, error: 'CRT payload id must be 1-255 characters' };
    }
  }

  // BATCH with 'entities' must have entities as an object
  if (opType === 'BATCH' && 'entities' in payloadObj) {
    if (
      typeof payloadObj.entities !== 'object' ||
      payloadObj.entities === null ||
      Array.isArray(payloadObj.entities)
    ) {
      return { valid: false, error: 'BATCH entities must be an object keyed by ID' };
    }
  }

  return { valid: true };
};

// Configuration
export interface SyncConfig {
  maxOpsPerUpload: number;
  maxPayloadSizeBytes: number;
  downloadLimit: number;
  uploadRateLimit: { max: number; windowMs: number };
  downloadRateLimit: { max: number; windowMs: number };
  tombstoneRetentionMs: number;
  opRetentionMs: number;
  snapshotCacheTtlMs: number;
  maxClockDriftMs: number;
  maxOpAgeMs: number;
}

// Time constants (in milliseconds)
export const MS_PER_MINUTE = 60 * 1000;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

// Device thresholds
export const ONLINE_DEVICE_THRESHOLD_MS = 5 * MS_PER_MINUTE; // 5 minutes
export const STALE_DEVICE_THRESHOLD_MS = 30 * MS_PER_DAY; // 30 days

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  maxOpsPerUpload: 100,
  maxPayloadSizeBytes: 20 * 1024 * 1024, // 20MB - needed for large imports
  downloadLimit: 1000,
  uploadRateLimit: { max: 100, windowMs: MS_PER_MINUTE },
  downloadRateLimit: { max: 200, windowMs: MS_PER_MINUTE },
  tombstoneRetentionMs: 90 * MS_PER_DAY, // 90 days
  opRetentionMs: 90 * MS_PER_DAY, // 90 days
  snapshotCacheTtlMs: 5 * MS_PER_MINUTE, // 5 minutes
  maxClockDriftMs: MS_PER_MINUTE, // 60 seconds
  maxOpAgeMs: 30 * MS_PER_DAY, // 30 days
};
