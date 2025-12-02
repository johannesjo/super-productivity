// Operation types
export type OpType = 'CRT' | 'UPD' | 'DEL' | 'MOV' | 'BATCH' | 'SYNC_IMPORT';

export type VectorClock = Record<string, number>;

export interface Operation {
  id: string;
  clientId: string;
  actionType: string;
  opType: OpType;
  entityType: string;
  entityId?: string;
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
}

// Status types
export interface SyncStatusResponse {
  latestSeq: number;
  devicesOnline: number;
  pendingOps: number;
  snapshotAge?: number;
}

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

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  maxOpsPerUpload: 100,
  maxPayloadSizeBytes: 1_000_000, // 1MB
  downloadLimit: 1000,
  uploadRateLimit: { max: 100, windowMs: 60_000 },
  downloadRateLimit: { max: 200, windowMs: 60_000 },
  tombstoneRetentionMs: 90 * 24 * 60 * 60 * 1000, // 90 days
  opRetentionMs: 90 * 24 * 60 * 60 * 1000, // 90 days
  snapshotCacheTtlMs: 5 * 60 * 1000, // 5 minutes
  maxClockDriftMs: 60_000, // 60 seconds
  maxOpAgeMs: 30 * 24 * 60 * 60 * 1000, // 30 days
};
