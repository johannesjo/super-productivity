import { ActionType, ENTITY_TYPES, EntityType } from '../core/operation.types';

export const SYNC_MULTI_ENTITY_UNSUPPORTED_CODE =
  'SYNC_MULTI_ENTITY_UNSUPPORTED' as const;

const UNKNOWN = 'UNKNOWN' as const;
const MAX_ACTION_TYPES = 3;
const MAX_ENTITY_COUNT = 999;
const MAX_ENTITY_ID_LENGTH = 64;
const ENTITY_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const ACTION_TYPE_VALUES = new Set<string>(Object.values(ActionType));
const ENTITY_TYPE_VALUES = new Set<string>(ENTITY_TYPES);

type ConflictSide = 'local' | 'remote';
type SanitizedEntityCount = number | '999+' | typeof UNKNOWN;

interface ConflictOperationMetadata {
  readonly actionType?: unknown;
  readonly entityId?: unknown;
  readonly entityIds?: unknown;
}

export interface ConflictGuardDiagnosticLogMetadata {
  readonly code: typeof SYNC_MULTI_ENTITY_UNSUPPORTED_CODE;
  readonly side: ConflictSide;
  readonly actionTypes: readonly string[];
  readonly entityType: EntityType | typeof UNKNOWN;
  readonly entityCount: SanitizedEntityCount;
  readonly entityId: string;
}

interface ConflictGuardDiagnosticInput {
  readonly side: ConflictSide;
  readonly operations: readonly ConflictOperationMetadata[];
  readonly entityType: unknown;
  readonly entityId: unknown;
}

const sanitizeActionTypes = (
  operations: readonly ConflictOperationMetadata[],
): string[] => {
  const values = operations.map(({ actionType }) =>
    typeof actionType === 'string' && ACTION_TYPE_VALUES.has(actionType)
      ? actionType
      : UNKNOWN,
  );
  const sorted = [...new Set(values.length > 0 ? values : [UNKNOWN])].sort();
  if (sorted.length <= MAX_ACTION_TYPES) {
    return sorted;
  }
  return [...sorted.slice(0, MAX_ACTION_TYPES), `+${sorted.length - MAX_ACTION_TYPES}`];
};

const getEntityCount = (
  operations: readonly ConflictOperationMetadata[],
): SanitizedEntityCount => {
  const entityIds = new Set<string>();
  let isMalformed = false;

  for (const operation of operations) {
    if (operation.entityId !== undefined) {
      if (typeof operation.entityId === 'string' && operation.entityId.length > 0) {
        entityIds.add(operation.entityId);
      } else {
        isMalformed = true;
      }
    }
    if (operation.entityIds !== undefined) {
      if (!Array.isArray(operation.entityIds)) {
        isMalformed = true;
      } else {
        for (const entityId of operation.entityIds) {
          if (typeof entityId === 'string' && entityId.length > 0) {
            entityIds.add(entityId);
          } else {
            isMalformed = true;
          }
        }
      }
    }
  }

  if (isMalformed || entityIds.size === 0) {
    return UNKNOWN;
  }
  return entityIds.size > MAX_ENTITY_COUNT ? '999+' : entityIds.size;
};

const sanitizeEntityType = (entityType: unknown): EntityType | typeof UNKNOWN =>
  typeof entityType === 'string' && ENTITY_TYPE_VALUES.has(entityType)
    ? (entityType as EntityType)
    : UNKNOWN;

const sanitizeEntityId = (entityId: unknown): string =>
  typeof entityId === 'string' && ENTITY_ID_PATTERN.test(entityId)
    ? entityId.slice(0, MAX_ENTITY_ID_LENGTH)
    : UNKNOWN;

export const buildConflictGuardDiagnostic = ({
  side,
  operations,
  entityType,
  entityId,
}: ConflictGuardDiagnosticInput): {
  message: string;
  logMetadata: ConflictGuardDiagnosticLogMetadata;
} => {
  const actionTypes = sanitizeActionTypes(operations);
  const sanitizedEntityType = sanitizeEntityType(entityType);
  const entityCount = getEntityCount(operations);
  const logMetadata: ConflictGuardDiagnosticLogMetadata = {
    code: SYNC_MULTI_ENTITY_UNSUPPORTED_CODE,
    side,
    actionTypes,
    entityType: sanitizedEntityType,
    entityCount,
    entityId: sanitizeEntityId(entityId),
  };

  return {
    message:
      `${SYNC_MULTI_ENTITY_UNSUPPORTED_CODE} side=${side} ` +
      `actionTypes=${actionTypes.join('|')} entityType=${sanitizedEntityType} ` +
      `entityCount=${entityCount}`,
    logMetadata,
  };
};
