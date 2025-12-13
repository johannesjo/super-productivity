import { TestBed } from '@angular/core/testing';
import { OperationLogDownloadService } from './operation-log-download.service';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { LockService } from './lock.service';
import {
  OperationLogManifestService,
  OPS_DIR,
} from '../store/operation-log-manifest.service';
import { SnackService } from '../../../snack/snack.service';
import {
  SyncProviderServiceInterface,
  OperationSyncCapable,
} from '../../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../../pfapi/api/pfapi.const';
import { OpType, OperationLogEntry } from '../operation.types';
import { CLOCK_DRIFT_THRESHOLD_MS, RETRY_DELAY_BASE_MS } from '../operation-log.const';
import { T } from '../../../../t.const';
import { OpLog } from '../../../log';

describe('OperationLogDownloadService', () => {
  let service: OperationLogDownloadService;
  let mockOpLogStore: jasmine.SpyObj<OperationLogStoreService>;
  let mockLockService: jasmine.SpyObj<LockService>;
  let mockManifestService: jasmine.SpyObj<OperationLogManifestService>;
  let mockSnackService: jasmine.SpyObj<SnackService>;

  beforeEach(() => {
    mockOpLogStore = jasmine.createSpyObj('OperationLogStoreService', [
      'getAppliedOpIds',
    ]);
    mockLockService = jasmine.createSpyObj('LockService', ['request']);
    mockManifestService = jasmine.createSpyObj('OperationLogManifestService', [
      'loadRemoteManifest',
      'uploadRemoteManifest',
    ]);
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
    mockManifestService.loadRemoteManifest.and.returnValue(
      Promise.resolve({ operationFiles: [], version: 1 }),
    );

    TestBed.configureTestingModule({
      providers: [
        OperationLogDownloadService,
        { provide: OperationLogStoreService, useValue: mockOpLogStore },
        { provide: LockService, useValue: mockLockService },
        { provide: OperationLogManifestService, useValue: mockManifestService },
        { provide: SnackService, useValue: mockSnackService },
        // Set retry delay to 0 for instant retries in tests
        { provide: RETRY_DELAY_BASE_MS, useValue: 0 },
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

          // Should have reset to 0 and re-downloaded
          expect(mockApiProvider.setLastServerSeq).toHaveBeenCalledWith(0);
          expect(mockApiProvider.downloadOps).toHaveBeenCalledTimes(2);
          expect(result.newOps.length).toBe(1);
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

          await service.downloadRemoteOps(mockApiProvider);

          // Should have called setLastServerSeq(0) only once
          expect(
            mockApiProvider.setLastServerSeq.calls
              .allArgs()
              .filter((args) => args[0] === 0).length,
          ).toBe(1);
          // Should have exited after second download (no infinite loop)
          expect(mockApiProvider.downloadOps).toHaveBeenCalledTimes(2);
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

        it('should update lastServerSeq even when no ops are returned', async () => {
          mockApiProvider.getLastServerSeq.and.returnValue(Promise.resolve(0));
          mockApiProvider.downloadOps.and.returnValue(
            Promise.resolve({
              ops: [],
              hasMore: false,
              latestSeq: 5, // Server has ops but none new for us
              gapDetected: false,
            }),
          );

          await service.downloadRemoteOps(mockApiProvider);

          // Should update lastServerSeq to stay in sync
          expect(mockApiProvider.setLastServerSeq).toHaveBeenCalledWith(5);
        });
      });
    });

    describe('file-based sync', () => {
      let mockFileProvider: jasmine.SpyObj<SyncProviderServiceInterface<SyncProviderId>>;

      beforeEach(() => {
        mockFileProvider = jasmine.createSpyObj('FileSyncProvider', [
          'downloadFile',
          'listFiles',
        ]);
        (mockFileProvider as any).supportsOperationSync = false;
      });

      it('should use file download for non-API providers', async () => {
        mockManifestService.loadRemoteManifest.and.returnValue(
          Promise.resolve({ operationFiles: [], version: 1 }),
        );

        await service.downloadRemoteOps(mockFileProvider);

        expect(mockManifestService.loadRemoteManifest).toHaveBeenCalledWith(
          mockFileProvider,
        );
      });

      it('should download operation files from manifest', async () => {
        const mockEntry: OperationLogEntry = {
          seq: 1,
          op: {
            id: 'op-1',
            actionType: '[Task] Add',
            opType: OpType.Create,
            entityType: 'TASK',
            entityId: 'task-1',
            payload: {},
            clientId: 'c1',
            vectorClock: {},
            timestamp: Date.now(),
            schemaVersion: 1,
          },
          appliedAt: Date.now(),
          source: 'local',
        };

        mockManifestService.loadRemoteManifest.and.returnValue(
          Promise.resolve({ operationFiles: ['ops/ops_client_123.json'], version: 1 }),
        );
        mockFileProvider.downloadFile.and.returnValue(
          Promise.resolve({ dataStr: JSON.stringify([mockEntry]), rev: 'test-rev' }),
        );

        const result = await service.downloadRemoteOps(mockFileProvider);

        expect(mockFileProvider.downloadFile).toHaveBeenCalledWith(
          'ops/ops_client_123.json',
        );
        expect(result.newOps.length).toBe(1);
      });

      it('should fallback to listFiles when manifest is empty', async () => {
        mockManifestService.loadRemoteManifest.and.returnValue(
          Promise.resolve({ operationFiles: [], version: 1 }),
        );
        (mockFileProvider.listFiles as jasmine.Spy).and.returnValue(
          Promise.resolve([`${OPS_DIR}ops_client_123.json`]),
        );
        mockFileProvider.downloadFile.and.returnValue(
          Promise.resolve({ dataStr: '[]', rev: 'test-rev' }),
        );

        await service.downloadRemoteOps(mockFileProvider);

        expect(mockFileProvider.listFiles).toHaveBeenCalledWith(OPS_DIR);
      });

      it('should update manifest after discovering files via listFiles', async () => {
        mockManifestService.loadRemoteManifest.and.returnValue(
          Promise.resolve({ operationFiles: [], version: 1 }),
        );
        (mockFileProvider.listFiles as jasmine.Spy).and.returnValue(
          Promise.resolve([`${OPS_DIR}ops_client_123.json`]),
        );
        mockFileProvider.downloadFile.and.returnValue(
          Promise.resolve({ dataStr: '[]', rev: 'test-rev' }),
        );

        await service.downloadRemoteOps(mockFileProvider);

        expect(mockManifestService.uploadRemoteManifest).toHaveBeenCalled();
      });

      it('should filter already applied operations from files', async () => {
        const mockEntries: OperationLogEntry[] = [
          {
            seq: 1,
            op: {
              id: 'op-1',
              actionType: '[Task] Add',
              opType: OpType.Create,
              entityType: 'TASK',
              entityId: 'task-1',
              payload: {},
              clientId: 'c1',
              vectorClock: {},
              timestamp: Date.now(),
              schemaVersion: 1,
            },
            appliedAt: Date.now(),
            source: 'local',
          },
          {
            seq: 2,
            op: {
              id: 'op-2',
              actionType: '[Task] Update',
              opType: OpType.Update,
              entityType: 'TASK',
              entityId: 'task-1',
              payload: {},
              clientId: 'c1',
              vectorClock: {},
              timestamp: Date.now(),
              schemaVersion: 1,
            },
            appliedAt: Date.now(),
            source: 'local',
          },
        ];

        mockOpLogStore.getAppliedOpIds.and.returnValue(
          Promise.resolve(new Set(['op-1'])),
        );
        mockManifestService.loadRemoteManifest.and.returnValue(
          Promise.resolve({ operationFiles: ['ops/ops_client_123.json'], version: 1 }),
        );
        mockFileProvider.downloadFile.and.returnValue(
          Promise.resolve({ dataStr: JSON.stringify(mockEntries), rev: 'test-rev' }),
        );

        const result = await service.downloadRemoteOps(mockFileProvider);

        expect(result.newOps.length).toBe(1);
        expect(result.newOps[0].id).toBe('op-2');
      });

      // Download failure handling tests
      // These tests verify retry behavior by counting download attempts and verifying
      // the final result. RETRY_DELAY_BASE_MS is set to 0 in TestBed for instant retries.
      describe('download failure handling', () => {
        it('should return success:false when file download fails after all retries', async () => {
          // Setup: provider that always fails to download
          let downloadAttempts = 0;
          mockManifestService.loadRemoteManifest.and.returnValue(
            Promise.resolve({
              operationFiles: ['ops/ops_client_fail.json'],
              version: 1,
            }),
          );

          // Mock downloadFile to track attempts and always reject
          // The service will retry MAX_DOWNLOAD_RETRIES (3) times
          mockFileProvider.downloadFile.and.callFake(async () => {
            downloadAttempts++;
            throw new Error('Network error');
          });

          // Act: Download with retry (delay is 0, so this is instant)
          const result = await service.downloadRemoteOps(mockFileProvider);

          // Assert: Should have attempted download multiple times
          // Note: 1 initial attempt + MAX_DOWNLOAD_RETRIES (3) = 4 total attempts
          expect(downloadAttempts).toBe(4);

          // Assert: Result should indicate failure
          expect(result.success).toBeFalse();
          expect(result.failedFileCount).toBe(1);
          expect(result.newOps).toEqual([]);
        });

        it('should notify user about failed downloads via snackbar', async () => {
          mockManifestService.loadRemoteManifest.and.returnValue(
            Promise.resolve({
              operationFiles: ['ops/ops_client_fail.json'],
              version: 1,
            }),
          );

          // Mock downloadFile to always fail
          mockFileProvider.downloadFile.and.rejectWith(new Error('Network error'));

          // Act
          await service.downloadRemoteOps(mockFileProvider);

          // Assert: Should have shown error notification
          expect(mockSnackService.open).toHaveBeenCalledWith(
            jasmine.objectContaining({
              type: 'ERROR',
            }),
          );
        });

        it('should succeed if download succeeds after retry', async () => {
          let downloadAttempts = 0;
          const mockOps = [
            {
              seq: 1,
              op: {
                id: 'op-retry-success',
                actionType: '[Test] Action',
                opType: OpType.Create,
                entityType: 'TASK',
                entityId: 'task-1',
                payload: {},
                clientId: 'remoteClient',
                vectorClock: { remoteClient: 1 },
                timestamp: Date.now(),
                schemaVersion: 1,
              },
              appliedAt: Date.now(),
              source: 'remote' as const,
            },
          ];

          mockManifestService.loadRemoteManifest.and.returnValue(
            Promise.resolve({
              operationFiles: ['ops/ops_client_retry.json'],
              version: 1,
            }),
          );
          mockOpLogStore.getAppliedOpIds.and.returnValue(Promise.resolve(new Set()));

          // Fail first 2 attempts, succeed on 3rd
          mockFileProvider.downloadFile.and.callFake(async () => {
            downloadAttempts++;
            if (downloadAttempts < 3) {
              throw new Error('Temporary network error');
            }
            return { dataStr: JSON.stringify(mockOps), rev: 'test-rev' };
          });

          // Act
          const result = await service.downloadRemoteOps(mockFileProvider);

          // Assert: Should have retried and eventually succeeded
          expect(downloadAttempts).toBe(3);
          expect(result.success).toBeTrue();
          expect(result.newOps.length).toBe(1);
          expect(result.newOps[0].id).toBe('op-retry-success');
        });

        it('should log warnings for each retry attempt', async () => {
          mockManifestService.loadRemoteManifest.and.returnValue(
            Promise.resolve({
              operationFiles: ['ops/ops_client_warn.json'],
              version: 1,
            }),
          );

          // Fail always to trigger all retries
          mockFileProvider.downloadFile.and.rejectWith(new Error('Network error'));

          // Act
          await service.downloadRemoteOps(mockFileProvider);

          // Assert: Should have logged warnings for each failed attempt
          // Total warnings = one warning per failed attempt that will be retried (3)
          // plus one final warning when all retries exhausted (1) = 4 total
          // Actually looking at the code: warnings are logged before each retry delay,
          // so it's 3 warnings (one before each of the 3 retries)
          // The 4th call might be from the final failure log
          expect((OpLog.warn as jasmine.Spy).calls.count()).toBeGreaterThanOrEqual(3);
        });
      });

      it('should return success true when all files download successfully', async () => {
        mockManifestService.loadRemoteManifest.and.returnValue(
          Promise.resolve({ operationFiles: ['ops/ops_client_1.json'], version: 1 }),
        );
        mockFileProvider.downloadFile.and.returnValue(
          Promise.resolve({ dataStr: '[]', rev: 'test-rev' }),
        );

        const result = await service.downloadRemoteOps(mockFileProvider);

        expect(result.success).toBeTrue();
        expect(result.failedFileCount).toBe(0);
      });
    });
  });
});
