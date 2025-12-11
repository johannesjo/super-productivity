import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OperationLogSyncService } from '../sync/operation-log-sync.service';
import { OperationLogUploadService } from '../sync/operation-log-upload.service';
import { OperationLogDownloadService } from '../sync/operation-log-download.service';
import { OperationEncryptionService } from '../sync/operation-encryption.service';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { VectorClockService } from '../sync/vector-clock.service';
import { OperationApplierService } from '../processing/operation-applier.service';
import { ConflictResolutionService } from '../sync/conflict-resolution.service';
import { ValidateStateService } from '../processing/validate-state.service';
import { RepairOperationService } from '../processing/repair-operation.service';
import { PfapiStoreDelegateService } from '../../../../pfapi/pfapi-store-delegate.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import {
  SyncProviderServiceInterface,
  OperationSyncCapable,
  OpUploadResponse,
  OpDownloadResponse,
  SyncOperation,
} from '../../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../../pfapi/api/pfapi.const';
import { SuperSyncPrivateCfg } from '../../../../pfapi/api/sync/providers/super-sync/super-sync.model';
import { provideMockStore } from '@ngrx/store/testing';
import { OpType, Operation } from '../operation.types';
import { MatDialog } from '@angular/material/dialog';
import { UserInputWaitStateService } from '../../../../imex/sync/user-input-wait-state.service';
import { SnackService } from '../../../snack/snack.service';
import { resetTestUuidCounter } from './helpers/test-client.helper';
import { OperationLogManifestService } from '../store/operation-log-manifest.service';
import { LockService } from '../sync/lock.service';
import { DependencyResolverService } from '../sync/dependency-resolver.service';
import { SchemaMigrationService } from '../store/schema-migration.service';
import { decrypt, encrypt } from '../../../../pfapi/api/encryption/encryption';

// Mock Sync Provider that supports operation sync
class MockOperationSyncProvider
  implements SyncProviderServiceInterface<SyncProviderId>, OperationSyncCapable
{
  id = SyncProviderId.SuperSync;
  supportsOperationSync = true;
  maxConcurrentRequests = 1;

  // Mock configuration
  private _privateCfg: SuperSyncPrivateCfg = {
    accessToken: 'test-token',
    baseUrl: 'https://test.supersync.com',
    isEncryptionEnabled: false,
    encryptKey: undefined,
  };

  private _lastServerSeq = 0;
  private _uploadedOps: SyncOperation[] = [];

  // Mocks for configuration loading
  privateCfg = {
    load: async () => this._privateCfg,
  } as any;

  // Configuration helper
  setEncryption(enabled: boolean, key?: string): void {
    this._privateCfg.isEncryptionEnabled = enabled;
    this._privateCfg.encryptKey = key;
  }

  // Last Server Seq handling
  async getLastServerSeq(): Promise<number> {
    return this._lastServerSeq;
  }

  async setLastServerSeq(seq: number): Promise<void> {
    this._lastServerSeq = seq;
  }

  // Operation Sync API
  async uploadOps(
    ops: SyncOperation[],
    clientId: string,
    lastKnownServerSeq: number,
  ): Promise<OpUploadResponse> {
    this._uploadedOps.push(...ops);
    const results = ops.map((op) => ({
      opId: op.id,
      accepted: true,
      serverSeq: ++this._lastServerSeq,
    }));
    return { results, latestSeq: this._lastServerSeq };
  }

  async downloadOps(
    sinceSeq: number,
    excludeClient: string,
    limit: number,
  ): Promise<OpDownloadResponse> {
    // For simplicity, returns all uploaded ops that match criteria
    const newOps = this._uploadedOps
      .filter((op) => op.clientId !== excludeClient)
      .slice(0, limit)
      .map((op) => ({
        op,
        serverSeq: 1, // simplified
        receivedAt: Date.now(),
      }));

    return { ops: newOps, hasMore: false, latestSeq: this._lastServerSeq };
  }

  async uploadSnapshot(
    state: any,
    clientId: string,
    reason: string,
    vectorClock: any,
    schemaVersion: number,
  ): Promise<any> {
    return { accepted: true, serverSeq: ++this._lastServerSeq };
  }

  // Accessor for assertions
  getUploadedOps(): SyncOperation[] {
    return this._uploadedOps;
  }

  clearUploadedOps(): void {
    this._uploadedOps = [];
  }

  // Stub other required methods
  async init(): Promise<void> {}
  async isReady(): Promise<boolean> {
    return true;
  }
  async setPrivateCfg(cfg: any): Promise<void> {
    this._privateCfg = cfg;
  }

  async getFileRev(
    targetPath: string,
    localRev: string | null,
  ): Promise<{ rev: string }> {
    return { rev: 'rev' };
  }
  async downloadFile(targetPath: string): Promise<{ rev: string; dataStr: string }> {
    return { rev: 'rev', dataStr: '{}' };
  }
  async uploadFile(
    targetPath: string,
    dataStr: string,
    revToMatch: string | null,
    isForceOverwrite?: boolean,
  ): Promise<{ rev: string }> {
    return { rev: 'new-rev' };
  }
  async removeFile(targetPath: string): Promise<void> {}
}

