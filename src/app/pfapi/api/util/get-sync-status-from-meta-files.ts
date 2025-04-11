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
          return {
            status: SyncStatus.Conflict,
            conflictData: {
              reason: ConflictReason.MatchingModelChangeButLastSyncMismatch,
              remote,
              local,
            },
          };
        default:
          throw new ImpossibleError();
      }
    } else {
      // when there is no value for last sync, but both local and remote have a value for lastSyncModelUpdate, we have conflict
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

  if (local === remote) {
    if (local === lastSync) {
      return UpdateCheckResult.InSync;
    } else {
      return UpdateCheckResult.LastSyncNotUpToDate;
    }
  } else if (local > remote) {
    if (lastSync < remote) {
      pfLog(0, 'DATA DIVERGED: local > remote && lastSync < remote');
      return UpdateCheckResult.DataDiverged;
    } else if (lastSync < local) {
      return UpdateCheckResult.RemoteUpdateRequired;
    } else if (lastSync === local) {
      return UpdateCheckResult.RemoteUpdateRequired;
    }
  } else if (local < remote) {
    if (lastSync !== local) {
      pfLog(0, 'DATA DIVERGED: local < remote && lastSync !== local');
      return UpdateCheckResult.DataDiverged;
    } else {
      return UpdateCheckResult.LocalUpdateRequired;
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
