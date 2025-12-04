import { TestBed } from '@angular/core/testing';
import { OperationLogCompactionService } from './operation-log-compaction.service';
import { OperationLogStoreService } from './operation-log-store.service';
import { LockService } from '../sync/lock.service';
import { PfapiStoreDelegateService } from '../../../../pfapi/pfapi-store-delegate.service';
import { VectorClockService } from '../sync/vector-clock.service';
import { COMPACTION_RETENTION_MS } from '../operation-log.const';
import { CURRENT_SCHEMA_VERSION } from './schema-migration.service';
import { OperationLogEntry } from '../operation.types';

describe('OperationLogCompactionService', () => {
  let service: OperationLogCompactionService;
  let mockOpLogStore: jasmine.SpyObj<OperationLogStoreService>;
  let mockLockService: jasmine.SpyObj<LockService>;
  let mockStoreDelegate: jasmine.SpyObj<PfapiStoreDelegateService>;
  let mockVectorClockService: jasmine.SpyObj<VectorClockService>;

  const mockState = {
    task: { entities: {}, ids: [] },
    project: { entities: {}, ids: [] },
    tag: { entities: {}, ids: [] },
  } as any;

  const mockVectorClock = { clientA: 10, clientB: 5 };

  beforeEach(() => {
    mockOpLogStore = jasmine.createSpyObj('OperationLogStoreService', [
      'getLastSeq',
      'saveStateCache',
      'resetCompactionCounter',
      'deleteOpsWhere',
    ]);
    mockLockService = jasmine.createSpyObj('LockService', ['request']);
    mockStoreDelegate = jasmine.createSpyObj('PfapiStoreDelegateService', [
      'getAllSyncModelDataFromStore',
    ]);
    mockVectorClockService = jasmine.createSpyObj('VectorClockService', [
      'getCurrentVectorClock',
    ]);

    // Default mock implementations
    mockLockService.request.and.callFake(
      async (_name: string, fn: () => Promise<void>) => {
        await fn();
      },
    );
    mockOpLogStore.getLastSeq.and.returnValue(Promise.resolve(100));
    mockOpLogStore.saveStateCache.and.returnValue(Promise.resolve());
    mockOpLogStore.resetCompactionCounter.and.returnValue(Promise.resolve());
    mockOpLogStore.deleteOpsWhere.and.returnValue(Promise.resolve());
    mockStoreDelegate.getAllSyncModelDataFromStore.and.returnValue(
      Promise.resolve(mockState),
    );
    mockVectorClockService.getCurrentVectorClock.and.returnValue(
      Promise.resolve(mockVectorClock),
    );

    TestBed.configureTestingModule({
      providers: [
        OperationLogCompactionService,
        { provide: OperationLogStoreService, useValue: mockOpLogStore },
        { provide: LockService, useValue: mockLockService },
        { provide: PfapiStoreDelegateService, useValue: mockStoreDelegate },
        { provide: VectorClockService, useValue: mockVectorClockService },
      ],
    });

    service = TestBed.inject(OperationLogCompactionService);
  });

  describe('compact', () => {
    it('should acquire lock before compaction', async () => {
      await service.compact();

      expect(mockLockService.request).toHaveBeenCalledWith(
        'sp_op_log',
        jasmine.any(Function),
      );
    });

    it('should get current state from store delegate', async () => {
      await service.compact();

      expect(mockStoreDelegate.getAllSyncModelDataFromStore).toHaveBeenCalled();
    });

    it('should get current vector clock', async () => {
      await service.compact();

      expect(mockVectorClockService.getCurrentVectorClock).toHaveBeenCalled();
    });

    it('should get last sequence number', async () => {
      await service.compact();

      expect(mockOpLogStore.getLastSeq).toHaveBeenCalled();
    });

    it('should save state cache with correct data', async () => {
      await service.compact();

      expect(mockOpLogStore.saveStateCache).toHaveBeenCalledWith(
        jasmine.objectContaining({
          state: mockState,
          lastAppliedOpSeq: 100,
          vectorClock: mockVectorClock,
          schemaVersion: CURRENT_SCHEMA_VERSION,
        }),
      );
    });

    it('should save state cache with compactedAt timestamp', async () => {
      const beforeTime = Date.now();
      await service.compact();
      const afterTime = Date.now();

      const savedCache = mockOpLogStore.saveStateCache.calls.mostRecent().args[0];
      expect(savedCache.compactedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(savedCache.compactedAt).toBeLessThanOrEqual(afterTime);
    });

    it('should reset compaction counter after saving cache', async () => {
      await service.compact();

      expect(mockOpLogStore.resetCompactionCounter).toHaveBeenCalled();
      expect(mockOpLogStore.saveStateCache).toHaveBeenCalledBefore(
        mockOpLogStore.resetCompactionCounter,
      );
    });

    it('should delete old operations with filter function', async () => {
      await service.compact();

      expect(mockOpLogStore.deleteOpsWhere).toHaveBeenCalledWith(jasmine.any(Function));
    });

    it('should not delete unsynced operations', async () => {
      let capturedFilter: ((entry: OperationLogEntry) => boolean) | undefined;
      mockOpLogStore.deleteOpsWhere.and.callFake(async (filterFn) => {
        capturedFilter = filterFn;
      });

      await service.compact();

      const unsyncedEntry: OperationLogEntry = {
        seq: 50,
        op: {} as any,
        appliedAt: Date.now() - COMPACTION_RETENTION_MS - 1000,
        source: 'local',
        syncedAt: undefined, // Not synced
      };

      expect(capturedFilter!(unsyncedEntry)).toBeFalse();
    });

    it('should not delete recently applied operations', async () => {
      let capturedFilter: ((entry: OperationLogEntry) => boolean) | undefined;
      mockOpLogStore.deleteOpsWhere.and.callFake(async (filterFn) => {
        capturedFilter = filterFn;
      });

      await service.compact();

      const recentEntry: OperationLogEntry = {
        seq: 50,
        op: {} as any,
        appliedAt: Date.now() - 1000, // Very recent
        source: 'remote',
        syncedAt: Date.now() - 1000,
      };

      expect(capturedFilter!(recentEntry)).toBeFalse();
    });

    it('should delete old synced operations', async () => {
      let capturedFilter: ((entry: OperationLogEntry) => boolean) | undefined;
      mockOpLogStore.deleteOpsWhere.and.callFake(async (filterFn) => {
        capturedFilter = filterFn;
      });

      await service.compact();

      const oldSyncedEntry: OperationLogEntry = {
        seq: 50,
        op: {} as any,
        appliedAt: Date.now() - COMPACTION_RETENTION_MS - 1000, // Old enough
        source: 'remote',
        syncedAt: Date.now() - COMPACTION_RETENTION_MS - 500,
      };

      expect(capturedFilter!(oldSyncedEntry)).toBeTrue();
    });

    it('should not delete operations with seq greater than lastSeq', async () => {
      mockOpLogStore.getLastSeq.and.returnValue(Promise.resolve(100));

      let capturedFilter: ((entry: OperationLogEntry) => boolean) | undefined;
      mockOpLogStore.deleteOpsWhere.and.callFake(async (filterFn) => {
        capturedFilter = filterFn;
      });

      await service.compact();

      const futureSeqEntry: OperationLogEntry = {
        seq: 101, // Greater than lastSeq
        op: {} as any,
        appliedAt: Date.now() - COMPACTION_RETENTION_MS - 1000,
        source: 'remote',
        syncedAt: Date.now() - COMPACTION_RETENTION_MS - 500,
      };

      expect(capturedFilter!(futureSeqEntry)).toBeFalse();
    });

    it('should handle empty state', async () => {
      mockStoreDelegate.getAllSyncModelDataFromStore.and.returnValue(
        Promise.resolve({} as any),
      );

      await service.compact();

      expect(mockOpLogStore.saveStateCache).toHaveBeenCalledWith(
        jasmine.objectContaining({ state: {} }),
      );
    });

    it('should handle empty vector clock', async () => {
      mockVectorClockService.getCurrentVectorClock.and.returnValue(Promise.resolve({}));

      await service.compact();

      expect(mockOpLogStore.saveStateCache).toHaveBeenCalledWith(
        jasmine.objectContaining({ vectorClock: {} }),
      );
    });

    it('should handle sequence number of 0', async () => {
      mockOpLogStore.getLastSeq.and.returnValue(Promise.resolve(0));

      await service.compact();

      expect(mockOpLogStore.saveStateCache).toHaveBeenCalledWith(
        jasmine.objectContaining({ lastAppliedOpSeq: 0 }),
      );
    });

    it('should execute all steps within the lock', async () => {
      const callOrder: string[] = [];

      mockLockService.request.and.callFake(
        async (_name: string, fn: () => Promise<void>) => {
          callOrder.push('lock-start');
          await fn();
          callOrder.push('lock-end');
        },
      );

      mockStoreDelegate.getAllSyncModelDataFromStore.and.callFake((async () => {
        callOrder.push('getState');
        return mockState;
      }) as any);

      mockVectorClockService.getCurrentVectorClock.and.callFake(async () => {
        callOrder.push('getVectorClock');
        return mockVectorClock;
      });

      mockOpLogStore.getLastSeq.and.callFake(async () => {
        callOrder.push('getLastSeq');
        return 100;
      });

      mockOpLogStore.saveStateCache.and.callFake(async () => {
        callOrder.push('saveStateCache');
      });

      mockOpLogStore.resetCompactionCounter.and.callFake(async () => {
        callOrder.push('resetCompactionCounter');
      });

      mockOpLogStore.deleteOpsWhere.and.callFake(async () => {
        callOrder.push('deleteOpsWhere');
      });

      await service.compact();

      // All operations should happen between lock-start and lock-end
      const lockStartIndex = callOrder.indexOf('lock-start');
      const lockEndIndex = callOrder.indexOf('lock-end');

      expect(callOrder.indexOf('getState')).toBeGreaterThan(lockStartIndex);
      expect(callOrder.indexOf('getState')).toBeLessThan(lockEndIndex);
      expect(callOrder.indexOf('saveStateCache')).toBeGreaterThan(lockStartIndex);
      expect(callOrder.indexOf('saveStateCache')).toBeLessThan(lockEndIndex);
      expect(callOrder.indexOf('deleteOpsWhere')).toBeGreaterThan(lockStartIndex);
      expect(callOrder.indexOf('deleteOpsWhere')).toBeLessThan(lockEndIndex);
    });
  });
});
