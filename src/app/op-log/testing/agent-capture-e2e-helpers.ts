import { Injector } from '@angular/core';
import { Action, Store } from '@ngrx/store';
import { INBOX_PROJECT } from '../../features/project/project.const';
import { TaskService } from '../../features/tasks/task.service';
import { TaskSharedActions } from '../../root-store/meta/task-shared.actions';
import { OperationLogCompactionService } from '../persistence/operation-log-compaction.service';
import { OperationLogStoreService } from '../persistence/operation-log-store.service';
import { OperationWriteFlushService } from '../sync/operation-write-flush.service';
import { prepareMainTaskAdd } from '../../features/tasks/util/prepare-main-task-add';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { DateService } from '../../core/date/date.service';
import { VectorClockService } from '../sync/vector-clock.service';
import {
  findCapturePreparationBlocker,
  readCapturePreparationClock,
} from './capture-preparation-clock';
import { SyncCycleGuardService } from '../sync/sync-cycle-guard.service';
import { SyncProviderManager } from '../sync-providers/provider-manager.service';
import { WrappedProviderService } from '../sync-providers/wrapped-provider.service';
import { OperationEncryptionService } from '../sync/operation-encryption.service';
import { SyncOperation } from '../sync-providers/provider.interface';
import { Operation, ActionType } from '../core/operation.types';
import { CURRENT_SCHEMA_VERSION } from '../persistence/schema-migration.service';
import { uuidv7 } from '../../util/uuid-v7';
import { validateOperationPayload } from '../validation/validate-operation-payload';

interface CaptureTaskInput {
  captureId: string;
  title: string;
  notes?: string;
}

interface AgentCaptureE2eHelpers {
  prepareCapturePublication: (
    input: CaptureTaskInput & { publisherClientId: string; publisherCounter: number },
  ) => Promise<{
    candidate: SyncOperation;
    lastKnownServerSeq: number;
    expectedCaptureCounter: number;
    taskId: string;
  }>;
  addCaptureTask: (
    input: CaptureTaskInput,
  ) => Promise<{ taskId: string; operationId: string }>;
  flushPendingWrites: () => Promise<void>;
  compactOperationLog: () => Promise<boolean>;
}

/**
 * Dev-only consume-on-accept experiment entry. This stands in for queue-consumer
 * plumbing, not a production API. The scoped dispatch decoration adds only the
 * capture identity to the actual TaskService.add action; reducers, op capture,
 * clock allocation, persistence and upload use the normal application pipeline.
 */
export const createAgentCaptureE2eHelpers = (
  injector: Injector,
): AgentCaptureE2eHelpers => {
  const store = injector.get(Store);
  const taskService = injector.get(TaskService);
  const opLogStore = injector.get(OperationLogStoreService);
  const flush = injector.get(OperationWriteFlushService);

  return {
    prepareCapturePublication: async (input) => {
      const cycle = injector.get(SyncCycleGuardService);
      if (!cycle.tryBegin())
        throw new Error('Capture preparation requires an idle sync cycle');
      const manager = injector.get(SyncProviderManager);
      const provider = manager.getActiveProvider();
      const epoch = manager.syncEpoch;
      try {
        const sync = await injector
          .get(WrappedProviderService)
          .getOperationSyncCapable(provider, { fenceEpoch: epoch });
        if (!sync || sync.providerMode !== 'superSyncOps')
          throw new Error('Capture preparation requires SuperSync');
        const prepared = await flush.flushThenRunExclusive(async () => {
          manager.assertSyncEpochUnchanged(epoch, 'capture preparation');
          opLogStore.clearVectorClockCache();
          // Refuse before building anything: an unapplied download would
          // otherwise reach both the candidate clock and the task itself.
          const blocker = await findCapturePreparationBlocker(opLogStore);
          if (blocker)
            throw new Error(`Capture preparation needs an applied baseline: ${blocker}`);
          const clock = await readCapturePreparationClock(
            opLogStore,
            injector.get(VectorClockService),
          );
          // Keep the exact preparation cursor with this candidate. A later sync
          // must never replace it with a newer cursor when submitting old work.
          const lastKnownServerSeq = await sync.getLastServerSeq();
          const taskId = `capture-${input.captureId}`;
          const action = prepareMainTaskAdd(
            {
              title: input.title,
              additional: {
                id: taskId,
                ...(input.notes !== undefined ? { notes: input.notes } : {}),
              },
              workContextId: INBOX_PROJECT.id,
              workContextType: WorkContextType.PROJECT,
              isIgnoreShortSyntax: true,
            },
            taskService.createNewTaskWithDefaults.bind(taskService),
            injector.get(DateService),
          );
          const { type, meta, ...actionPayload } = action;
          const candidate: Operation = {
            id: uuidv7(),
            actionType: type as ActionType,
            opType: meta.opType,
            entityType: meta.entityType,
            entityId: taskId,
            entityIds: [taskId],
            payload: { actionPayload, entityChanges: [] },
            clientId: input.publisherClientId,
            vectorClock: {
              ...clock,
              [input.publisherClientId]: input.publisherCounter + 1,
            },
            timestamp: Date.now(),
            schemaVersion: CURRENT_SCHEMA_VERSION,
          };
          if (!validateOperationPayload(candidate).success)
            throw new Error('Invalid prepared capture payload');
          return {
            candidate,
            lastKnownServerSeq,
            taskId,
            expectedCaptureCounter: input.publisherCounter,
          };
        });
        const key = await sync.getEncryptKey?.();
        if (!key)
          throw new Error('Encrypted capture experiment requires an encryption key');
        const [candidate] = await injector
          .get(OperationEncryptionService)
          .encryptOperations([prepared.candidate], key);
        manager.assertSyncEpochUnchanged(epoch, 'capture preparation complete');
        // No dispatch, local log append, own-clock reservation, or cursor update.
        // The test publisher owns the virtual actor's counter transactionally.
        return { ...prepared, candidate };
      } finally {
        cycle.end();
      }
    },
    addCaptureTask: async (
      input: CaptureTaskInput,
    ): Promise<{ taskId: string; operationId: string }> => {
      await flush.flushPendingWrites();
      const previousSeq = await opLogStore.getLastSeq();
      const taskId = `capture-${input.captureId}`;
      const originalDispatch = store.dispatch;
      const dispatchAction = originalDispatch.bind(store) as (action: Action) => void;
      store.dispatch = ((action: Action): void => {
        const add = action as ReturnType<typeof TaskSharedActions.addTask>;
        const decorated =
          action.type === TaskSharedActions.addTask.type && add.task.id === taskId
            ? { ...add, meta: { ...add.meta, captureId: input.captureId } }
            : action;
        dispatchAction(decorated);
      }) as typeof store.dispatch;
      try {
        taskService.add(
          input.title,
          false,
          {
            id: taskId,
            projectId: INBOX_PROJECT.id,
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
          },
          false,
          true,
        );
      } finally {
        store.dispatch = originalDispatch;
      }
      await flush.flushPendingWrites();
      const operation = (await opLogStore.getOpsAfterSeq(previousSeq)).find(
        (entry) => entry.op.captureId === input.captureId,
      );
      if (!operation) {
        throw new Error('Capture add did not produce a durable operation');
      }
      return { taskId, operationId: operation.op.id };
    },
    flushPendingWrites: (): Promise<void> => flush.flushPendingWrites(),
    compactOperationLog: async (): Promise<boolean> => {
      await flush.flushPendingWrites();
      return injector.get(OperationLogCompactionService).compact();
    },
  };
};
