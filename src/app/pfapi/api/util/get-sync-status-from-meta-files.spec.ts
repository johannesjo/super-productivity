import { getSyncStatusFromMetaFiles } from './get-sync-status-from-meta-files';
import { ConflictReason, SyncStatus } from '../pfapi.const';
import { LocalMeta, RemoteMeta } from '../pfapi.model';
import {
  InvalidMetaError,
  NoRemoteMetaFile,
  SyncInvalidTimeValuesError,
} from '../errors/errors';
describe('getSyncStatusFromMetaFiles', () => {
  // Helper to create test data
  const createMeta = (
    localLastUpdate: number | undefined,
    remoteLastUpdate: number | undefined,
    lastSyncedUpdate: number | null = null,
    lamportData?: {
      localLamport?: number;
      remoteLamport?: number;
      lastSyncedLamport?: number | null;
    },
  ): { local: LocalMeta; remote: RemoteMeta } => {
    const local: LocalMeta = {
      lastUpdate: localLastUpdate as any,
      lastSyncedUpdate: lastSyncedUpdate as any,
      crossModelVersion: 1,
      metaRev: 'test-rev',
      revMap: {},
      localLamport: lamportData?.localLamport ?? 0,
      lastSyncedLamport: lamportData?.lastSyncedLamport ?? null,
    };

    const remote: RemoteMeta = {
      lastUpdate: remoteLastUpdate as any,
      crossModelVersion: 1,
      revMap: {},
      mainModelData: {},
      localLamport: lamportData?.remoteLamport ?? 0,
      lastSyncedLamport: null,
    };

    return { local, remote };
  };

  describe('error cases', () => {
    it('should throw NoRemoteMetaFile when remote is null', () => {
      const { local } = createMeta(1000, 1000, 1000);
      expect(() => getSyncStatusFromMetaFiles(null as any, local)).toThrowError(
        NoRemoteMetaFile,
      );
    });

    it('should throw InvalidMetaError when local is null', () => {
      const { remote } = createMeta(1000, 1000);
      expect(() => getSyncStatusFromMetaFiles(remote, null as any)).toThrowError(
        InvalidMetaError,
      );
    });

    it('should throw SyncInvalidTimeValuesError when timestamps are in the future', () => {
      const futureTime = Date.now() + 10000;
      const { local, remote } = createMeta(futureTime, 1000, 1000);

      expect(() => getSyncStatusFromMetaFiles(remote, local)).toThrowError(
        SyncInvalidTimeValuesError,
      );
    });

    it('should throw SyncInvalidTimeValuesError when lastSync > local', () => {
      const { local, remote } = createMeta(1000, 1500, 2000);

      expect(() => getSyncStatusFromMetaFiles(remote, local)).toThrowError(
        SyncInvalidTimeValuesError,
      );
    });
  });

  describe('missing timestamps', () => {
    it('should return UpdateLocal when local.lastUpdate is not a number', () => {
      const { local, remote } = createMeta(undefined, 1000);

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.UpdateLocal);
    });

    it('should return UpdateRemote when remote.lastUpdate is not a number', () => {
      const { local, remote } = createMeta(1000, undefined, 1000);

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.UpdateRemote);
    });

    it('should return Conflict when lastSyncedUpdate is null but both have updates', () => {
      const { local, remote } = createMeta(1000, 2000, null);

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.Conflict);
      expect(result.conflictData?.reason).toBe(ConflictReason.NoLastSync);
    });
  });

  describe('sync status detection', () => {
    describe('when timestamps are equal (local === remote)', () => {
      it('should return InSync when all timestamps match', () => {
        const { local, remote } = createMeta(1000, 1000, 1000);

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.InSync);
      });

      it('should return InSync when local === remote but lastSync differs', () => {
        const { local, remote } = createMeta(2000, 2000, 1000);

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.InSync);
      });
    });

    describe('when local is newer (local > remote)', () => {
      it('should return RemoteUpdateRequired when only local has changes', () => {
        const { local, remote } = createMeta(2000, 1000, 1000);

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.UpdateRemote);
      });

      it('should return DataDiverged when both have changes (lastSync < remote < local)', () => {
        const { local, remote } = createMeta(3000, 2000, 1000);

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.Conflict);
        expect(result.conflictData?.reason).toBe(ConflictReason.BothNewerLastSync);
      });

      it('should return Conflict when local > remote but it says lastSync === lastLocalUpdate', () => {
        const { local, remote } = createMeta(2000, 1000, 2000);

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.Conflict);
      });
    });

    describe('when remote is newer (local < remote)', () => {
      it('should return LocalUpdateRequired when only remote has changes', () => {
        const { local, remote } = createMeta(1000, 2000, 1000);

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.UpdateLocal);
      });

      it('should return DataDiverged when local has changes despite being older', () => {
        // This is the key fix: detecting local changes even when local timestamp is older
        const { local, remote } = createMeta(1500, 2000, 1000);

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.Conflict);
        expect(result.conflictData?.reason).toBe(ConflictReason.BothNewerLastSync);
      });
    });
  });

  describe('real-world scenarios', () => {
    it('should handle offline editing scenario correctly', () => {
      // Scenario: Phone goes offline, makes changes, meanwhile computer makes changes
      // Phone (local): lastUpdate=1100, lastSync=1000
      // Computer (remote): lastUpdate=1200
      const { local, remote } = createMeta(1100, 1200, 1000);

      // When phone comes back online, it should detect conflict
      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.Conflict);
      expect(result.conflictData?.reason).toBe(ConflictReason.BothNewerLastSync);
    });

    it('should handle clock skew scenario', () => {
      // Phone clock is behind computer clock
      // Phone makes changes with "earlier" timestamp due to clock skew
      // local=900, remote=1200, lastSync=800
      const { local, remote } = createMeta(900, 1200, 800);

      // Should still detect that phone has changes
      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.Conflict);
      expect(result.conflictData?.reason).toBe(ConflictReason.BothNewerLastSync);
    });

    it('should handle rapid sync scenario', () => {
      // Multiple devices syncing in quick succession
      const baseTime = Date.now() - 10000;

      // Device B hasn't synced yet but has old change
      // local=baseTime+50, remote=baseTime+100, lastSync=baseTime
      const { local, remote } = createMeta(baseTime + 50, baseTime + 100, baseTime);

      // Should detect both have changes
      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.Conflict);
    });

    it('should handle sync after long offline period', () => {
      const oldTime = Date.now() - 86400000; // 24 hours ago
      const recentTime = Date.now() - 3600000; // 1 hour ago
      const veryRecentTime = Date.now() - 60000; // 1 minute ago

      // Device was offline for a day, made changes
      const { local, remote } = createMeta(recentTime, veryRecentTime, oldTime);

      // Should detect conflict
      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.Conflict);
    });
  });

  describe('edge cases', () => {
    it('should handle very old lastSync', () => {
      const veryOldTime = 1000;
      const currentTime = Date.now();

      const { local, remote } = createMeta(currentTime, currentTime - 1000, veryOldTime);

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.Conflict);
    });

    it('should handle identical timestamps with different lastSync', () => {
      const time = Date.now() - 5000;
      const { local, remote } = createMeta(time, time, time - 1000);

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.InSync);
    });

    it('should handle all three timestamps being different', () => {
      const { local, remote } = createMeta(3000, 2000, 1000);

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.Conflict);
    });
  });

  describe('conflict data', () => {
    it('should include full metadata in conflict data', () => {
      const { local, remote } = createMeta(1500, 2000, 1000);

      const result = getSyncStatusFromMetaFiles(remote, local);

      expect(result.conflictData).toBeDefined();
      expect(result.conflictData?.local).toEqual(local);
      expect(result.conflictData?.remote).toEqual(remote);
    });
  });

  describe('Lamport timestamp handling', () => {
    describe('when Lamport timestamps are available', () => {
      it('should return InSync when no changes since last sync', () => {
        const { local, remote } = createMeta(2000, 2000, 1500, {
          localLamport: 5,
          remoteLamport: 5,
          lastSyncedLamport: 5,
        });

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.InSync);
      });

      it('should return UpdateRemote when only local has changes', () => {
        const { local, remote } = createMeta(2000, 1500, 1500, {
          localLamport: 10,
          remoteLamport: 5,
          lastSyncedLamport: 5,
        });

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.UpdateRemote);
      });

      it('should return UpdateLocal when only remote has changes', () => {
        const { local, remote } = createMeta(1500, 2000, 1500, {
          localLamport: 5,
          remoteLamport: 10,
          lastSyncedLamport: 5,
        });

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.UpdateLocal);
      });

      it('should return Conflict when both have changes', () => {
        const { local, remote } = createMeta(2100, 2000, 1500, {
          localLamport: 8,
          remoteLamport: 7,
          lastSyncedLamport: 5,
        });

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.Conflict);
        expect(result.conflictData?.reason).toBe(ConflictReason.BothNewerLastSync);
      });

      it('should handle Lamport timestamps correctly even with clock skew', () => {
        // Scenario: local clock is behind but has made changes
        const { local, remote } = createMeta(1000, 2000, 900, {
          localLamport: 10,
          remoteLamport: 8,
          lastSyncedLamport: 8,
        });

        // Lamport timestamps show local has changes, despite older timestamp
        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.UpdateRemote);
      });

      it('should prioritize Lamport timestamps over regular timestamps', () => {
        // Timestamps suggest conflict, but Lamport shows only local changed
        const { local, remote } = createMeta(2000, 1800, 1500, {
          localLamport: 10,
          remoteLamport: 5,
          lastSyncedLamport: 5,
        });

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.UpdateRemote);
      });
    });

    describe('fallback behavior', () => {
      it('should fall back to timestamp checking when Lamport timestamps are missing', () => {
        const { local, remote } = createMeta(2000, 1000, 1000);
        // No Lamport timestamps provided

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.UpdateRemote);
      });

      it('should fall back when only partial Lamport data is available', () => {
        const { local, remote } = createMeta(2000, 1000, 1000, {
          localLamport: 10,
          // remoteLamport missing
          lastSyncedLamport: 5,
        });

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.UpdateRemote);
      });

      it('should fall back when lastSyncedLamport is null', () => {
        const { local, remote } = createMeta(2000, 1000, 1000, {
          localLamport: 10,
          remoteLamport: 5,
          lastSyncedLamport: null,
        });

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.UpdateRemote);
      });
    });

    describe('edge cases with Lamport timestamps', () => {
      it('should handle zero Lamport values', () => {
        const { local, remote } = createMeta(2000, 2000, 2000, {
          localLamport: 0,
          remoteLamport: 0,
          lastSyncedLamport: 0,
        });

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.InSync);
      });

      it('should handle very large Lamport values', () => {
        const { local, remote } = createMeta(2100, 2000, 1500, {
          localLamport: Number.MAX_SAFE_INTEGER - 1,
          remoteLamport: Number.MAX_SAFE_INTEGER - 2,
          lastSyncedLamport: Number.MAX_SAFE_INTEGER - 2,
        });

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.UpdateRemote);
      });
    });

    describe('backwards compatibility', () => {
      it('should work with new field names (localChangeCounter)', () => {
        const local: LocalMeta = {
          lastUpdate: 2000,
          lastSyncedUpdate: 1000,
          crossModelVersion: 1,
          metaRev: 'test-rev',
          revMap: {},
          localLamport: 0, // Old field not set properly
          lastSyncedLamport: null,
          localChangeCounter: 10, // New field
          lastSyncedChangeCounter: 5, // New field
        };

        const remote: RemoteMeta = {
          lastUpdate: 1500,
          crossModelVersion: 1,
          revMap: {},
          mainModelData: {},
          localLamport: 0, // Old field not set properly
          lastSyncedLamport: null,
          localChangeCounter: 5, // New field
        };

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.UpdateRemote);
      });

      it('should work with old field names (localLamport)', () => {
        const { local, remote } = createMeta(2000, 1500, 1000, {
          localLamport: 10,
          remoteLamport: 5,
          lastSyncedLamport: 5,
        });

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.UpdateRemote);
      });

      it('should prefer new field names when both are present', () => {
        const local: LocalMeta = {
          lastUpdate: 2000,
          lastSyncedUpdate: 1000,
          crossModelVersion: 1,
          metaRev: 'test-rev',
          revMap: {},
          localLamport: 5, // Old field (should be ignored)
          lastSyncedLamport: 3,
          localChangeCounter: 10, // New field (should be used)
          lastSyncedChangeCounter: 8,
        };

        const remote: RemoteMeta = {
          lastUpdate: 1500,
          crossModelVersion: 1,
          revMap: {},
          mainModelData: {},
          localLamport: 4, // Old field (should be ignored)
          lastSyncedLamport: null,
          localChangeCounter: 8, // New field (should be used)
        };

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.UpdateRemote);
      });

      it('should handle mixed old/new field scenarios', () => {
        // Local has old fields, remote has new fields
        const local: LocalMeta = {
          lastUpdate: 2000,
          lastSyncedUpdate: 1000,
          crossModelVersion: 1,
          metaRev: 'test-rev',
          revMap: {},
          localLamport: 15,
          lastSyncedLamport: 10,
        };

        const remote: RemoteMeta = {
          lastUpdate: 1500,
          crossModelVersion: 1,
          revMap: {},
          mainModelData: {},
          localLamport: 0, // Not properly set
          lastSyncedLamport: null,
          localChangeCounter: 10, // New field
        };

        const result = getSyncStatusFromMetaFiles(remote, local);
        // Local has changes (15 > 10), remote is at 10, so update remote
        expect(result.status).toBe(SyncStatus.UpdateRemote);
      });
    });
  });
});
