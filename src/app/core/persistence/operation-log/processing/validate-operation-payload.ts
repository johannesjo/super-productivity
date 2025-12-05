import { Operation, EntityType, OpType } from '../operation.types';
import { OpLog } from '../../../log';

/**
 * Result of validating an operation payload.
 */
export interface PayloadValidationResult {
  success: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Maps EntityType to the expected payload key.
 */
const getEntityKeyFromType = (entityType: EntityType): string | null => {
  const mapping: Record<string, string> = {
    TASK: 'task',
    PROJECT: 'project',
    TAG: 'tag',
    NOTE: 'note',
    GLOBAL_CONFIG: 'globalConfig',
    SIMPLE_COUNTER: 'simpleCounter',
    WORK_CONTEXT: 'workContext',
    TASK_REPEAT_CFG: 'taskRepeatCfg',
    ISSUE_PROVIDER: 'issueProvider',
    PLANNER: 'planner',
    PLUGIN_USER_DATA: 'pluginUserData',
    PLUGIN_METADATA: 'pluginMetadata',
  };
  return mapping[entityType] || null;
};

/**
 * Attempts to find an entity-like object in the payload.
 * Used when the entity key doesn't match the expected pattern.
 */
const findEntityInPayload = (payload: Record<string, unknown>): unknown => {
  const entityKeys = [
    'task',
    'project',
    'tag',
    'note',
    'simpleCounter',
    'workContext',
    'taskRepeatCfg',
    'issueProvider',
  ];

  for (const key of entityKeys) {
    if (payload[key] && typeof payload[key] === 'object') {
      return payload[key];
    }
  }
  return null;
};

/**
 * Checks if an object looks like AppDataCompleteNew.
 */
const isLikelyAppDataComplete = (obj: unknown): boolean => {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  // Check for a few key properties that AppDataCompleteNew should have
  return 'task' in o || 'project' in o || 'globalConfig' in o;
};

/**
 * Validates CREATE operation payload.
 * Expects payload to contain the entity being created.
 */
const validateCreatePayload = (
  entityType: EntityType,
  payload: unknown,
): PayloadValidationResult => {
  const p = payload as Record<string, unknown>;
  const entityKey = getEntityKeyFromType(entityType);
  const warnings: string[] = [];

  // For create operations, we expect the entity to be in the payload
  const entity = entityKey ? p[entityKey] : findEntityInPayload(p);

  if (!entity) {
    // Warning rather than error - some creates might have different shapes
    warnings.push(`CREATE payload missing expected entity (${entityType})`);
    OpLog.warn(`[ValidateOperationPayload] ${warnings[0]}`, payload);
  } else if (typeof entity === 'object' && entity !== null) {
    // Basic ID check for the entity
    const entityObj = entity as Record<string, unknown>;
    if (!entityObj.id || typeof entityObj.id !== 'string') {
      return {
        success: false,
        error: `CREATE entity missing valid 'id' field`,
      };
    }
  }

  return { success: true, warnings: warnings.length > 0 ? warnings : undefined };
};

/**
 * Validates UPDATE operation payload.
 * Expects payload to contain entity ID and changes, or a task/entity with changes.
 */
const validateUpdatePayload = (
  entityType: EntityType,
  payload: unknown,
): PayloadValidationResult => {
  const p = payload as Record<string, unknown>;
  const warnings: string[] = [];

  // Update payloads can have various shapes:
  // 1. { task: { id, changes } } or { project: { id, changes } }
  // 2. { id, changes }
  // 3. { task: Task, ...otherProps } - for convertToMainTask etc.
  // 4. { tasks: Task[] } - for batch updates like moveToArchive

  const entityKey = getEntityKeyFromType(entityType);

  // Check for nested update shape: { task: { id, changes } }
  if (entityKey && p[entityKey]) {
    const nested = p[entityKey] as Record<string, unknown>;
    if (nested.id && nested.changes) {
      return { success: true };
    }
    // Could be a full entity for updates that pass the whole entity
    if (nested.id) {
      return { success: true };
    }
  }

  // Check for direct shape: { id, changes }
  if (p.id && typeof p.id === 'string') {
    return { success: true };
  }

  // Check for batch update shape: { tasks: Task[] }
  if (entityKey) {
    const pluralKey = entityKey + 's';
    if (Array.isArray(p[pluralKey])) {
      return { success: true };
    }
  }

  // Check if there's any entity-like object in payload
  const entity = findEntityInPayload(p);
  if (entity && typeof entity === 'object' && (entity as Record<string, unknown>).id) {
    return { success: true };
  }

  // Allow through with warning - updates have many shapes
  warnings.push(`UPDATE payload has unusual structure for ${entityType}`);
  OpLog.warn(`[ValidateOperationPayload] ${warnings[0]}`, payload);

  return { success: true, warnings };
};

/**
 * Validates DELETE operation payload.
 * Expects entityId/entityIds in operation or in payload.
 */
const validateDeletePayload = (
  entityType: EntityType,
  payload: unknown,
  entityId?: string,
  entityIds?: string[],
): PayloadValidationResult => {
  // entityId or entityIds should be on the operation itself
  if (entityId && typeof entityId === 'string') {
    return { success: true };
  }

  if (entityIds && Array.isArray(entityIds) && entityIds.length > 0) {
    const allStrings = entityIds.every((id) => typeof id === 'string');
    if (!allStrings) {
      return { success: false, error: 'DELETE entityIds must all be strings' };
    }
    return { success: true };
  }

  // Check payload for task/taskIds
  const p = payload as Record<string, unknown>;
  if (p.taskIds && Array.isArray(p.taskIds)) {
    return { success: true };
  }
  if (p.task && typeof p.task === 'object' && (p.task as Record<string, unknown>).id) {
    return { success: true };
  }

  // Allow through with warning
  OpLog.warn(
    `[ValidateOperationPayload] DELETE missing entityId/entityIds for ${entityType}`,
    payload,
  );
  return { success: true, warnings: ['DELETE missing entityId/entityIds'] };
};

/**
 * Validates MOVE operation payload.
 * Expects entityIds array for reordering.
 */
const validateMovePayload = (
  payload: unknown,
  entityIds?: string[],
): PayloadValidationResult => {
  // entityIds should be on the operation
  if (entityIds && Array.isArray(entityIds)) {
    return { success: true };
  }

  // Or in the payload
  const p = payload as Record<string, unknown>;
  if (p.ids && Array.isArray(p.ids)) {
    return { success: true };
  }
  if (p.taskIds && Array.isArray(p.taskIds)) {
    return { success: true };
  }

  OpLog.warn('[ValidateOperationPayload] MOVE missing ids array', payload);
  return { success: true, warnings: ['MOVE missing ids array'] };
};

/**
 * Validates BATCH operation payload.
 * Allows various batch structures through with minimal validation.
 */
const validateBatchPayload = (payload: unknown): PayloadValidationResult => {
  const p = payload as Record<string, unknown>;

  // Batch operations can have many shapes
  // Just ensure payload is not empty
  if (Object.keys(p).length === 0) {
    return { success: false, error: 'BATCH payload cannot be empty' };
  }

  return { success: true };
};

/**
 * Validates SYNC_IMPORT/BACKUP_IMPORT payload.
 * Expects appDataComplete structure.
 */
const validateFullStatePayload = (payload: unknown): PayloadValidationResult => {
  const p = payload as Record<string, unknown>;

  // Full state imports should have appDataComplete
  if (!p.appDataComplete && !isLikelyAppDataComplete(p)) {
    return {
      success: false,
      error: 'Full state import missing appDataComplete',
    };
  }

  const data = (p.appDataComplete || p) as Record<string, unknown>;

  // Check for at least some expected keys
  const expectedKeys = ['task', 'project', 'tag', 'globalConfig'];
  const hasExpectedKeys = expectedKeys.some((key) => key in data);

  if (!hasExpectedKeys) {
    return {
      success: false,
      error: 'Full state import missing expected data keys (task, project, tag, etc.)',
    };
  }

  return { success: true };
};

/**
 * Validates an operation payload before persisting to IndexedDB.
 *
 * This is Checkpoint A in the validation architecture.
 * - For CREATE/UPDATE operations: validates payload has required entity/id structure
 * - For DELETE operations: validates IDs are present
 * - For SYNC_IMPORT/BACKUP_IMPORT: validates appDataComplete structure exists
 * - For REPAIR: skips validation (internally generated)
 *
 * NOTE: This validation is intentionally lenient to start.
 * It checks structural requirements rather than deep entity validation.
 * Full Typia validation happens at state checkpoints (B, C, D).
 */
export const validateOperationPayload = (op: Operation): PayloadValidationResult => {
  // 1. Basic structural validation
  if (op.payload === null || op.payload === undefined) {
    return { success: false, error: 'Payload cannot be null or undefined' };
  }

  if (typeof op.payload !== 'object') {
    return { success: false, error: 'Payload must be an object' };
  }

  // 2. Validate based on operation type
  switch (op.opType) {
    case OpType.Create:
      return validateCreatePayload(op.entityType, op.payload);

    case OpType.Update:
      return validateUpdatePayload(op.entityType, op.payload);

    case OpType.Delete:
      return validateDeletePayload(op.entityType, op.payload, op.entityId, op.entityIds);

    case OpType.Move:
      return validateMovePayload(op.payload, op.entityIds);

    case OpType.Batch:
      return validateBatchPayload(op.payload);

    case OpType.SyncImport:
    case OpType.BackupImport:
      return validateFullStatePayload(op.payload);

    case OpType.Repair:
      // Repair operations are internally generated - skip validation
      return { success: true };

    default:
      OpLog.warn(
        `[ValidateOperationPayload] Unknown opType: ${op.opType}, allowing through`,
      );
      return { success: true };
  }
};
