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
  ): { local: LocalMeta; remote: RemoteMeta } => {
    const local: LocalMeta = {
      lastUpdate: localLastUpdate as any,
      lastSyncedUpdate: lastSyncedUpdate as any,
      crossModelVersion: 1,
      metaRev: 'test-rev',
      revMap: {},
    };

    const remote: RemoteMeta = {
      lastUpdate: remoteLastUpdate as any,
      crossModelVersion: 1,
      revMap: {},
      mainModelData: {},
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
      const { local, remote } = createMeta(1000, 1000, 2000);

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

      it('should return LastSyncNotUpToDate when local === remote but lastSync differs', () => {
        const { local, remote } = createMeta(2000, 2000, 1000);

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.Conflict);
        expect(result.conflictData?.reason).toBe(
          ConflictReason.MatchingModelChangeButLastSyncMismatch,
        );
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

      it('should return LastSyncNotUpToDate when local > remote but no local changes', () => {
        const { local, remote } = createMeta(2000, 1000, 2000);

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.Conflict);
        expect(result.conflictData?.reason).toBe(
          ConflictReason.MatchingModelChangeButLastSyncMismatch,
        );
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
      expect(result.status).toBe(SyncStatus.Conflict);
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
});
