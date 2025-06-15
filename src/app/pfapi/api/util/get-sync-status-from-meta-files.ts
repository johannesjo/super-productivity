import { ConflictData, LocalMeta, RemoteMeta } from '../pfapi.model';
import { ConflictReason, SyncStatus } from '../pfapi.const';
import {
  ImpossibleError,
  InvalidMetaError,
  NoRemoteMetaFile,
  SyncInvalidTimeValuesError,
} from '../errors/errors';
import { pfLog } from './log';

// TODO unit test the hell out of this
export const getSyncStatusFromMetaFiles = (
  remote: RemoteMeta,
  local: LocalMeta,
): {
  status: SyncStatus;
  conflictData?: ConflictData;
} => {
  if (!remote) {
    throw new NoRemoteMetaFile();
  }
  if (!local) {
    throw new InvalidMetaError('localSyncMetaData is not defined');
  }

  if (typeof local.lastUpdate !== 'number') {
    return {
      status: SyncStatus.UpdateLocal,
    };
  } else if (typeof remote.lastUpdate !== 'number') {
    return {
      status: SyncStatus.UpdateRemote,
    };
  } else {
    if (typeof local.lastSyncedUpdate === 'number') {
      const r = _checkForUpdate({
        remote: remote.lastUpdate,
        local: local.lastUpdate,
        lastSync: local.lastSyncedUpdate,
      });

      switch (r) {
        case UpdateCheckResult.InSync:
          return {
            status: SyncStatus.InSync,
          };
        case UpdateCheckResult.LocalUpdateRequired:
          return {
            status: SyncStatus.UpdateLocal,
          };
        case UpdateCheckResult.RemoteUpdateRequired:
          return {
            status: SyncStatus.UpdateRemote,
          };
        case UpdateCheckResult.DataDiverged:
          return {
            status: SyncStatus.Conflict,
            conflictData: {
              reason: ConflictReason.BothNewerLastSync,
              remote,
              local,
            },
          };
        case UpdateCheckResult.LastSyncNotUpToDate:
          // When timestamps match but lastSync is different, this means
          // the data is in sync but metadata needs updating.
          // This happens after uploads when lastSyncedUpdate hasn't been persisted yet.
          pfLog(2, 'LastSyncNotUpToDate - treating as InSync to update metadata', {
            reason: ConflictReason.MatchingModelChangeButLastSyncMismatch,
            local,
            remote,
          });
          // NOTE this is so unlikely that we can safely resume, that data is in sync even though
          // lastSync was not properly saved
          if (local.lastUpdate === remote.lastUpdate) {
            pfLog(
              1,
              'WARN: lastSyncedUpdate is not up to date but timestamps match - treating as InSync',
            );
            return {
              status: SyncStatus.InSync,
            };
          }

          return {
            status: SyncStatus.Conflict,
          };
        default:
          throw new ImpossibleError();
      }
    } else {
      // when there is no value for last sync, check if timestamps match
      pfLog(2, 'No lastSyncedUpdate found, checking timestamps', {
        localLastUpdate: local.lastUpdate,
        remoteLastUpdate: remote.lastUpdate,
        areEqual: local.lastUpdate === remote.lastUpdate,
      });

      // If both timestamps are identical, we're very likely in sync
      if (local.lastUpdate === remote.lastUpdate) {
        pfLog(2, 'No lastSyncedUpdate but timestamps match - treating as InSync', {
          local,
          remote,
        });
        return {
          status: SyncStatus.InSync,
        };
      }

      // Only report conflict if we truly can't determine the state
      return {
        status: SyncStatus.Conflict,
        conflictData: {
          reason: ConflictReason.NoLastSync,
          remote,
          local,
        },
      };
    }
  }
};

enum UpdateCheckResult {
  InSync = 'InSync',
  LocalUpdateRequired = 'LocalUpdateRequired',
  RemoteUpdateRequired = 'RemoteUpdateRequired',
  DataDiverged = 'DataDiverged',
  LastSyncNotUpToDate = 'LastSyncNotUpToDate',
}

const _checkForUpdate = (params: {
  remote: number;
  local: number;
  lastSync: number;
}): UpdateCheckResult => {
  // TODO remove or improve
  _logHelper(params);
  const { remote, local, lastSync } = params;
  const n = Date.now();

  if (remote > n || local > n || lastSync > n) {
    throw new SyncInvalidTimeValuesError({
      msg: 'Sync Error: One of the dates provided is from the future',
      remote,
      local,
      lastSync,
      n,
    });
  }

  if (lastSync > local) {
    throw new SyncInvalidTimeValuesError({
      msg: 'This should not happen. lastSync > local',
      lastSync,
      local,
    });
  }

  // Check if data has been modified since last sync
  const hasLocalChanges = local > lastSync;
  const hasRemoteChanges = remote > lastSync;

  if (local === remote) {
    if (local === lastSync) {
      return UpdateCheckResult.InSync;
    } else {
      pfLog(2, 'Timestamps match but lastSync is outdated', {
        local,
        remote,
        lastSync,
        delta: local - lastSync,
      });
      return UpdateCheckResult.LastSyncNotUpToDate;
    }
  } else if (local > remote) {
    if (lastSync < remote) {
      // Local is newer than remote, but remote has changes since last sync
      pfLog(0, 'DATA DIVERGED: local > remote && lastSync < remote');
      return UpdateCheckResult.DataDiverged;
    } else if (hasLocalChanges) {
      // Local has changes and remote doesn't
      return UpdateCheckResult.RemoteUpdateRequired;
    } else if (lastSync === local) {
      // This is an impossible scenario - we can't have synced at the exact same time
      // as our local update while the remote is older. This indicates corruption/conflict.
      pfLog(0, 'CONFLICT: local > remote but lastSync === local (impossible scenario)');
      return UpdateCheckResult.DataDiverged;
    } else {
      // This shouldn't happen - local is newer but no changes since sync
      return UpdateCheckResult.LastSyncNotUpToDate;
    }
  } else if (local < remote) {
    //  Check if local has changes even though it's older
    if (hasLocalChanges) {
      // Local has changes even though remote is newer - conflict!
      pfLog(0, 'DATA DIVERGED: local < remote but local has changes since lastSync');
      return UpdateCheckResult.DataDiverged;
    } else if (hasRemoteChanges) {
      // Only remote has changes
      return UpdateCheckResult.LocalUpdateRequired;
    } else {
      // Neither has changes but timestamps differ
      return UpdateCheckResult.LastSyncNotUpToDate;
    }
  }

  throw new ImpossibleError('inconclusive state');
};

const _logHelper = (params: {
  remote: number;
  local: number;
  lastSync: number;
}): void => {
  pfLog(2, `${getSyncStatusFromMetaFiles.name}()`, params, {
    remote: new Date(params.remote).toISOString(),
    local: new Date(params.local).toISOString(),
    lastSync: new Date(params.lastSync).toISOString(),
    hasLocalChanges: params.local > params.lastSync,
    hasRemoteChanges: params.remote > params.lastSync,
  });
  const oldestFirst = Object.keys(params).sort(
    (k1: string, k2: string) => (params as any)[k1] - (params as any)[k2],
  );
  const keyOfOldest = oldestFirst[0];
  const zeroed = oldestFirst.reduce(
    (acc, key) => ({
      ...acc,
      [key]: ((params as any)[key] - (params as any)[keyOfOldest]) / 1000,
    }),
    {},
  );
  pfLog(
    2,
    `${getSyncStatusFromMetaFiles.name}()`,
    zeroed,
    (Date.now() - (params as any)[keyOfOldest]) / 1000,
  );
};
