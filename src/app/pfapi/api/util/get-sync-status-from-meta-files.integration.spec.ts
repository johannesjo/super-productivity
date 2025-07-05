import { getSyncStatusFromMetaFiles } from './get-sync-status-from-meta-files';
import { SyncStatus } from '../pfapi.const';
import { LocalMeta, RemoteMeta } from '../pfapi.model';

describe('getSyncStatusFromMetaFiles integration test for vector clock migration', () => {
  it('should return Conflict when local has no vector clock but remote does', () => {
    const local: LocalMeta = {
      lastUpdate: 1000,
      lastSyncedUpdate: 1000,
      crossModelVersion: 1,
      metaRev: 'test-rev',
      revMap: {},
      // No vector clock fields
    } as any;

    const remote: RemoteMeta = {
      lastUpdate: 2000, // Newer than local
      crossModelVersion: 1,
      revMap: {},
      mainModelData: {},
      vectorClock: { CLIENT_456: 10 },
    } as any;

    const result = getSyncStatusFromMetaFiles(remote, local);

    // Should return Conflict because vector clock is missing from local
    expect(result.status).toBe(SyncStatus.Conflict);
    expect((result.conflictData?.additional as any)?.vectorClockMissing).toBe(true);
  });

  it('should return Conflict when vector clocks are missing regardless of timestamps', () => {
    const local: LocalMeta = {
      lastUpdate: 1000,
      lastSyncedUpdate: 1000,
      crossModelVersion: 1,
      metaRev: 'test-rev',
      revMap: {},
      // No vector clock fields
    } as any;

    const remote: RemoteMeta = {
      lastUpdate: 1000, // Same as local
      crossModelVersion: 1,
      revMap: {},
      mainModelData: {},
      vectorClock: { CLIENT_456: 10 },
    } as any;

    const result = getSyncStatusFromMetaFiles(remote, local);

    // Should return Conflict because vector clock is missing from local, regardless of matching timestamps
    expect(result.status).toBe(SyncStatus.Conflict);
    expect((result.conflictData?.additional as any)?.vectorClockMissing).toBe(true);
  });
});
