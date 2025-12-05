import { TestBed } from '@angular/core/testing';
import { OperationLogUploadService } from './operation-log-upload.service';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { LockService } from './lock.service';
import {
  OperationLogManifestService,
  OPS_DIR,
} from '../store/operation-log-manifest.service';
import {
  SyncProviderServiceInterface,
  OperationSyncCapable,
} from '../../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../../pfapi/api/pfapi.const';
import { OpType, OperationLogEntry } from '../operation.types';

describe('OperationLogUploadService', () => {
  let service: OperationLogUploadService;
  let mockOpLogStore: jasmine.SpyObj<OperationLogStoreService>;
  let mockLockService: jasmine.SpyObj<LockService>;
  let mockManifestService: jasmine.SpyObj<OperationLogManifestService>;

  const createMockEntry = (
    seq: number,
    id: string,
    clientId: string,
    timestamp: number = Date.now(),
  ): OperationLogEntry => ({
    seq,
    op: {
      id,
      clientId,
      actionType: '[Task] Add',
      opType: OpType.Create,
      entityType: 'TASK',
      entityId: `task-${id}`,
      payload: {},
      vectorClock: { [clientId]: 1 },
      timestamp,
      schemaVersion: 1,
    },
    appliedAt: Date.now(),
    source: 'local',
  });

  beforeEach(() => {
    mockOpLogStore = jasmine.createSpyObj('OperationLogStoreService', [
      'getUnsynced',
      'markSynced',
    ]);
    mockLockService = jasmine.createSpyObj('LockService', ['request']);
    mockManifestService = jasmine.createSpyObj('OperationLogManifestService', [
      'loadRemoteManifest',
      'uploadRemoteManifest',
    ]);

    // Default mock implementations
    mockLockService.request.and.callFake(
      async (_name: string, fn: () => Promise<void>) => {
        await fn();
      },
    );
    mockOpLogStore.getUnsynced.and.returnValue(Promise.resolve([]));
    mockOpLogStore.markSynced.and.returnValue(Promise.resolve());
    mockManifestService.loadRemoteManifest.and.returnValue(
      Promise.resolve({ operationFiles: [], version: 1 }),
    );
    mockManifestService.uploadRemoteManifest.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        OperationLogUploadService,
        { provide: OperationLogStoreService, useValue: mockOpLogStore },
        { provide: LockService, useValue: mockLockService },
        { provide: OperationLogManifestService, useValue: mockManifestService },
      ],
    });

    service = TestBed.inject(OperationLogUploadService);
  });

  describe('uploadPendingOps', () => {
    it('should return empty result when no sync provider', async () => {
      const result = await service.uploadPendingOps(null as any);

      expect(result).toEqual({ uploadedCount: 0, rejectedCount: 0, piggybackedOps: [] });
    });

    describe('API-based sync', () => {
      let mockApiProvider: jasmine.SpyObj<
        SyncProviderServiceInterface<SyncProviderId> & OperationSyncCapable
      >;

      beforeEach(() => {
        mockApiProvider = jasmine.createSpyObj('ApiSyncProvider', [
          'getLastServerSeq',
          'uploadOps',
          'setLastServerSeq',
        ]);
        (mockApiProvider as any).supportsOperationSync = true;

        mockApiProvider.getLastServerSeq.and.returnValue(Promise.resolve(0));
        mockApiProvider.uploadOps.and.returnValue(
          Promise.resolve({
            results: [],
            latestSeq: 0,
            newOps: [],
          }),
        );
        mockApiProvider.setLastServerSeq.and.returnValue(Promise.resolve());
      });

      it('should use API upload for operation-sync-capable providers', async () => {
        mockOpLogStore.getUnsynced.and.returnValue(
          Promise.resolve([createMockEntry(1, 'op-1', 'client-1')]),
        );
        mockApiProvider.uploadOps.and.returnValue(
          Promise.resolve({
            results: [{ opId: 'op-1', accepted: true }],
            latestSeq: 1,
            newOps: [],
          }),
        );

        await service.uploadPendingOps(mockApiProvider);

        expect(mockApiProvider.uploadOps).toHaveBeenCalled();
      });

      it('should acquire lock before uploading', async () => {
        await service.uploadPendingOps(mockApiProvider);

        expect(mockLockService.request).toHaveBeenCalledWith(
          'sp_op_log_upload',
          jasmine.any(Function),
        );
      });

      it('should return empty result when no pending ops', async () => {
        mockOpLogStore.getUnsynced.and.returnValue(Promise.resolve([]));

        const result = await service.uploadPendingOps(mockApiProvider);

        expect(result).toEqual({
          uploadedCount: 0,
          rejectedCount: 0,
          piggybackedOps: [],
        });
      });

      it('should upload pending operations', async () => {
        const pendingOps = [
          createMockEntry(1, 'op-1', 'client-1'),
          createMockEntry(2, 'op-2', 'client-1'),
        ];
        mockOpLogStore.getUnsynced.and.returnValue(Promise.resolve(pendingOps));
        mockApiProvider.uploadOps.and.returnValue(
          Promise.resolve({
            results: [
              { opId: 'op-1', accepted: true },
              { opId: 'op-2', accepted: true },
            ],
            latestSeq: 10,
            newOps: [],
          }),
        );

        const result = await service.uploadPendingOps(mockApiProvider);

        expect(result.uploadedCount).toBe(2);
        expect(mockOpLogStore.markSynced).toHaveBeenCalledWith([1, 2]);
      });

      it('should update last server seq after upload', async () => {
        mockOpLogStore.getUnsynced.and.returnValue(
          Promise.resolve([createMockEntry(1, 'op-1', 'client-1')]),
        );
        mockApiProvider.uploadOps.and.returnValue(
          Promise.resolve({
            results: [{ opId: 'op-1', accepted: true }],
            latestSeq: 42,
            newOps: [],
          }),
        );

        await service.uploadPendingOps(mockApiProvider);

        expect(mockApiProvider.setLastServerSeq).toHaveBeenCalledWith(42);
      });

      it('should handle rejected operations', async () => {
        const pendingOps = [
          createMockEntry(1, 'op-1', 'client-1'),
          createMockEntry(2, 'op-2', 'client-1'),
        ];
        mockOpLogStore.getUnsynced.and.returnValue(Promise.resolve(pendingOps));
        mockApiProvider.uploadOps.and.returnValue(
          Promise.resolve({
            results: [
              { opId: 'op-1', accepted: true },
              { opId: 'op-2', accepted: false, reason: 'duplicate' },
            ],
            latestSeq: 10,
            newOps: [],
          }),
        );

        const result = await service.uploadPendingOps(mockApiProvider);

        expect(result.uploadedCount).toBe(1);
        expect(mockOpLogStore.markSynced).toHaveBeenCalledWith([1]);
      });

      it('should return piggybacked operations', async () => {
        const piggybackedOp = {
          id: 'remote-op',
          clientId: 'otherClient',
          actionType: '[Task] Update',
          opType: OpType.Update,
          entityType: 'TASK',
          entityId: 'task-1',
          payload: {},
          vectorClock: { otherClient: 5 },
          timestamp: Date.now(),
          schemaVersion: 1,
        };
        mockOpLogStore.getUnsynced.and.returnValue(
          Promise.resolve([createMockEntry(1, 'op-1', 'client-1')]),
        );
        mockApiProvider.uploadOps.and.returnValue(
          Promise.resolve({
            results: [{ opId: 'op-1', accepted: true }],
            latestSeq: 10,
            newOps: [
              {
                serverSeq: 5,
                receivedAt: Date.now(),
                op: piggybackedOp,
              },
            ],
          }),
        );

        const result = await service.uploadPendingOps(mockApiProvider);

        expect(result.piggybackedOps.length).toBe(1);
        expect(result.piggybackedOps[0].id).toBe('remote-op');
      });

      it('should batch large uploads', async () => {
        // Create 150 pending ops to test batching (max 100 per request)
        const pendingOps = Array.from({ length: 150 }, (_, i) =>
          createMockEntry(i + 1, `op-${i}`, 'client-1'),
        );
        mockOpLogStore.getUnsynced.and.returnValue(Promise.resolve(pendingOps));
        mockApiProvider.uploadOps.and.callFake(async (ops) => ({
          results: ops.map((op) => ({ opId: op.id, accepted: true })),
          latestSeq: 150,
          newOps: [],
        }));

        await service.uploadPendingOps(mockApiProvider);

        expect(mockApiProvider.uploadOps).toHaveBeenCalledTimes(2);
      });
    });

    describe('file-based sync', () => {
      let mockFileProvider: jasmine.SpyObj<SyncProviderServiceInterface<SyncProviderId>>;

      beforeEach(() => {
        mockFileProvider = jasmine.createSpyObj('FileSyncProvider', ['uploadFile']);
        (mockFileProvider as any).supportsOperationSync = false;

        mockFileProvider.uploadFile.and.returnValue(Promise.resolve({ rev: 'test-rev' }));
      });

      it('should use file upload for non-API providers', async () => {
        mockOpLogStore.getUnsynced.and.returnValue(
          Promise.resolve([createMockEntry(1, 'op-1', 'client-1', 12345)]),
        );

        await service.uploadPendingOps(mockFileProvider);

        expect(mockFileProvider.uploadFile).toHaveBeenCalled();
      });

      it('should return empty result when no pending ops', async () => {
        mockOpLogStore.getUnsynced.and.returnValue(Promise.resolve([]));

        const result = await service.uploadPendingOps(mockFileProvider);

        expect(result).toEqual({
          uploadedCount: 0,
          rejectedCount: 0,
          piggybackedOps: [],
        });
      });

      it('should upload pending operations as file', async () => {
        const timestamp = 1234567890;
        mockOpLogStore.getUnsynced.and.returnValue(
          Promise.resolve([createMockEntry(1, 'op-1', 'client-1', timestamp)]),
        );

        await service.uploadPendingOps(mockFileProvider);

        expect(mockFileProvider.uploadFile).toHaveBeenCalledWith(
          `${OPS_DIR}ops_client-1_${timestamp}.json`,
          jasmine.any(String),
          null,
        );
      });

      it('should mark operations as synced after upload', async () => {
        mockOpLogStore.getUnsynced.and.returnValue(
          Promise.resolve([
            createMockEntry(1, 'op-1', 'client-1'),
            createMockEntry(2, 'op-2', 'client-1'),
          ]),
        );

        await service.uploadPendingOps(mockFileProvider);

        expect(mockOpLogStore.markSynced).toHaveBeenCalledWith([1, 2]);
      });

      it('should update manifest after uploading new files', async () => {
        mockOpLogStore.getUnsynced.and.returnValue(
          Promise.resolve([createMockEntry(1, 'op-1', 'client-1')]),
        );

        await service.uploadPendingOps(mockFileProvider);

        expect(mockManifestService.uploadRemoteManifest).toHaveBeenCalled();
      });

      it('should skip upload for existing files in manifest', async () => {
        const timestamp = 1234567890;
        const existingFile = `${OPS_DIR}ops_client-1_${timestamp}.json`;
        mockManifestService.loadRemoteManifest.and.returnValue(
          Promise.resolve({ operationFiles: [existingFile], version: 1 }),
        );
        mockOpLogStore.getUnsynced.and.returnValue(
          Promise.resolve([createMockEntry(1, 'op-1', 'client-1', timestamp)]),
        );

        const result = await service.uploadPendingOps(mockFileProvider);

        expect(mockFileProvider.uploadFile).not.toHaveBeenCalled();
        // Still mark as synced to prevent re-upload attempts
        expect(mockOpLogStore.markSynced).toHaveBeenCalledWith([1]);
        expect(result.uploadedCount).toBe(0);
      });

      it('should not return piggybacked ops for file-based sync', async () => {
        mockOpLogStore.getUnsynced.and.returnValue(
          Promise.resolve([createMockEntry(1, 'op-1', 'client-1')]),
        );

        const result = await service.uploadPendingOps(mockFileProvider);

        expect(result.piggybackedOps).toEqual([]);
      });

      it('should not update manifest when no new files uploaded', async () => {
        const timestamp = 1234567890;
        const existingFile = `${OPS_DIR}ops_client-1_${timestamp}.json`;
        mockManifestService.loadRemoteManifest.and.returnValue(
          Promise.resolve({ operationFiles: [existingFile], version: 1 }),
        );
        mockOpLogStore.getUnsynced.and.returnValue(
          Promise.resolve([createMockEntry(1, 'op-1', 'client-1', timestamp)]),
        );

        await service.uploadPendingOps(mockFileProvider);

        expect(mockManifestService.uploadRemoteManifest).not.toHaveBeenCalled();
      });

      it('should batch large uploads into multiple files', async () => {
        // Create 150 pending ops to test batching (max 100 per file)
        const pendingOps = Array.from({ length: 150 }, (_, i) =>
          createMockEntry(i + 1, `op-${i}`, 'client-1', 1234567890 + i),
        );
        mockOpLogStore.getUnsynced.and.returnValue(Promise.resolve(pendingOps));

        await service.uploadPendingOps(mockFileProvider);

        expect(mockFileProvider.uploadFile).toHaveBeenCalledTimes(2);
      });
    });
  });
});