describe('Service Logic Integration', () => {
  let syncService: OperationLogSyncService;
  let opLogStore: OperationLogStoreService;
  let mockProvider: MockOperationSyncProvider;
  let conflictServiceSpy: jasmine.SpyObj<ConflictResolutionService>;
  let applierSpy: jasmine.SpyObj<OperationApplierService>;

  beforeEach(async () => {
    // Spies for dependencies we don't want to execute fully
    conflictServiceSpy = jasmine.createSpyObj('ConflictResolutionService', [
      'presentConflicts',
    ]);
    applierSpy = jasmine.createSpyObj('OperationApplierService', ['applyOperations']);

    // Create spy properly before using in TestBed
    const waitServiceSpy = jasmine.createSpyObj('UserInputWaitStateService', [
      'startWaiting',
    ]);
    waitServiceSpy.startWaiting.and.returnValue(() => {});

    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) });

    TestBed.configureTestingModule({
      providers: [
        OperationLogSyncService,
        OperationLogUploadService,
        OperationLogDownloadService,
        OperationEncryptionService,
        OperationLogStoreService,
        OperationLogManifestService,
        LockService,
        VectorClockService,
        DependencyResolverService,
        SchemaMigrationService,
        provideMockStore(),
        { provide: ConflictResolutionService, useValue: conflictServiceSpy },
        { provide: OperationApplierService, useValue: applierSpy },
        {
          provide: ValidateStateService,
          useValue: jasmine.createSpyObj('ValidateStateService', [
            'validateAndRepairCurrentState',
          ]),
        },
        {
          provide: RepairOperationService,
          useValue: jasmine.createSpyObj('RepairOperationService', [
            'createRepairOperation',
          ]),
        },
        {
          provide: PfapiStoreDelegateService,
          useValue: jasmine.createSpyObj('PfapiStoreDelegateService', [
            'getAllSyncModelDataFromStore',
          ]),
        },
        {
          provide: PfapiService,
          useValue: {
            pf: {
              metaModel: {
                loadClientId: jasmine
                  .createSpy('loadClientId')
                  .and.returnValue(Promise.resolve('test-client-id')),
              },
            },
          },
        },
        {
          provide: SnackService,
          useValue: jasmine.createSpyObj('SnackService', ['open']),
        },
        {
          provide: MatDialog,
          useValue: dialogSpy,
        },
        {
          provide: UserInputWaitStateService,
          useValue: waitServiceSpy,
        },
      ],
    });

    syncService = TestBed.inject(OperationLogSyncService);
    opLogStore = TestBed.inject(OperationLogStoreService);

    mockProvider = new MockOperationSyncProvider();

    await opLogStore.init();
    await opLogStore._clearAllDataForTesting();
    resetTestUuidCounter();
  });

  describe('Encryption Integration', () => {
    const TEST_KEY = 'test-encryption-key-123';

    it('should encrypt operations during upload', async (): Promise<void> => {
      // 1. Configure encryption
      mockProvider.setEncryption(true, TEST_KEY);

      // 2. Create local operation
      const op: Operation = {
        id: 'op-1',
        clientId: 'local-client',
        actionType: 'TEST',
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 't1',
        payload: { title: 'Secret Task' },
        vectorClock: { localClient: 1 },
        timestamp: Date.now(),
        schemaVersion: 1,
      };
      await opLogStore.append(op, 'local');

      // 3. Upload
      await syncService.uploadPendingOps(mockProvider);

      // 4. Verify uploaded data is encrypted
      const uploaded = mockProvider.getUploadedOps();
      expect(uploaded.length).toBe(1);
      const uploadedOp = uploaded[0];

      expect(uploadedOp.isPayloadEncrypted).toBe(true);
      expect(typeof uploadedOp.payload).toBe('string');

      // Attempt to decrypt to verify correctness
      const decryptedPayloadStr = await decrypt(uploadedOp.payload as string, TEST_KEY);
      const decryptedPayload = JSON.parse(decryptedPayloadStr);
      expect(decryptedPayload).toEqual(op.payload);
    });

    it('should decrypt operations during download', async (): Promise<void> => {
      // 1. Configure encryption
      mockProvider.setEncryption(true, TEST_KEY);

      // 2. Prepare encrypted remote operation
      const payload = { title: 'Remote Secret' };
      const encryptedPayload = await encrypt(JSON.stringify(payload), TEST_KEY);

      const remoteOp: SyncOperation = {
        id: 'op-remote-1',
        clientId: 'remote-client', // Different client
        actionType: 'TEST',
        opType: OpType.Update as any,
        entityType: 'TASK' as any,
        entityId: 't1',
        payload: encryptedPayload,
        isPayloadEncrypted: true,
        vectorClock: { remoteClient: 1 },
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      // Mock download to return this op
      spyOn(mockProvider, 'downloadOps').and.returnValue(
        Promise.resolve({
          ops: [{ op: remoteOp, serverSeq: 1, receivedAt: Date.now() }],
          hasMore: false,
          latestSeq: 1,
        }),
      );

      // 3. Download
      await syncService.downloadRemoteOps(mockProvider);

      // 4. Verify operation is applied with decrypted payload
      expect(applierSpy.applyOperations).toHaveBeenCalled();
      const appliedOps = applierSpy.applyOperations.calls.mostRecent().args[0];
      expect(appliedOps.length).toBe(1);
      expect(appliedOps[0].id).toBe('op-remote-1');
      expect(appliedOps[0].payload).toEqual(payload);
    });
  });

  describe('Conflict Dialog Integration', () => {
    it('should trigger conflict dialog when downloading conflicting op', async (): Promise<void> => {
      // 1. Create pending local operation
      const localOp: Operation = {
        id: 'op-local-1',
        clientId: 'local-client',
        actionType: 'TEST',
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 't1',
        payload: { title: 'Local Version' },
        vectorClock: { localClient: 1 },
        timestamp: Date.now(),
        schemaVersion: 1,
      };
      await opLogStore.append(localOp, 'local');

      // 2. Prepare conflicting remote operation (concurrent)
      const remoteOp: SyncOperation = {
        id: 'op-remote-1',
        clientId: 'remote-client',
        actionType: 'TEST',
        opType: OpType.Update as any,
        entityType: 'TASK' as any,
        entityId: 't1', // Same entity
        payload: { title: 'Remote Version' },
        vectorClock: { remoteClient: 1 }, // Concurrent vector clock
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      // Mock download
      spyOn(mockProvider, 'downloadOps').and.returnValue(
        Promise.resolve({
          ops: [{ op: remoteOp, serverSeq: 1, receivedAt: Date.now() }],
          hasMore: false,
          latestSeq: 1,
        }),
      );

      // 3. Download
      await syncService.downloadRemoteOps(mockProvider);

      // 4. Verify ConflictResolutionService was called
      expect(conflictServiceSpy.presentConflicts).toHaveBeenCalled();
      const args = conflictServiceSpy.presentConflicts.calls.mostRecent().args;
      const conflicts = args[0];

      expect(conflicts.length).toBe(1);
      expect(conflicts[0].entityId).toBe('t1');
      expect(conflicts[0].localOps[0].id).toBe('op-local-1');
      expect(conflicts[0].remoteOps[0].id).toBe('op-remote-1');
    });
  });
});
