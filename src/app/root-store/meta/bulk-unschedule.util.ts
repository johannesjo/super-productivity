import { Update } from '@ngrx/entity';
import { Task } from '../../features/tasks/task.model';

export const BULK_UNSCHEDULE_MARKER = 'isBulkUnschedule';

type BulkUnscheduleTaskUpdate = Update<Task> & {
  id: string;
  changes: Pick<Task, 'dueDay' | 'dueWithTime' | 'remindAt'>;
};

const isValidTaskId = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isBulkUnscheduleTaskUpdate = (
  value: unknown,
): value is BulkUnscheduleTaskUpdate => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const update = value as Record<string, unknown>;
  if (!isValidTaskId(update['id'])) {
    return false;
  }

  const changes = update['changes'];
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    return false;
  }

  const scheduleChanges = changes as Record<string, unknown>;
  return (
    'dueDay' in scheduleChanges &&
    scheduleChanges['dueDay'] === undefined &&
    'dueWithTime' in scheduleChanges &&
    scheduleChanges['dueWithTime'] === undefined &&
    'remindAt' in scheduleChanges &&
    scheduleChanges['remindAt'] === undefined
  );
};

/**
 * Bulk unscheduling deliberately uses the released `updateTasks` action so
 * older clients can clear the task schedule even though they do not know the
 * marker. New clients use the marker only after the payload has proven to
 * cover exactly the operation's declared conflict scope.
 */
export const getValidatedBulkUnscheduleUpdates = (
  payload: Record<string, unknown>,
  entityIds: readonly string[] | undefined,
): BulkUnscheduleTaskUpdate[] | null => {
  if (payload[BULK_UNSCHEDULE_MARKER] !== true || !Array.isArray(entityIds)) {
    return null;
  }

  if (
    entityIds.length === 0 ||
    new Set(entityIds).size !== entityIds.length ||
    !entityIds.every(isValidTaskId) ||
    !Array.isArray(payload['tasks'])
  ) {
    return null;
  }

  const updates = payload['tasks'];
  if (updates.length !== entityIds.length) {
    return null;
  }

  const validUpdates: BulkUnscheduleTaskUpdate[] = [];
  for (let index = 0; index < updates.length; index++) {
    const update = updates[index];
    if (!isBulkUnscheduleTaskUpdate(update) || update.id !== entityIds[index]) {
      return null;
    }
    validUpdates.push(update);
  }

  return validUpdates;
};

export const isValidatedBulkUnschedulePayload = (
  payload: Record<string, unknown>,
  entityIds: readonly string[] | undefined,
): boolean => getValidatedBulkUnscheduleUpdates(payload, entityIds) !== null;
