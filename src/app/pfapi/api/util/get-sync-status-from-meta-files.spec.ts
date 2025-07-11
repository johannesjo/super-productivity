import { getSyncStatusFromMetaFiles } from './get-sync-status-from-meta-files';
import { ConflictReason, SyncStatus } from '../pfapi.const';
import { LocalMeta, RemoteMeta } from '../pfapi.model';
import { InvalidMetaError, NoRemoteMetaFile } from '../errors/errors';
describe('getSyncStatusFromMetaFiles', () => {
  // Helper to create test data with vector clocks
  const createMeta = (
    localLastUpdate: number | undefined,
    remoteLastUpdate: number | undefined,
    lastSyncedUpdate: number | null = null,
    localVectorClock?: Record<string, number>,
    remoteVectorClock?: Record<string, number>,
    lastSyncedVectorClock?: Record<string, number>,
  ): { local: LocalMeta; remote: RemoteMeta } => {
    const local: LocalMeta = {
      lastUpdate: localLastUpdate as any,
      lastSyncedUpdate: lastSyncedUpdate as any,
      crossModelVersion: 1,
      metaRev: 'test-rev',
      revMap: {},
      vectorClock: localVectorClock,
      lastSyncedVectorClock: lastSyncedVectorClock,
    };

    const remote: RemoteMeta = {
      lastUpdate: remoteLastUpdate as any,
      crossModelVersion: 1,
      revMap: {},
      mainModelData: {},
      vectorClock: remoteVectorClock,
    };

    return { local, remote };
  };

  // Helper to create test data without vector clocks (for error cases)
  const createMetaNoVectorClock = (
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

    it('should return Conflict when timestamps are in the future (no vector clock validation)', () => {
      const futureTime = Date.now() + 10000;
      const { local, remote } = createMetaNoVectorClock(futureTime, 1000, 1000);

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.Conflict);
      expect((result.conflictData?.additional as any)?.vectorClockMissing).toBe(true);
    });

    it('should return Conflict when lastSync > local (no vector clock validation)', () => {
      const { local, remote } = createMetaNoVectorClock(1000, 1500, 2000);

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.Conflict);
      expect((result.conflictData?.additional as any)?.vectorClockMissing).toBe(true);
    });
  });

  describe('first-time sync', () => {
    it('should return UpdateLocal when local is empty (lastUpdate = 0) and remote has data (no vector clock)', () => {
      const { local, remote } = createMetaNoVectorClock(0, 1000);

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.UpdateLocal);
    });

    it('should return UpdateLocal when local has minimal vector clock updates and remote has significantly more data', () => {
      const { local, remote } = createMeta(
        1000,
        2000,
        null,
        { client1: 1 }, // 1 total updates (at threshold of 1)
        { client2: 50 }, // 50 total updates (significantly more than local)
      );

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.UpdateLocal);
    });

    it('should return UpdateLocal when local has multiple clients but still minimal total updates and remote has significantly more', () => {
      const { local, remote } = createMeta(
        1000,
        2000,
        null,
        { client1: 0, client2: 1 }, // 1 total updates (at threshold)
        { client3: 100 }, // 100 total updates (significantly more than local)
      );

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.UpdateLocal);
    });

    it('should return Conflict when local has too many updates (over threshold)', () => {
      const { local, remote } = createMeta(
        1000,
        2000,
        null,
        { client1: 2 }, // 2 updates (over threshold of 1)
        { client2: 50 },
      );

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.Conflict);
    });

    it('should return UpdateRemote when remote is empty and local has data', () => {
      const { local, remote } = createMeta(1000, 0);

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.UpdateRemote);
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
      const { local, remote } = createMetaNoVectorClock(1000, 2000, null);

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.Conflict);
      expect(result.conflictData?.reason).toBe(ConflictReason.BothNewerLastSync);
      expect((result.conflictData?.additional as any)?.vectorClockMissing).toBe(true);
    });
  });

  describe('sync status detection', () => {
    describe('when timestamps are equal (local === remote)', () => {
      it('should return UpdateLocal when all timestamps match but has minimal updates', () => {
        const { local, remote } = createMeta(
          1000,
          1000,
          1000,
          { CLIENT_A: 1 }, // local vector clock
          { CLIENT_A: 1 }, // remote vector clock
          { CLIENT_A: 1 }, // last synced vector clock
        );

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.UpdateLocal);
      });

      it('should return InSync when local === remote but lastSync differs', () => {
        const { local, remote } = createMeta(
          2000,
          2000,
          1000,
          { CLIENT_A: 2 }, // local vector clock
          { CLIENT_A: 2 }, // remote vector clock
          { CLIENT_A: 2 }, // last synced vector clock
        );

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.InSync);
      });
    });

    describe('when local is newer (local > remote)', () => {
      it('should return RemoteUpdateRequired when only local has changes', () => {
        const { local, remote } = createMeta(
          2000,
          1000,
          1000,
          { CLIENT_A: 2 }, // local vector clock (advanced)
          { CLIENT_A: 1 }, // remote vector clock (behind)
          { CLIENT_A: 1 }, // last synced vector clock
        );

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.UpdateRemote);
      });

      it('should return DataDiverged when both have changes (concurrent clocks)', () => {
        const { local, remote } = createMeta(
          3000,
          2000,
          1000,
          { CLIENT_A: 2, CLIENT_B: 1 }, // local vector clock
          { CLIENT_A: 1, CLIENT_B: 2 }, // remote vector clock (concurrent)
          { CLIENT_A: 1, CLIENT_B: 1 }, // last synced vector clock
        );

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.Conflict);
        expect(result.conflictData?.reason).toBe(ConflictReason.BothNewerLastSync);
      });

      it('should return Conflict when local > remote but it says lastSync === lastLocalUpdate', () => {
        const { local, remote } = createMeta(
          2000,
          1000,
          2000,
          { CLIENT_A: 2, CLIENT_B: 1 }, // local vector clock
          { CLIENT_A: 1, CLIENT_B: 2 }, // remote vector clock (concurrent)
          { CLIENT_A: 1, CLIENT_B: 1 }, // last synced vector clock
        );

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.Conflict);
      });
    });

    describe('when remote is newer (local < remote)', () => {
      it('should return LocalUpdateRequired when only remote has changes', () => {
        const { local, remote } = createMeta(
          1000,
          2000,
          1000,
          { CLIENT_A: 1 }, // local vector clock (same as last sync)
          { CLIENT_A: 2 }, // remote vector clock (advanced)
          { CLIENT_A: 1 }, // last synced vector clock
        );

        const result = getSyncStatusFromMetaFiles(remote, local);
        expect(result.status).toBe(SyncStatus.UpdateLocal);
      });

      it('should return DataDiverged when local has changes despite being older', () => {
        // This is the key fix: detecting local changes even when local timestamp is older
        const { local, remote } = createMeta(
          1500,
          2000,
          1000,
          { CLIENT_A: 2, CLIENT_B: 1 }, // local vector clock (has changes)
          { CLIENT_A: 1, CLIENT_B: 2 }, // remote vector clock (concurrent)
          { CLIENT_A: 1, CLIENT_B: 1 }, // last synced vector clock
        );

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
      const { local, remote } = createMeta(
        1100,
        1200,
        1000,
        { PHONE: 2, COMPUTER: 1 }, // local vector clock (phone advanced)
        { PHONE: 1, COMPUTER: 2 }, // remote vector clock (computer advanced)
        { PHONE: 1, COMPUTER: 1 }, // last synced vector clock
      );

      // When phone comes back online, it should detect conflict
      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.Conflict);
      expect(result.conflictData?.reason).toBe(ConflictReason.BothNewerLastSync);
    });

    it('should handle clock skew scenario', () => {
      // Phone clock is behind computer clock
      // Phone makes changes with "earlier" timestamp due to clock skew
      // local=900, remote=1200, lastSync=800
      const { local, remote } = createMeta(
        900,
        1200,
        800,
        { PHONE: 2, COMPUTER: 1 }, // local vector clock (phone advanced)
        { PHONE: 1, COMPUTER: 2 }, // remote vector clock (computer advanced)
        { PHONE: 1, COMPUTER: 1 }, // last synced vector clock
      );

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
      const { local, remote } = createMeta(
        baseTime + 50,
        baseTime + 100,
        baseTime,
        { DEVICE_A: 2, DEVICE_B: 1 }, // local vector clock
        { DEVICE_A: 1, DEVICE_B: 2 }, // remote vector clock (concurrent)
        { DEVICE_A: 1, DEVICE_B: 1 }, // last synced vector clock
      );

      // Should detect both have changes
      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.Conflict);
    });

    it('should handle sync after long offline period', () => {
      const oldTime = Date.now() - 86400000; // 24 hours ago
      const recentTime = Date.now() - 3600000; // 1 hour ago
      const veryRecentTime = Date.now() - 60000; // 1 minute ago

      // Device was offline for a day, made changes
      const { local, remote } = createMeta(
        recentTime,
        veryRecentTime,
        oldTime,
        { OFFLINE_DEVICE: 5, ONLINE_DEVICE: 2 }, // local vector clock (offline device advanced)
        { OFFLINE_DEVICE: 2, ONLINE_DEVICE: 5 }, // remote vector clock (online device advanced)
        { OFFLINE_DEVICE: 2, ONLINE_DEVICE: 2 }, // last synced vector clock
      );

      // Should detect conflict
      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.Conflict);
    });
  });

  describe('edge cases', () => {
    it('should handle very old lastSync', () => {
      const veryOldTime = 1000;
      const currentTime = Date.now();

      const { local, remote } = createMeta(
        currentTime,
        currentTime - 1000,
        veryOldTime,
        { CLIENT_A: 10, CLIENT_B: 5 }, // local vector clock (has changes)
        { CLIENT_A: 5, CLIENT_B: 10 }, // remote vector clock (concurrent)
        { CLIENT_A: 1, CLIENT_B: 1 }, // very old last synced vector clock
      );

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.Conflict);
    });

    it('should handle identical timestamps with different lastSync', () => {
      const time = Date.now() - 5000;
      const { local, remote } = createMeta(
        time,
        time,
        time - 1000,
        { CLIENT_A: 5 }, // local vector clock
        { CLIENT_A: 5 }, // remote vector clock (same)
        { CLIENT_A: 5 }, // last synced vector clock (also same)
      );

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.InSync);
    });

    it('should handle all three timestamps being different', () => {
      const { local, remote } = createMeta(
        3000,
        2000,
        1000,
        { CLIENT_A: 3, CLIENT_B: 1 }, // local vector clock (has changes)
        { CLIENT_A: 1, CLIENT_B: 2 }, // remote vector clock (concurrent)
        { CLIENT_A: 1, CLIENT_B: 1 }, // last synced vector clock
      );

      const result = getSyncStatusFromMetaFiles(remote, local);
      expect(result.status).toBe(SyncStatus.Conflict);
    });
  });

  describe('conflict data', () => {
    it('should include full metadata in conflict data', () => {
      const { local, remote } = createMeta(
        1500,
        2000,
        1000,
        { CLIENT_A: 2, CLIENT_B: 1 }, // local vector clock (has changes)
        { CLIENT_A: 1, CLIENT_B: 2 }, // remote vector clock (concurrent)
        { CLIENT_A: 1, CLIENT_B: 1 }, // last synced vector clock
      );

      const result = getSyncStatusFromMetaFiles(remote, local);

      expect(result.conflictData).toBeDefined();
      expect(result.conflictData?.local).toEqual(local);
      expect(result.conflictData?.remote).toEqual(remote);
    });
  });
});
