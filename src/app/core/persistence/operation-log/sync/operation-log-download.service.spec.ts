import { TestBed } from '@angular/core/testing';
import { OperationLogDownloadService } from './operation-log-download.service';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { LockService } from './lock.service';
import { SnackService } from '../../../snack/snack.service';
import {
  SyncProviderServiceInterface,
  OperationSyncCapable,
} from '../../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../../pfapi/api/pfapi.const';
import { OpType } from '../operation.types';
import { CLOCK_DRIFT_THRESHOLD_MS } from '../operation-log.const';
import { OpLog } from '../../../log';
import { T } from '../../../../t.const';

describe('OperationLogDownloadService', () => {
  let service: OperationLogDownloadService;
  let mockOpLogStore: jasmine.SpyObj<OperationLogStoreService>;
  let mockLockService: jasmine.SpyObj<LockService>;
  let mockSnackService: jasmine.SpyObj<SnackService>;

  beforeEach(() => {
    mockOpLogStore = jasmine.createSpyObj('OperationLogStoreService', [
      'getAppliedOpIds',
    ]);
    mockLockService = jasmine.createSpyObj('LockService', ['request']);
    mockSnackService = jasmine.createSpyObj('SnackService', ['open']);

    // Mock OpLog
    spyOn(OpLog, 'warn');

    // Default mock implementations
    mockLockService.request.and.callFake(
      async (_name: string, fn: () => Promise<void>) => {
        await fn();
      },
    );
    mockOpLogStore.getAppliedOpIds.and.returnValue(Promise.resolve(new Set<string>()));

    TestBed.configureTestingModule({
      providers: [
        OperationLogDownloadService,
        { provide: OperationLogStoreService, useValue: mockOpLogStore },
        { provide: LockService, useValue: mockLockService },
        { provide: SnackService, useValue: mockSnackService },
      ],
    });

    service = TestBed.inject(OperationLogDownloadService);
  });

  describe('downloadRemoteOps', () => {
    it('should return empty result when no sync provider', async () => {
      const result = await service.downloadRemoteOps(null as any);

      expect(result).toEqual({ newOps: [], success: false, failedFileCount: 0 });
    });

    describe('API-based sync', () => {
      let mockApiProvider: jasmine.SpyObj<
        SyncProviderServiceInterface<SyncProviderId> & OperationSyncCapable
      >;

      beforeEach(() => {
        mockApiProvider = jasmine.createSpyObj('ApiSyncProvider', [
          'getLastServerSeq',
          'downloadOps',
          'setLastServerSeq',
        ]);
        (mockApiProvider as any).supportsOperationSync = true;
        // Add privateCfg mock for E2E encryption support
        (mockApiProvider as any).privateCfg = {
          load: jasmine
            .createSpy('privateCfg.load')
            .and.returnValue(Promise.resolve(null)),
        };

        mockApiProvider.getLastServerSeq.and.returnValue(Promise.resolve(0));
        mockApiProvider.downloadOps.and.returnValue(
          Promise.resolve({ ops: [], hasMore: false, latestSeq: 0 }),
        );
      });

      it('should use API download for operation-sync-capable providers', async () => {
        await service.downloadRemoteOps(mockApiProvider);

        expect(mockApiProvider.downloadOps).toHaveBeenCalled();
      });

      it('should detect and warn about clock drift', async () => {
        const driftMs = CLOCK_DRIFT_THRESHOLD_MS + 60000; // Threshold + 1 min
        const serverTime = Date.now() - driftMs;

        mockApiProvider.downloadOps.and.returnValue(
          Promise.resolve({
            ops: [
              {
                serverSeq: 1,
                receivedAt: serverTime,
                op: {
                  id: 'op-1',
                  clientId: 'c1',
                  actionType: '[Task] Add',
                  opType: OpType.Create,
                  entityType: 'TASK',
                  payload: {},
                  vectorClock: {},
                  timestamp: Date.now(),
                  schemaVersion: 1,
                },
              },
            ],
            hasMore: false,
            latestSeq: 1,
          }),
        );

        await service.downloadRemoteOps(mockApiProvider);

        expect(OpLog.warn).toHaveBeenCalledWith(
          'OperationLogDownloadService: Clock drift detected',
          jasmine.objectContaining({
            driftMinutes: jasmine.any(String),
            direction: 'client ahead',
          }),
        );
        expect(mockSnackService.open).toHaveBeenCalledWith(
          jasmine.objectContaining({
            type: 'ERROR',
            msg: T.F.SYNC.S.CLOCK_DRIFT_WARNING,
          }),
        );
      });

      it('should not warn about clock drift if within threshold', async () => {
        const smallDriftMs = CLOCK_DRIFT_THRESHOLD_MS - 60000; // Threshold - 1 min
        const serverTime = Date.now() - smallDriftMs;

        mockApiProvider.downloadOps.and.returnValue(
          Promise.resolve({
            ops: [
              {
                serverSeq: 1,
                receivedAt: serverTime,
                op: {
                  id: 'op-1',
                  clientId: 'c1',
                  actionType: '[Task] Add',
                  opType: OpType.Create,
                  entityType: 'TASK',
                  payload: {},
                  vectorClock: {},
                  timestamp: Date.now(),
                  schemaVersion: 1,
                },
              },
            ],
            hasMore: false,
            latestSeq: 1,
          }),
        );

        await service.downloadRemoteOps(mockApiProvider);

        expect(OpLog.warn).not.toHaveBeenCalled();
        expect(mockSnackService.open).not.toHaveBeenCalled();
      });

      it('should only warn about clock drift once per session', async () => {
        const driftMs = CLOCK_DRIFT_THRESHOLD_MS + 60000; // Threshold + 1 min
        const serverTime = Date.now() - driftMs;

        mockApiProvider.downloadOps.and.returnValue(
          Promise.resolve({
            ops: [
              {
                serverSeq: 1,
                receivedAt: serverTime,
                op: {
                  id: 'op-1',
                  clientId: 'c1',
                  actionType: '[Task] Add',
                  opType: OpType.Create,
                  entityType: 'TASK',
                  payload: {},
                  vectorClock: {},
                  timestamp: Date.now(),
                  schemaVersion: 1,
                },
              },
            ],
            hasMore: false,
            latestSeq: 1,
          }),
        );

        // First call - should warn
        await service.downloadRemoteOps(mockApiProvider);
        expect(OpLog.warn).toHaveBeenCalledTimes(1);

        // Second call - should NOT warn again
        await service.downloadRemoteOps(mockApiProvider);
        expect(OpLog.warn).toHaveBeenCalledTimes(1);
      });

      it('should acquire lock before downloading', async () => {
        await service.downloadRemoteOps(mockApiProvider);

        expect(mockLockService.request).toHaveBeenCalledWith(
          'sp_op_log_download',
          jasmine.any(Function),
        );
      });

      it('should download operations with pagination', async () => {
        mockApiProvider.getLastServerSeq.and.returnValue(Promise.resolve(0));
        mockApiProvider.downloadOps.and.returnValues(
          Promise.resolve({
            ops: [
              {
                serverSeq: 1,
                receivedAt: Date.now(),
                op: {
                  id: 'op-1',
                  clientId: 'c1',
                  actionType: '[Task] Add',
                  opType: OpType.Create,
                  entityType: 'TASK',
                  payload: {},
                  vectorClock: {},
                  timestamp: Date.now(),
                  schemaVersion: 1,
                },
              },
            ],
            hasMore: true,
            latestSeq: 2,
          }),
          Promise.resolve({
            ops: [
              {
                serverSeq: 2,
                receivedAt: Date.now(),
                op: {
                  id: 'op-2',
                  clientId: 'c1',
                  actionType: '[Task] Update',
                  opType: OpType.Update,
                  entityType: 'TASK',
                  payload: {},
                  vectorClock: {},
                  timestamp: Date.now(),
                  schemaVersion: 1,
                },
              },
            ],
            hasMore: false,
            latestSeq: 2,
          }),
        );

        const result = await service.downloadRemoteOps(mockApiProvider);

        expect(result.newOps.length).toBe(2);
        expect(mockApiProvider.downloadOps).toHaveBeenCalledTimes(2);
      });

      it('should filter already applied operations', async () => {
        mockOpLogStore.getAppliedOpIds.and.returnValue(
          Promise.resolve(new Set(['op-1'])),
        );
        mockApiProvider.downloadOps.and.returnValue(
          Promise.resolve({
            ops: [
              {
                serverSeq: 1,
                receivedAt: Date.now(),
                op: {
                  id: 'op-1',
                  clientId: 'c1',
                  actionType: '[Task] Add',
                  opType: OpType.Create,
                  entityType: 'TASK',
                  payload: {},
                  vectorClock: {},
                  timestamp: Date.now(),
                  schemaVersion: 1,
                },
              },
              {
                serverSeq: 2,
                receivedAt: Date.now(),
                op: {
                  id: 'op-2',
                  clientId: 'c1',
                  actionType: '[Task] Update',
                  opType: OpType.Update,
                  entityType: 'TASK',
                  payload: {},
                  vectorClock: {},
                  timestamp: Date.now(),
                  schemaVersion: 1,
                },
              },
            ],
            hasMore: false,
            latestSeq: 2,
          }),
        );

        const result = await service.downloadRemoteOps(mockApiProvider);

        expect(result.newOps.length).toBe(1);
        expect(result.newOps[0].id).toBe('op-2');
      });

      it('should return success true for API sync', async () => {
        const result = await service.downloadRemoteOps(mockApiProvider);

        expect(result.success).toBeTrue();
        expect(result.failedFileCount).toBe(0);
      });

      describe('gap detection handling', () => {
        it('should reset lastServerSeq to 0 when gap is detected', async () => {
          // First call returns gap detected (client has stale sinceSeq)
          mockApiProvider.getLastServerSeq.and.returnValue(Promise.resolve(100));
          mockApiProvider.downloadOps.and.returnValues(
            // First response: gap detected, no ops
            Promise.resolve({
              ops: [],
              hasMore: false,
              latestSeq: 3,
              gapDetected: true,
            }),
            // Second response after reset: ops from beginning
            Promise.resolve({
              ops: [
                {
                  serverSeq: 1,
                  receivedAt: Date.now(),
                  op: {
                    id: 'op-1',
                    clientId: 'c1',
                    actionType: '[Task] Add',
                    opType: OpType.Create,
                    entityType: 'TASK',
                    payload: {},
                    vectorClock: {},
                    timestamp: Date.now(),
                    schemaVersion: 1,
                  },
                },
              ],
              hasMore: false,
              latestSeq: 3,
              gapDetected: false,
            }),
          );

          const result = await service.downloadRemoteOps(mockApiProvider);

          // Should have re-downloaded after detecting gap (caller is responsible for persisting lastServerSeq)
          expect(mockApiProvider.downloadOps).toHaveBeenCalledTimes(2);
          expect(result.newOps.length).toBe(1);
          // latestServerSeq is returned for caller to persist AFTER storing ops
          expect(result.latestServerSeq).toBe(3);
        });

        it('should only reset once per download session to prevent infinite loops', async () => {
          mockApiProvider.getLastServerSeq.and.returnValue(Promise.resolve(100));
          // Both responses report gap - should only reset once
          mockApiProvider.downloadOps.and.returnValues(
            Promise.resolve({
              ops: [],
              hasMore: false,
              latestSeq: 0,
              gapDetected: true,
            }),
            Promise.resolve({
              ops: [],
              hasMore: false,
              latestSeq: 0,
              gapDetected: true, // Still reports gap after reset
            }),
          );

          const result = await service.downloadRemoteOps(mockApiProvider);

          // Should have exited after second download (no infinite loop)
          expect(mockApiProvider.downloadOps).toHaveBeenCalledTimes(2);
          // Download service no longer calls setLastServerSeq directly - caller handles persistence
          expect(mockApiProvider.setLastServerSeq).not.toHaveBeenCalled();
          // latestServerSeq is returned for caller to persist
          expect(result.latestServerSeq).toBe(0);
        });

        it('should clear accumulated ops when gap is detected mid-download', async () => {
          mockApiProvider.getLastServerSeq.and.returnValue(Promise.resolve(0));
          mockApiProvider.downloadOps.and.returnValues(
            // First page: some ops
            Promise.resolve({
              ops: [
                {
                  serverSeq: 1,
                  receivedAt: Date.now(),
                  op: {
                    id: 'op-stale',
                    clientId: 'c1',
                    actionType: '[Task] Add',
                    opType: OpType.Create,
                    entityType: 'TASK',
                    payload: {},
                    vectorClock: {},
                    timestamp: Date.now(),
                    schemaVersion: 1,
                  },
                },
              ],
              hasMore: true,
              latestSeq: 10,
              gapDetected: false,
            }),
            // Second page: gap detected (shouldn't happen normally but test the logic)
            Promise.resolve({
              ops: [],
              hasMore: false,
              latestSeq: 5,
              gapDetected: true,
            }),
            // After reset: fresh ops
            Promise.resolve({
              ops: [
                {
                  serverSeq: 1,
                  receivedAt: Date.now(),
                  op: {
                    id: 'op-fresh',
                    clientId: 'c1',
                    actionType: '[Task] Add',
                    opType: OpType.Create,
                    entityType: 'TASK',
                    payload: {},
                    vectorClock: {},
                    timestamp: Date.now(),
                    schemaVersion: 1,
                  },
                },
              ],
              hasMore: false,
              latestSeq: 5,
              gapDetected: false,
            }),
          );

          const result = await service.downloadRemoteOps(mockApiProvider);

          // Should only contain the fresh op, not the stale one
          expect(result.newOps.length).toBe(1);
          expect(result.newOps[0].id).toBe('op-fresh');
        });

        it('should return latestServerSeq even when no ops are returned', async () => {
          mockApiProvider.getLastServerSeq.and.returnValue(Promise.resolve(0));
          mockApiProvider.downloadOps.and.returnValue(
            Promise.resolve({
              ops: [],
              hasMore: false,
              latestSeq: 5, // Server has ops but none new for us
              gapDetected: false,
            }),
          );

          const result = await service.downloadRemoteOps(mockApiProvider);

          // Download service returns latestServerSeq for caller to persist
          // (caller will persist it after storing any ops to IndexedDB)
          expect(result.latestServerSeq).toBe(5);
          // Download service no longer calls setLastServerSeq directly
          expect(mockApiProvider.setLastServerSeq).not.toHaveBeenCalled();
        });
      });
    });
  });
});
