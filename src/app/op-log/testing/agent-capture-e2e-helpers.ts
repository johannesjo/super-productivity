import { Injector } from '@angular/core';
import { Action, Store } from '@ngrx/store';
import { INBOX_PROJECT } from '../../features/project/project.const';
import { TaskService } from '../../features/tasks/task.service';
import { TaskSharedActions } from '../../root-store/meta/task-shared.actions';
import { OperationLogCompactionService } from '../persistence/operation-log-compaction.service';
import { OperationLogStoreService } from '../persistence/operation-log-store.service';
import { OperationWriteFlushService } from '../sync/operation-write-flush.service';
import { SyncCycleGuardService } from '../sync/sync-cycle-guard.service';
import { SyncProviderManager } from '../sync-providers/provider-manager.service';
import { WrappedProviderService } from '../sync-providers/wrapped-provider.service';
import { SyncOperation } from '../sync-providers/provider.interface';
import { AgentCapturePreparationService } from '../sync/agent-capture-preparation.service';

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
    verifiedEncryptionOpId: string;
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
        const baseline = (await sync.downloadOps(0, undefined, 1)).ops[0];
        const prepared = await injector.get(AgentCapturePreparationService).prepare(
          {
            captureId: input.captureId,
            title: input.title,
            notes: input.notes ?? null,
            publisherClientId: input.publisherClientId,
            captureCounter: input.publisherCounter,
            // The E2E harness supplies the actual queue generation separately.
            dataGeneration: 0,
            ...(baseline
              ? {
                  encryptionBaseline: {
                    opId: baseline.op.id,
                    serverSeq: baseline.serverSeq,
                  },
                }
              : {}),
          },
          sync,
          epoch,
        );
        if (!prepared.verifiedEncryptionOpId) {
          throw new Error('Capture preparation did not verify encryption');
        }
        return { ...prepared, verifiedEncryptionOpId: prepared.verifiedEncryptionOpId };
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
