import { Operation } from './operation.types';
import { PersistentAction } from './persistent-action.interface';

export const convertOpToAction = (op: Operation): PersistentAction => {
  return {
    type: op.actionType,
    ...(op.payload as object),
    meta: {
      isPersistent: true,
      entityType: op.entityType,
      entityId: op.entityId,
      entityIds: op.entityIds,
      opType: op.opType,
      isRemote: true, // Important to prevent re-logging during replay/sync
    },
  };
};
