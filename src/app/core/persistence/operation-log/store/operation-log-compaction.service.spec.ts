import { TestBed } from '@angular/core/testing';
import { OperationLogCompactionService } from './operation-log-compaction.service';
import { OperationLogStoreService } from './operation-log-store.service';
import { LockService } from '../sync/lock.service';
import { PfapiStoreDelegateService } from '../../../../pfapi/pfapi-store-delegate.service';
import { VectorClockService } from '../sync/vector-clock.service';
import {
  COMPACTION_RETENTION_MS,
  SLOW_COMPACTION_THRESHOLD_MS,
  STATE_SIZE_WARNING_THRESHOLD_MB,
} from '../operation-log.const';
import { CURRENT_SCHEMA_VERSION } from './schema-migration.service';
import { OperationLogEntry } from '../operation.types';
import { OpLog } from '../../../log';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

    // Mock OpLog methods
    spyOn(OpLog, 'warn');
    spyOn(OpLog, 'normal');

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

    it('should warn if state size exceeds threshold', async () => {
      // Create a large state (threshold in MB, plus extra bytes)
      const thresholdBytes = STATE_SIZE_WARNING_THRESHOLD_MB * 1024 * 1024;
      const largeState = {
        data: 'x'.repeat(thresholdBytes + 100),
      };
      mockStoreDelegate.getAllSyncModelDataFromStore.and.returnValue(
        Promise.resolve(largeState as any),
      );

      await service.compact();

      expect(OpLog.warn).toHaveBeenCalledWith(
        'OperationLogCompactionService: Large state for compaction',
        jasmine.objectContaining({
          stateSizeMB: jasmine.any(String),
        }),
      );
    });

    it('should not warn if state size is within threshold', async () => {
      // Create a small state
      const smallState = { data: 'x' };
      mockStoreDelegate.getAllSyncModelDataFromStore.and.returnValue(
        Promise.resolve(smallState as any),
      );

      await service.compact();

      expect(OpLog.warn).not.toHaveBeenCalled();
    });

    it(
      'should log metrics if compaction is slow',
      async () => {
        // Mock one of the async operations to take longer than threshold
        mockOpLogStore.saveStateCache.and.callFake(async () => {
          await new Promise((resolve) =>
            setTimeout(resolve, SLOW_COMPACTION_THRESHOLD_MS + 100),
          );
        });

        await service.compact();

        expect(OpLog.normal).toHaveBeenCalledWith(
          'OperationLogCompactionService: Compaction completed',
          jasmine.objectContaining({
            durationMs: jasmine.any(Number),
            isEmergency: false,
          }),
        );
        const args = (OpLog.normal as jasmine.Spy).calls.mostRecent().args;
        expect(args[1].durationMs).toBeGreaterThan(SLOW_COMPACTION_THRESHOLD_MS);
      },
      SLOW_COMPACTION_THRESHOLD_MS + 2000,
    );

    it('should not log metrics if compaction is fast', async () => {
      await service.compact();

      expect(OpLog.normal).not.toHaveBeenCalled();
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

    it('should propagate errors from saveStateCache', async () => {
      mockOpLogStore.saveStateCache.and.rejectWith(new Error('IndexedDB write failed'));

      await expectAsync(service.compact()).toBeRejectedWithError(
        'IndexedDB write failed',
      );
    });

    it('should propagate errors from vector clock service', async () => {
      mockVectorClockService.getCurrentVectorClock.and.rejectWith(
        new Error('Clock read failed'),
      );

      await expectAsync(service.compact()).toBeRejectedWithError('Clock read failed');
    });

    it('should propagate errors from state delegate', async () => {
      mockStoreDelegate.getAllSyncModelDataFromStore.and.rejectWith(
        new Error('State read failed'),
      );

      await expectAsync(service.compact()).toBeRejectedWithError('State read failed');
    });
  });

  describe('emergencyCompact', () => {
    it('should return true on successful compaction', async () => {
      const result = await service.emergencyCompact();
      expect(result).toBeTrue();
    });

    it('should log metrics (including isEmergency: true) for emergency compaction', async () => {
      await service.emergencyCompact();

      expect(OpLog.normal).toHaveBeenCalledWith(
        'OperationLogCompactionService: Compaction completed',
        jasmine.objectContaining({
          isEmergency: true,
        }),
      );
    });

    it('should return false when compaction fails', async () => {
      mockOpLogStore.saveStateCache.and.rejectWith(new Error('Storage full'));

      const result = await service.emergencyCompact();

      expect(result).toBeFalse();
    });

    it('should use shorter retention window than regular compaction', async () => {
      let capturedFilter: ((entry: OperationLogEntry) => boolean) | undefined;
      mockOpLogStore.deleteOpsWhere.and.callFake(async (filterFn) => {
        capturedFilter = filterFn;
      });

      await service.emergencyCompact();

      // Create an entry that's 2 days old (would be kept by regular compaction,
      // but deleted by emergency compaction which uses 1-day retention)
      const twoDaysMs = 2 * MS_PER_DAY;
      const twoDaysAgo = Date.now() - twoDaysMs;
      const entry: OperationLogEntry = {
        seq: 50,
        op: {} as any,
        appliedAt: twoDaysAgo,
        source: 'remote',
        syncedAt: twoDaysAgo,
      };

      expect(capturedFilter!(entry)).toBeTrue();
    });

    it('should still protect unsynced operations during emergency compaction', async () => {
      let capturedFilter: ((entry: OperationLogEntry) => boolean) | undefined;
      mockOpLogStore.deleteOpsWhere.and.callFake(async (filterFn) => {
        capturedFilter = filterFn;
      });

      await service.emergencyCompact();

      const tenDaysMs = 10 * MS_PER_DAY;
      const oldUnsyncedEntry: OperationLogEntry = {
        seq: 50,
        op: {} as any,
        appliedAt: Date.now() - tenDaysMs, // 10 days old
        source: 'local',
        syncedAt: undefined, // Not synced!
      };

      expect(capturedFilter!(oldUnsyncedEntry)).toBeFalse();
    });

    it('should acquire lock during emergency compaction', async () => {
      await service.emergencyCompact();

      expect(mockLockService.request).toHaveBeenCalledWith(
        'sp_op_log',
        jasmine.any(Function),
      );
    });

    it('should return false when lock acquisition fails', async () => {
      mockLockService.request.and.rejectWith(new Error('Lock timeout'));

      const result = await service.emergencyCompact();

      expect(result).toBeFalse();
    });

    it('should catch and log errors without throwing', async () => {
      mockOpLogStore.getLastSeq.and.rejectWith(new Error('Database corrupted'));

      // Should not throw, just return false
      const result = await service.emergencyCompact();

      expect(result).toBeFalse();
    });

    it('should complete all phases during emergency compaction', async () => {
      await service.emergencyCompact();

      expect(mockStoreDelegate.getAllSyncModelDataFromStore).toHaveBeenCalled();
      expect(mockVectorClockService.getCurrentVectorClock).toHaveBeenCalled();
      expect(mockOpLogStore.getLastSeq).toHaveBeenCalled();
      expect(mockOpLogStore.saveStateCache).toHaveBeenCalled();
      expect(mockOpLogStore.resetCompactionCounter).toHaveBeenCalled();
      expect(mockOpLogStore.deleteOpsWhere).toHaveBeenCalled();
    });
  });
});
