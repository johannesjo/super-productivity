import { getSyncStatusFromMetaFiles } from './get-sync-status-from-meta-files';
import { SyncStatus } from '../pfapi.const';
import { LocalMeta, RemoteMeta } from '../pfapi.model';

describe('getSyncStatusFromMetaFiles integration test for vector clock migration', () => {
  it('should return UpdateLocal when local has no vector clock but remote does and is newer', () => {
    const local: LocalMeta = {
      lastUpdate: 1000,
      lastSyncedUpdate: 1000,
      crossModelVersion: 1,
      metaRev: 'test-rev',
      revMap: {},
      localLamport: 0,
      lastSyncedLamport: 0,
      // No vector clock fields
    } as any;

    const remote: RemoteMeta = {
      lastUpdate: 2000, // Newer than local
      crossModelVersion: 1,
      revMap: {},
      mainModelData: {},
      localLamport: 0,
      lastSyncedLamport: null,
      vectorClock: { CLIENT_456: 10 },
    } as any;

    const result = getSyncStatusFromMetaFiles(remote, local);

    // Should return UpdateLocal because remote is newer
    expect(result.status).toBe(SyncStatus.UpdateLocal);
  });

  it('should return InSync when timestamps match even with vector clock mismatch', () => {
    const local: LocalMeta = {
      lastUpdate: 1000,
      lastSyncedUpdate: 1000,
      crossModelVersion: 1,
      metaRev: 'test-rev',
      revMap: {},
      localLamport: 0,
      lastSyncedLamport: 0,
      // No vector clock fields
    } as any;

    const remote: RemoteMeta = {
      lastUpdate: 1000, // Same as local
      crossModelVersion: 1,
      revMap: {},
      mainModelData: {},
      localLamport: 0,
      lastSyncedLamport: null,
      vectorClock: { CLIENT_456: 10 },
    } as any;

    const result = getSyncStatusFromMetaFiles(remote, local);

    // Should return InSync because timestamps match
    expect(result.status).toBe(SyncStatus.InSync);
  });
});
