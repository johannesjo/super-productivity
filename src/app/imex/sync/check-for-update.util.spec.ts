import { checkForUpdate, UpdateCheckResult } from './check-for-update.util';

describe('checkForUpdate', () => {
  it('l > s >= r -> update remote', () => {
    const r1 = checkForUpdate({ local: 2, lastSync: 1, remote: 0 });
    expect(r1).toBe(UpdateCheckResult.RemoteUpdateRequired);

    const r2 = checkForUpdate({ local: 1, lastSync: 0, remote: 0 });
    expect(r2).toBe(UpdateCheckResult.RemoteUpdateRequired);
  });

  it('l = s = r -> no update', () => {
    const r = checkForUpdate({ local: 0, lastSync: 0, remote: 0 });
    expect(r).toBe(UpdateCheckResult.InSync);
  });

  it('l = s < r -> update local', () => {
    const r = checkForUpdate({ local: 0, lastSync: 0, remote: 1 });
    expect(r).toBe(UpdateCheckResult.LocalUpdateRequired);
  });

  it('l > s < r -> conflict', () => {
    const r1 = checkForUpdate({ local: 3, lastSync: 0, remote: 4 });
    expect(r1).toBe(UpdateCheckResult.DataDiverged);
    const r2 = checkForUpdate({ local: 5, lastSync: 2, remote: 3 });
    expect(r2).toBe(UpdateCheckResult.DataDiverged);
  });

  it('l = s > r  -> update local', () => {
    const r = checkForUpdate({ local: 3, lastSync: 3, remote: 0 });
    expect(r).toBe(UpdateCheckResult.RemoteNotUpToDateDespiteSync);
  });

  it('l = r > s -> update last sync', () => {
    const r = checkForUpdate({ local: 4, lastSync: 0, remote: 4 });
    expect(r).toBe(UpdateCheckResult.LastSyncNotUpToDate);
  });

  it('l < s -> error', () => {
    const r = checkForUpdate({ local: 0, lastSync: 3, remote: 4 });
    expect(r).toBe(UpdateCheckResult.ErrorLastSyncNewerThanLocal);
    // expect(() => {
    //   checkForUpdate({local: 0, lastSync: 3, remote: 4});
    // }).toThrowError('This should not happen. lastSyncTo > local');
  });
});
