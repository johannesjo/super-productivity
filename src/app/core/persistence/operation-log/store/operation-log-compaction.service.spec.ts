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
import { PFAPI_MODEL_CFGS } from '../../../../pfapi/pfapi-config';

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

  // =========================================================================
  // Snapshot entity keys extraction tests
  // =========================================================================
  // These tests verify that compaction extracts and stores entity keys from
  // the state snapshot. This is critical for conflict detection to distinguish
  // between entities that existed at compaction time vs new entities.

  describe('snapshotEntityKeys extraction', () => {
    it('should include snapshotEntityKeys in saved state cache', async () => {
      const stateWithEntities = {
        task: { ids: ['task-1', 'task-2'], entities: {} },
        project: { ids: ['proj-1'], entities: {} },
        tag: { ids: [], entities: {} },
        note: { ids: ['note-1'], entities: {} },
        globalConfig: { someConfig: true },
        planner: { days: [] },
        reminders: [{ id: 'reminder-1' }],
      } as any;

      mockStoreDelegate.getAllSyncModelDataFromStore.and.returnValue(
        Promise.resolve(stateWithEntities),
      );

      await service.compact();

      const savedCache = mockOpLogStore.saveStateCache.calls.mostRecent().args[0];
      expect(savedCache.snapshotEntityKeys).toBeDefined();
      expect(Array.isArray(savedCache.snapshotEntityKeys)).toBeTrue();
    });

    it('should extract TASK entity keys from state', async () => {
      const stateWithTasks = {
        task: { ids: ['task-1', 'task-2', 'task-3'], entities: {} },
      } as any;

      mockStoreDelegate.getAllSyncModelDataFromStore.and.returnValue(
        Promise.resolve(stateWithTasks),
      );

      await service.compact();

      const savedCache = mockOpLogStore.saveStateCache.calls.mostRecent().args[0];
      expect(savedCache.snapshotEntityKeys).toContain('TASK:task-1');
      expect(savedCache.snapshotEntityKeys).toContain('TASK:task-2');
      expect(savedCache.snapshotEntityKeys).toContain('TASK:task-3');
    });

    it('should extract PROJECT entity keys from state', async () => {
      const stateWithProjects = {
        project: { ids: ['proj-a', 'proj-b'], entities: {} },
      } as any;

      mockStoreDelegate.getAllSyncModelDataFromStore.and.returnValue(
        Promise.resolve(stateWithProjects),
      );

      await service.compact();

      const savedCache = mockOpLogStore.saveStateCache.calls.mostRecent().args[0];
      expect(savedCache.snapshotEntityKeys).toContain('PROJECT:proj-a');
      expect(savedCache.snapshotEntityKeys).toContain('PROJECT:proj-b');
    });

    it('should extract TAG entity keys from state', async () => {
      const stateWithTags = {
        tag: { ids: ['tag-1'], entities: {} },
      } as any;

      mockStoreDelegate.getAllSyncModelDataFromStore.and.returnValue(
        Promise.resolve(stateWithTags),
      );

      await service.compact();

      const savedCache = mockOpLogStore.saveStateCache.calls.mostRecent().args[0];
      expect(savedCache.snapshotEntityKeys).toContain('TAG:tag-1');
    });

    it('should extract REMINDER entity keys from reminders array', async () => {
      const stateWithReminders = {
        reminders: [{ id: 'rem-1' }, { id: 'rem-2' }],
      } as any;

      mockStoreDelegate.getAllSyncModelDataFromStore.and.returnValue(
        Promise.resolve(stateWithReminders),
      );

      await service.compact();

      const savedCache = mockOpLogStore.saveStateCache.calls.mostRecent().args[0];
      expect(savedCache.snapshotEntityKeys).toContain('REMINDER:rem-1');
      expect(savedCache.snapshotEntityKeys).toContain('REMINDER:rem-2');
    });

    it('should extract singleton entity keys (GLOBAL_CONFIG, PLANNER, etc)', async () => {
      const stateWithSingletons = {
        globalConfig: { someConfig: true },
        planner: { days: [] },
        menuTree: { items: [] },
        timeTracking: { entries: {} },
      } as any;

      mockStoreDelegate.getAllSyncModelDataFromStore.and.returnValue(
        Promise.resolve(stateWithSingletons),
      );

      await service.compact();

      const savedCache = mockOpLogStore.saveStateCache.calls.mostRecent().args[0];
      expect(savedCache.snapshotEntityKeys).toContain('GLOBAL_CONFIG:GLOBAL_CONFIG');
      expect(savedCache.snapshotEntityKeys).toContain('PLANNER:PLANNER');
      expect(savedCache.snapshotEntityKeys).toContain('MENU_TREE:MENU_TREE');
      expect(savedCache.snapshotEntityKeys).toContain('TIME_TRACKING:TIME_TRACKING');
    });

    it('should extract archived task entity keys', async () => {
      const stateWithArchive = {
        archiveYoung: { task: { ids: ['archived-task-1'], entities: {} } },
        archiveOld: { task: { ids: ['old-archived-task'], entities: {} } },
      } as any;

      mockStoreDelegate.getAllSyncModelDataFromStore.and.returnValue(
        Promise.resolve(stateWithArchive),
      );

      await service.compact();

      const savedCache = mockOpLogStore.saveStateCache.calls.mostRecent().args[0];
      // Archived tasks should be tracked as TASK entities
      expect(savedCache.snapshotEntityKeys).toContain('TASK:archived-task-1');
      expect(savedCache.snapshotEntityKeys).toContain('TASK:old-archived-task');
    });

    it('should handle empty state gracefully', async () => {
      mockStoreDelegate.getAllSyncModelDataFromStore.and.returnValue(
        Promise.resolve({} as any),
      );

      await service.compact();

      const savedCache = mockOpLogStore.saveStateCache.calls.mostRecent().args[0];
      expect(savedCache.snapshotEntityKeys).toBeDefined();
      expect(savedCache.snapshotEntityKeys!.length).toBe(0);
    });

    it('should handle state with empty ids arrays', async () => {
      const stateWithEmptyIds = {
        task: { ids: [], entities: {} },
        project: { ids: [], entities: {} },
        reminders: [],
      } as any;

      mockStoreDelegate.getAllSyncModelDataFromStore.and.returnValue(
        Promise.resolve(stateWithEmptyIds),
      );

      await service.compact();

      const savedCache = mockOpLogStore.saveStateCache.calls.mostRecent().args[0];
      // Should have no entity keys (but should not throw)
      expect(savedCache.snapshotEntityKeys).toBeDefined();
      const taskKeys = savedCache.snapshotEntityKeys!.filter((k: string) =>
        k.startsWith('TASK:'),
      );
      expect(taskKeys.length).toBe(0);
    });

    it('should extract entity keys for ALL models defined in PFAPI_MODEL_CFGS', async () => {
      // 1. Create a complete mock state with one item for every model type
      const completeState: any = {};

      // Helper to generate mock data for each model type
      Object.keys(PFAPI_MODEL_CFGS).forEach((modelKey) => {
        const key = modelKey as keyof typeof PFAPI_MODEL_CFGS;

        if (key === 'reminders') {
          completeState[key] = [{ id: 'reminder-1' }];
        } else if (key === 'boards') {
          completeState[key] = { boardCfgs: [{ id: 'board-1' }] };
        } else if (key === 'archiveYoung' || key === 'archiveOld') {
          completeState[key] = { task: { ids: [`${key}-task-1`], entities: {} } };
        } else if (
          key === 'globalConfig' ||
          key === 'planner' ||
          key === 'menuTree' ||
          key === 'timeTracking'
        ) {
          completeState[key] = { someData: true }; // Singleton existence check
        } else if (key === 'pluginUserData') {
          completeState[key] = [{ id: 'plugin-user-1' }];
        } else if (key === 'pluginMetadata') {
          completeState[key] = [{ id: 'plugin-meta-1' }];
        } else {
          // Standard entity adapter models (task, project, etc.)
          completeState[key] = { ids: [`${key}-1`], entities: {} };
        }
      });

      mockStoreDelegate.getAllSyncModelDataFromStore.and.returnValue(
        Promise.resolve(completeState),
      );

      // 2. Run compaction
      await service.compact();

      // 3. Verify that we got at least one key for every model type
      const savedCache = mockOpLogStore.saveStateCache.calls.mostRecent().args[0];
      const extractedKeys = new Set(savedCache.snapshotEntityKeys);

      // Define expected entity types for each model key
      const modelToEntityType: Record<string, string> = {
        task: 'TASK',
        project: 'PROJECT',
        tag: 'TAG',
        note: 'NOTE',
        issueProvider: 'ISSUE_PROVIDER',
        simpleCounter: 'SIMPLE_COUNTER',
        taskRepeatCfg: 'TASK_REPEAT_CFG',
        metric: 'METRIC',
        reminders: 'REMINDER',
        boards: 'BOARD',
        globalConfig: 'GLOBAL_CONFIG',
        planner: 'PLANNER',
        menuTree: 'MENU_TREE',
        timeTracking: 'TIME_TRACKING',
        archiveYoung: 'TASK', // Archives map to TASK
        archiveOld: 'TASK', // Archives map to TASK
        pluginUserData: 'PLUGIN_USER_DATA',
        pluginMetadata: 'PLUGIN_METADATA',
      };

      const missingModels: string[] = [];

      Object.keys(PFAPI_MODEL_CFGS).forEach((modelKey) => {
        const expectedPrefix = modelToEntityType[modelKey];
        if (!expectedPrefix) {
          fail(
            `Test setup error: No expected EntityType defined for model '${modelKey}'`,
          );
        }

        const hasKey = Array.from(extractedKeys).some((k) =>
          k.startsWith(expectedPrefix + ':'),
        );
        if (!hasKey) {
          missingModels.push(modelKey);
        }
      });

      if (missingModels.length > 0) {
        fail(
          `snapshotEntityKeys extraction is missing support for models: ${missingModels.join(', ')}. \n` +
            `Update _extractEntityKeysFromState in OperationLogCompactionService to handle these models.`,
        );
      }
    });
  });
});
