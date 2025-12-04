import { Operation, OpType, EntityType } from '../../operation.types';
import { TestClient } from './test-client.helper';

/**
 * Factory for creating task operations with sensible defaults.
 *
 * @param client The TestClient creating the operation
 * @param taskId The task entity ID
 * @param opType The operation type (Create, Update, Delete)
 * @param payload The task data or changes
 * @returns A complete Operation
 */
export const createTaskOperation = (
  client: TestClient,
  taskId: string,
  opType: OpType,
  payload: Record<string, unknown>,
): Operation => {
  const actionTypeMap: Record<OpType, string> = {
    [OpType.Create]: '[Task] Add Task',
    [OpType.Update]: '[Task] Update Task',
    [OpType.Delete]: '[Task] Delete Task',
    [OpType.Move]: '[Task] Move',
    [OpType.Batch]: '[Task] Batch Update',
    [OpType.SyncImport]: '[Task] Sync Import',
    [OpType.BackupImport]: '[Task] Backup Import',
    [OpType.Repair]: '[Task] Repair',
  };

  return client.createOperation({
    actionType: actionTypeMap[opType] || '[Task] Update Task',
    opType,
    entityType: 'TASK',
    entityId: taskId,
    payload,
  });
};

/**
 * Factory for creating project operations.
 */
export const createProjectOperation = (
  client: TestClient,
  projectId: string,
  opType: OpType,
  payload: Record<string, unknown>,
): Operation => {
  const actionTypeMap: Record<OpType, string> = {
    [OpType.Create]: '[Project] Add Project',
    [OpType.Update]: '[Project] Update Project',
    [OpType.Delete]: '[Project] Delete Project',
    [OpType.Move]: '[Project] Move',
    [OpType.Batch]: '[Project] Batch Update',
    [OpType.SyncImport]: '[Project] Sync Import',
    [OpType.BackupImport]: '[Project] Backup Import',
    [OpType.Repair]: '[Project] Repair',
  };

  return client.createOperation({
    actionType: actionTypeMap[opType] || '[Project] Update Project',
    opType,
    entityType: 'PROJECT',
    entityId: projectId,
    payload,
  });
};

/**
 * Factory for creating tag operations.
 */
export const createTagOperation = (
  client: TestClient,
  tagId: string,
  opType: OpType,
  payload: Record<string, unknown>,
): Operation => {
  const actionTypeMap: Record<OpType, string> = {
    [OpType.Create]: '[Tag] Add Tag',
    [OpType.Update]: '[Tag] Update Tag',
    [OpType.Delete]: '[Tag] Delete Tag',
    [OpType.Move]: '[Tag] Move',
    [OpType.Batch]: '[Tag] Batch Update',
    [OpType.SyncImport]: '[Tag] Sync Import',
    [OpType.BackupImport]: '[Tag] Backup Import',
    [OpType.Repair]: '[Tag] Repair',
  };

  return client.createOperation({
    actionType: actionTypeMap[opType] || '[Tag] Update Tag',
    opType,
    entityType: 'TAG',
    entityId: tagId,
    payload,
  });
};

/**
 * Factory for creating a generic operation with full control.
 * Use this for edge cases or entity types without dedicated factories.
 */
export const createGenericOperation = (
  client: TestClient,
  entityType: EntityType,
  entityId: string,
  opType: OpType,
  actionType: string,
  payload: unknown,
): Operation => {
  return client.createOperation({
    actionType,
    opType,
    entityType,
    entityId,
    payload,
  });
};

/**
 * Creates a minimal task payload for testing.
 * Based on the Task model structure.
 */
export const createMinimalTaskPayload = (
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id,
  title: `Task ${id}`,
  created: Date.now(),
  timeSpent: 0,
  timeEstimate: 0,
  isDone: false,
  notes: '',
  tagIds: [],
  subTaskIds: [],
  attachments: [],
  ...overrides,
});

/**
 * Creates a minimal project payload for testing.
 */
export const createMinimalProjectPayload = (
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id,
  title: `Project ${id}`,
  ...overrides,
});

/**
 * Creates a minimal tag payload for testing.
 */
export const createMinimalTagPayload = (
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id,
  title: `Tag ${id}`,
  ...overrides,
});
