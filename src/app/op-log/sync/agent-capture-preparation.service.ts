import { inject, Injectable } from '@angular/core';
import type {
  CapturePublicationRequest,
  OperationSyncCapable,
  PendingAgentCapture,
} from '@sp/sync-providers/provider-types';
import { DateService } from '../../core/date/date.service';
import { INBOX_PROJECT } from '../../features/project/project.const';
import { TaskService } from '../../features/tasks/task.service';
import { prepareMainTaskAdd } from '../../features/tasks/util/prepare-main-task-add';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { uuidv7 } from '../../util/uuid-v7';
import { ActionType, isFullStateOpType, Operation } from '../core/operation.types';
import { OperationLogStoreService } from '../persistence/operation-log-store.service';
import { CURRENT_SCHEMA_VERSION } from '../persistence/schema-migration.service';
import { SyncProviderManager } from '../sync-providers/provider-manager.service';
import { validateOperationPayload } from '../validation/validate-operation-payload';
import {
  findCapturePreparationBlocker,
  readCapturePreparationClock,
} from './capture-preparation-clock';
import { OperationEncryptionService } from './operation-encryption.service';
import { OperationWriteFlushService } from './operation-write-flush.service';
import { VectorClockService } from './vector-clock.service';

/** Prepares a capture for publication without applying or persisting its task. */
@Injectable({ providedIn: 'root' })
export class AgentCapturePreparationService {
  private readonly taskService = inject(TaskService);
  private readonly dateService = inject(DateService);
  private readonly opLogStore = inject(OperationLogStoreService);
  private readonly flush = inject(OperationWriteFlushService);
  private readonly clocks = inject(VectorClockService);
  private readonly encryption = inject(OperationEncryptionService);
  private readonly providerManager = inject(SyncProviderManager);

  async prepare(
    input: PendingAgentCapture,
    sync: OperationSyncCapable,
    fenceEpoch: number,
  ): Promise<CapturePublicationRequest & { taskId: string }> {
    this.providerManager.assertSyncEpochUnchanged(
      fenceEpoch,
      'capture preparation start',
    );
    if (sync.providerMode !== 'superSyncOps' || !sync.isEncryptionMandatory) {
      throw new Error('Capture preparation requires encrypted SuperSync');
    }
    const baseline = input.encryptionBaseline;
    if (!baseline || baseline.serverSeq < 1) {
      throw new Error('Capture preparation requires a current encrypted baseline');
    }

    const key = await sync.getEncryptKey?.();
    this.providerManager.assertSyncEpochUnchanged(fenceEpoch, 'capture encryption key');
    if (!key) throw new Error('Capture preparation requires an encryption key');

    // The server supplied this exact current full-state boundary with the queue
    // item. Verify its ciphertext with the key used for the candidate below.
    const page = await sync.downloadOps(baseline.serverSeq - 1, undefined, 1);
    this.providerManager.assertSyncEpochUnchanged(fenceEpoch, 'capture baseline probe');
    const delivered = page.ops[0];
    const op = delivered?.op;
    if (
      delivered?.serverSeq !== baseline.serverSeq ||
      op?.id !== baseline.opId ||
      !op.isPayloadEncrypted ||
      !isFullStateOpType(op.opType) ||
      (op.opType === 'REPAIR' && op.repairBaseServerSeq === undefined)
    ) {
      throw new Error(
        'Capture preparation could not verify the current encrypted baseline',
      );
    }
    await this.encryption.decryptOperation(op, key);
    this.providerManager.assertSyncEpochUnchanged(fenceEpoch, 'capture baseline decrypt');

    const prepared = await this.flush.flushThenRunExclusive(async () => {
      this.providerManager.assertSyncEpochUnchanged(fenceEpoch, 'capture preparation');
      this.opLogStore.clearVectorClockCache();
      const blocker = await findCapturePreparationBlocker(this.opLogStore);
      if (blocker)
        throw new Error(`Capture preparation needs an applied baseline: ${blocker}`);
      const clock = await readCapturePreparationClock(this.opLogStore, this.clocks);
      const lastKnownServerSeq = await sync.getLastServerSeq();
      this.providerManager.assertSyncEpochUnchanged(
        fenceEpoch,
        'capture preparation cutoff',
      );

      const taskId = `capture-${input.captureId}`;
      const action = prepareMainTaskAdd(
        {
          title: input.title,
          additional: {
            id: taskId,
            ...(input.notes !== null ? { notes: input.notes } : {}),
          },
          workContextId: INBOX_PROJECT.id,
          workContextType: WorkContextType.PROJECT,
          isIgnoreShortSyntax: true,
        },
        this.taskService.createNewTaskWithDefaults.bind(this.taskService),
        this.dateService,
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
          [input.publisherClientId]: input.captureCounter + 1,
        },
        timestamp: Date.now(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };
      if (!validateOperationPayload(candidate).success) {
        throw new Error('Invalid prepared capture payload');
      }
      return { candidate, lastKnownServerSeq, taskId };
    });

    const [candidate] = await this.encryption.encryptOperations(
      [prepared.candidate],
      key,
    );
    this.providerManager.assertSyncEpochUnchanged(
      fenceEpoch,
      'capture preparation complete',
    );
    return {
      captureId: input.captureId,
      candidate,
      lastKnownServerSeq: prepared.lastKnownServerSeq,
      expectedCaptureCounter: input.captureCounter,
      expectedDataGeneration: input.dataGeneration,
      verifiedEncryptionOpId: baseline.opId,
      taskId: prepared.taskId,
    };
  }
}
