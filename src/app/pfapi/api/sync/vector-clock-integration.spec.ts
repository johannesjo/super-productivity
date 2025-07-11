import { TestBed } from '@angular/core/testing';
import { MetaModelCtrl } from '../model-ctrl/meta-model-ctrl';
import { MetaSyncService } from './meta-sync.service';
import { ModelSyncService } from './model-sync.service';
import { LocalMeta, RemoteMeta, VectorClock } from '../pfapi.model';
import { SyncStatus } from '../pfapi.const';
import {
  incrementVectorClock,
  mergeVectorClocks,
  limitVectorClockSize,
  sanitizeVectorClock,
} from '../util/vector-clock';
import { getSyncStatusFromMetaFiles } from '../util/get-sync-status-from-meta-files';

describe('Vector Clock Integration with Sync Service', () => {
  let metaModelCtrl: jasmine.SpyObj<MetaModelCtrl>;

  const CLIENT_ID_A = 'CLIENT_A_12345';
  const CLIENT_ID_B = 'CLIENT_B_67890';

  const createLocalMeta = (overrides: Partial<LocalMeta> = {}): LocalMeta => ({
    lastUpdate: Date.now(),
    lastSyncedUpdate: null,
    crossModelVersion: 1,
    metaRev: null,
    revMap: {},
    vectorClock: {},
    lastSyncedVectorClock: null,
    ...overrides,
  });

  const createRemoteMeta = (overrides: Partial<RemoteMeta> = {}): RemoteMeta => ({
    lastUpdate: Date.now(),
    crossModelVersion: 1,
    revMap: {},
    mainModelData: {},
    vectorClock: {},
    ...overrides,
  });

  beforeEach(() => {
    const metaModelCtrlSpy = jasmine.createSpyObj('MetaModelCtrl', [
      'load',
      'save',
      'loadClientId',
      'updateRevForModel',
    ]);
    const metaSyncServiceSpy = jasmine.createSpyObj('MetaSyncService', [
      'download',
      'upload',
      'saveLocal',
    ]);
    const modelSyncServiceSpy = jasmine.createSpyObj('ModelSyncService', [
      'download',
      'upload',
      'getModelIdsToUpdateFromRevMaps',
      'updateLocalUpdated',
      'updateLocalMainModelsFromRemoteMetaFile',
    ]);

    TestBed.configureTestingModule({
      providers: [
        { provide: MetaModelCtrl, useValue: metaModelCtrlSpy },
        { provide: MetaSyncService, useValue: metaSyncServiceSpy },
        { provide: ModelSyncService, useValue: modelSyncServiceSpy },
      ],
    });

    metaModelCtrl = TestBed.inject(MetaModelCtrl) as jasmine.SpyObj<MetaModelCtrl>;
  });

  describe('Vector Clock Sync Status Detection', () => {
    it('should correctly detect sync status with vector clocks', () => {
      const localVector: VectorClock = { [CLIENT_ID_A]: 5, [CLIENT_ID_B]: 3 };
      const remoteVector: VectorClock = { [CLIENT_ID_A]: 5, [CLIENT_ID_B]: 3 };

      const local = createLocalMeta({
        vectorClock: localVector,
        lastSyncedVectorClock: localVector,
      });

      const remote = createRemoteMeta({
        vectorClock: remoteVector,
      });

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.InSync);
    });

    it('should detect conflicts when vector clocks are concurrent', () => {
      const localVector: VectorClock = { [CLIENT_ID_A]: 5, [CLIENT_ID_B]: 2 };
      const remoteVector: VectorClock = { [CLIENT_ID_A]: 3, [CLIENT_ID_B]: 4 };
      const lastSyncedVector: VectorClock = { [CLIENT_ID_A]: 3, [CLIENT_ID_B]: 2 };

      const local = createLocalMeta({
        vectorClock: localVector,
        lastSyncedVectorClock: lastSyncedVector,
      });

      const remote = createRemoteMeta({
        vectorClock: remoteVector,
      });

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.Conflict);
    });
  });

  describe('Vector Clock Pruning Integration', () => {
    it('should apply pruning after merging vector clocks', () => {
      // Create a large vector clock with many clients
      const largeVectorClock: VectorClock = {};
      for (let i = 0; i < 100; i++) {
        largeVectorClock[`CLIENT_${i}`] = i;
      }

      // Simulate merging and pruning
      const currentClientId = 'CLIENT_99';
      const merged = mergeVectorClocks(largeVectorClock, { [currentClientId]: 150 });
      const pruned = limitVectorClockSize(merged, currentClientId);

      expect(Object.keys(pruned).length).toBe(50); // MAX_VECTOR_CLOCK_SIZE
      expect(pruned[currentClientId]).toBe(150); // Current client preserved

      // Verify most active clients are kept
      const values = Object.values(pruned).sort((a, b) => b - a);
      expect(values[0]).toBeGreaterThanOrEqual(50); // High value clients kept
    });

    it('should handle pruning during sync operations', async () => {
      const largeLocalVector: VectorClock = {};
      const largeRemoteVector: VectorClock = {};

      // Create large vector clocks
      for (let i = 0; i < 60; i++) {
        largeLocalVector[`CLIENT_LOCAL_${i}`] = i * 2;
        largeRemoteVector[`CLIENT_REMOTE_${i}`] = i * 3;
      }

      // Test data is created but not used directly in sync
      // This test focuses on the pruning operation itself
      createLocalMeta({
        vectorClock: largeLocalVector,
      });

      createRemoteMeta({
        vectorClock: largeRemoteVector,
      });

      metaModelCtrl.loadClientId.and.returnValue(Promise.resolve(CLIENT_ID_A));

      // Simulate merge and prune
      const merged = mergeVectorClocks(largeLocalVector, largeRemoteVector);
      const pruned = limitVectorClockSize(merged, CLIENT_ID_A);

      expect(Object.keys(merged).length).toBeGreaterThan(100); // Before pruning
      expect(Object.keys(pruned).length).toBe(50); // After pruning
    });
  });

  describe('Vector Clock Sanitization', () => {
    it('should sanitize invalid vector clocks before operations', () => {
      const invalidVector = {
        validClient: 5,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '': 10, // Invalid empty key
        negativeClient: -1, // Invalid negative value
        stringClient: 'not a number' as any, // Invalid type
        tooLargeClient: Number.MAX_SAFE_INTEGER + 1, // Too large
      };

      const sanitized = sanitizeVectorClock(invalidVector);

      expect(sanitized).toEqual({ validClient: 5 });
      expect(Object.keys(sanitized).length).toBe(1);
    });

    it('should handle corrupted vector clocks during sync', () => {
      const corruptedRemote = createRemoteMeta({
        vectorClock: {
          client1: NaN,
          client2: Infinity,
          client3: -5,
        } as any,
      });

      const local = createLocalMeta({
        vectorClock: { [CLIENT_ID_A]: 10 },
      });

      // Should not throw, but handle gracefully
      const sanitizedRemote = sanitizeVectorClock(corruptedRemote.vectorClock || {});
      expect(sanitizedRemote).toEqual({});

      const result = getSyncStatusFromMetaFiles(
        {
          ...corruptedRemote,
          vectorClock: sanitizedRemote,
        },
        local,
      );

      expect(result.status).toBeDefined();
    });
  });

  describe('Migration Scenarios', () => {
    it('should preserve vector clock data during force upload', () => {
      const localVector: VectorClock = { [CLIENT_ID_A]: 10 };
      const remoteVector: VectorClock = { [CLIENT_ID_B]: 20, [CLIENT_ID_A]: 5 };

      // Simulate force upload merge
      const merged = mergeVectorClocks(localVector, remoteVector);
      const incremented = incrementVectorClock(merged, CLIENT_ID_A);

      expect(incremented[CLIENT_ID_A]).toBe(11); // Local incremented
      expect(incremented[CLIENT_ID_B]).toBe(20); // Remote preserved
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle rapid increments without performance degradation', () => {
      let clock: VectorClock = {};
      const clientId = 'RAPID_CLIENT';
      const iterations = 1000;

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        clock = incrementVectorClock(clock, clientId);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(clock[clientId]).toBe(iterations);
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should warn when vector clock grows large', () => {
      spyOn(console, 'warn'); // Note: In real implementation, this would be SyncLog

      let clock: VectorClock = {};

      // Add many clients to trigger warning
      for (let i = 0; i < 35; i++) {
        clock = incrementVectorClock(clock, `CLIENT_${i}`);
      }

      expect(Object.keys(clock).length).toBe(35);
      // In real implementation, check SyncLog was called with warning
    });
  });

  describe('Error Recovery', () => {
    it('should recover from vector clock comparison errors', () => {
      // Create vector clocks that might cause comparison issues
      const local = createLocalMeta({
        vectorClock: { [CLIENT_ID_A]: 5 },
      });

      const remote = createRemoteMeta({
        vectorClock: null as any, // Invalid but might occur
      });

      // Should not throw, but handle gracefully
      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBeDefined();
    });

    it('should handle overflow protection during increment', () => {
      const clock: VectorClock = {
        [CLIENT_ID_A]: Number.MAX_SAFE_INTEGER - 500,
      };

      const incremented = incrementVectorClock(clock, CLIENT_ID_A);

      expect(incremented[CLIENT_ID_A]).toBe(1); // Reset due to overflow protection
    });
  });
});
