/**
 * ValidationService - Validates incoming operations
 *
 * Extracted from SyncService for better separation of concerns.
 * This service is stateless and has no database dependencies.
 */
import {
  Operation,
  OP_TYPES,
  SyncConfig,
  SYNC_ERROR_CODES,
  SyncErrorCode,
  sanitizeVectorClock,
  validatePayload,
} from '../sync.types';

/**
 * Valid entity types for operations.
 * Must match the EntityType union in the client's operation.types.ts.
 * Operations with unknown entity types will be rejected.
 */
export const ALLOWED_ENTITY_TYPES = new Set([
  'TASK',
  'PROJECT',
  'TAG',
  'NOTE',
  'GLOBAL_CONFIG',
  'TIME_TRACKING',
  'SIMPLE_COUNTER',
  'WORK_CONTEXT',
  'TASK_REPEAT_CFG',
  'ISSUE_PROVIDER',
  'PLANNER',
  'MENU_TREE',
  'METRIC',
  'BOARD',
  'REMINDER',
  'MIGRATION',
  'RECOVERY',
  'ALL',
  'PLUGIN_USER_DATA',
  'PLUGIN_METADATA',
]);

export interface ValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: SyncErrorCode;
}

export class ValidationService {
  constructor(private readonly config: SyncConfig) {}

  /**
   * Validates an operation for correctness before processing.
   * Mutates op.vectorClock if sanitization is needed.
   */
  validateOp(op: Operation, requestClientId: string): ValidationResult {
    // Validate clientId matches request
    if (op.clientId !== requestClientId) {
      return {
        valid: false,
        error: `Operation clientId "${op.clientId}" does not match request clientId "${requestClientId}"`,
        errorCode: SYNC_ERROR_CODES.INVALID_CLIENT_ID,
      };
    }

    if (!op.id || typeof op.id !== 'string') {
      return {
        valid: false,
        error: 'Invalid operation ID',
        errorCode: SYNC_ERROR_CODES.INVALID_OP_ID,
      };
    }
    if (op.id.length > 255) {
      return {
        valid: false,
        error: 'Operation ID too long',
        errorCode: SYNC_ERROR_CODES.INVALID_OP_ID,
      };
    }
    if (!op.opType || !OP_TYPES.includes(op.opType)) {
      return {
        valid: false,
        error: 'Invalid opType',
        errorCode: SYNC_ERROR_CODES.INVALID_OP_TYPE,
      };
    }
    if (!op.entityType) {
      return {
        valid: false,
        error: 'Missing entityType',
        errorCode: SYNC_ERROR_CODES.INVALID_ENTITY_TYPE,
      };
    }
    if (!ALLOWED_ENTITY_TYPES.has(op.entityType)) {
      return {
        valid: false,
        error: `Invalid entityType: ${op.entityType}`,
        errorCode: SYNC_ERROR_CODES.INVALID_ENTITY_TYPE,
      };
    }
    if (op.entityId !== undefined && op.entityId !== null) {
      if (typeof op.entityId !== 'string' || op.entityId.length > 255) {
        return {
          valid: false,
          error: 'Invalid entityId format or length',
          errorCode: SYNC_ERROR_CODES.INVALID_ENTITY_ID,
        };
      }
    }
    if (op.opType === 'DEL' && !op.entityId) {
      return {
        valid: false,
        error: 'DEL operation requires entityId',
        errorCode: SYNC_ERROR_CODES.MISSING_ENTITY_ID,
      };
    }
    if (op.payload === undefined) {
      return {
        valid: false,
        error: 'Missing payload',
        errorCode: SYNC_ERROR_CODES.INVALID_PAYLOAD,
      };
    }
    if (op.schemaVersion !== undefined) {
      if (op.schemaVersion < 1 || op.schemaVersion > 100) {
        return {
          valid: false,
          error: `Invalid schema version: ${op.schemaVersion}`,
          errorCode: SYNC_ERROR_CODES.INVALID_SCHEMA_VERSION,
        };
      }
    }

    const clockValidation = sanitizeVectorClock(op.vectorClock);
    if (!clockValidation.valid) {
      return {
        valid: false,
        error: clockValidation.error,
        errorCode: SYNC_ERROR_CODES.INVALID_VECTOR_CLOCK,
      };
    }
    op.vectorClock = clockValidation.clock;

    const isFullStateOp =
      op.opType === 'SYNC_IMPORT' ||
      op.opType === 'BACKUP_IMPORT' ||
      op.opType === 'REPAIR';
    if (!isFullStateOp && !this.validatePayloadComplexity(op.payload)) {
      return {
        valid: false,
        error: 'Payload too complex (max depth 20, max keys 20000)',
        errorCode: SYNC_ERROR_CODES.INVALID_PAYLOAD,
      };
    }

    const payloadSize = JSON.stringify(op.payload).length;
    if (payloadSize > this.config.maxPayloadSizeBytes) {
      return {
        valid: false,
        error: 'Payload too large',
        errorCode: SYNC_ERROR_CODES.PAYLOAD_TOO_LARGE,
      };
    }

    const payloadValidation = validatePayload(op.opType, op.payload);
    if (!payloadValidation.valid) {
      return {
        valid: false,
        error: payloadValidation.error,
        errorCode: SYNC_ERROR_CODES.INVALID_PAYLOAD,
      };
    }

    const now = Date.now();
    if (op.timestamp > now + this.config.maxClockDriftMs) {
      return {
        valid: false,
        error: 'Timestamp too far in future',
        errorCode: SYNC_ERROR_CODES.INVALID_TIMESTAMP,
      };
    }
    if (op.timestamp < now - this.config.retentionMs) {
      return {
        valid: false,
        error: 'Operation too old',
        errorCode: SYNC_ERROR_CODES.INVALID_TIMESTAMP,
      };
    }

    return { valid: true };
  }

  /**
   * Validates payload complexity to prevent DoS attacks via deeply nested objects.
   */
  validatePayloadComplexity(
    payload: unknown,
    maxDepth: number = 20,
    maxKeys: number = 20000,
  ): boolean {
    let totalKeys = 0;

    const checkDepth = (obj: unknown, depth: number): boolean => {
      if (depth > maxDepth) return false;
      if (obj === null || typeof obj !== 'object') return true;

      if (Array.isArray(obj)) {
        totalKeys += obj.length;
        if (totalKeys > maxKeys) return false;
        return obj.every((item) => checkDepth(item, depth + 1));
      }

      const keys = Object.keys(obj);
      totalKeys += keys.length;
      if (totalKeys > maxKeys) return false;

      return keys.every((key) =>
        checkDepth((obj as Record<string, unknown>)[key], depth + 1),
      );
    };

    return checkDepth(payload, 0);
  }
}
