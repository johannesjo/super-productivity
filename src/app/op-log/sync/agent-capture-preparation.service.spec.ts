import { TestBed } from '@angular/core/testing';
import type {
  OperationSyncCapable,
  PendingAgentCapture,
  SyncOperation,
} from '@sp/sync-providers/provider-types';
import { DateService } from '../../core/date/date.service';
import { TaskService } from '../../features/tasks/task.service';
import { OperationLogStoreService } from '../persistence/operation-log-store.service';
import { SyncProviderManager } from '../sync-providers/provider-manager.service';
import { AgentCapturePreparationService } from './agent-capture-preparation.service';
import { OperationEncryptionService } from './operation-encryption.service';
import { OperationWriteFlushService } from './operation-write-flush.service';
import { VectorClockService } from './vector-clock.service';

describe('AgentCapturePreparationService baseline fence', () => {
  const pending: PendingAgentCapture = {
    captureId: 'capture-1',
    title: 'New task',
    notes: null,
    publisherClientId: 'agent-capture-1',
    captureCounter: 0,
    dataGeneration: 2,
    encryptionBaseline: { opId: 'current-import', serverSeq: 8 },
  };
  const encryptedImport = {
    id: 'current-import',
    opType: 'SYNC_IMPORT',
    isPayloadEncrypted: true,
  } as SyncOperation;
  let service: AgentCapturePreparationService;
  let flush: jasmine.SpyObj<OperationWriteFlushService>;
  let encryption: jasmine.SpyObj<OperationEncryptionService>;
  let manager: jasmine.SpyObj<SyncProviderManager>;
  let downloadOps: jasmine.Spy;
  let sync: OperationSyncCapable;

  beforeEach(() => {
    flush = jasmine.createSpyObj('OperationWriteFlushService', ['flushThenRunExclusive']);
    encryption = jasmine.createSpyObj('OperationEncryptionService', [
      'decryptOperation',
      'encryptOperations',
    ]);
    manager = jasmine.createSpyObj('SyncProviderManager', ['assertSyncEpochUnchanged']);
    downloadOps = jasmine.createSpy('downloadOps').and.resolveTo({
      ops: [{ serverSeq: 8, op: encryptedImport, receivedAt: 0 }],
      latestSeq: 8,
      hasMore: false,
    });
    sync = {
      providerMode: 'superSyncOps',
      isEncryptionMandatory: true,
      getEncryptKey: async () => 'test-key',
      downloadOps,
    } as unknown as OperationSyncCapable;
    TestBed.configureTestingModule({
      providers: [
        AgentCapturePreparationService,
        { provide: TaskService, useValue: {} },
        { provide: DateService, useValue: {} },
        { provide: OperationLogStoreService, useValue: {} },
        { provide: OperationWriteFlushService, useValue: flush },
        { provide: VectorClockService, useValue: {} },
        { provide: OperationEncryptionService, useValue: encryption },
        { provide: SyncProviderManager, useValue: manager },
      ],
    });
    service = TestBed.inject(AgentCapturePreparationService);
  });

  it('refuses an operation other than the exact server-supplied baseline before preparing state', async () => {
    downloadOps.and.resolveTo({
      ops: [{ serverSeq: 8, op: { ...encryptedImport, id: 'older-import' } }],
      latestSeq: 8,
      hasMore: false,
    });

    await expectAsync(service.prepare(pending, sync, 4)).toBeRejectedWithError(
      'Capture preparation could not verify the current encrypted baseline',
    );
    expect(downloadOps).toHaveBeenCalledOnceWith(7, undefined, 1);
    expect(encryption.decryptOperation).not.toHaveBeenCalled();
    expect(flush.flushThenRunExclusive).not.toHaveBeenCalled();
  });

  it('abandons preparation when the sync epoch changes during the baseline read', async () => {
    manager.assertSyncEpochUnchanged.and.callFake((_epoch, context) => {
      if (context === 'capture baseline probe') throw new Error('stale epoch');
    });

    await expectAsync(service.prepare(pending, sync, 4)).toBeRejectedWithError(
      'stale epoch',
    );
    expect(encryption.decryptOperation).not.toHaveBeenCalled();
    expect(flush.flushThenRunExclusive).not.toHaveBeenCalled();
  });
});
