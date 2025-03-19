import { ConflictData, MetaFileContent } from '../pfapi.model';
import { ConflictReason, SyncStatus } from '../pfapi.const';
import {
  ImpossibleError,
  InvalidMetaFileError,
  NoRemoteMetaFile,
  SyncInvalidTimeValuesError,
} from '../errors/errors';
import { pfLog } from './log';

export const getSyncStatusFromMetaFiles = (
  remote: MetaFileContent,
  local: MetaFileContent,
): {
  status: SyncStatus;
  conflictData?: ConflictData;
} => {
  if (!remote) {
    throw new NoRemoteMetaFile();
  }
  if (!local) {
    throw new InvalidMetaFileError('localSyncMetaData is not defined');
  }

  if (typeof local.lastSyncModelUpdate !== 'number') {
    return {
      status: SyncStatus.UpdateLocal,
    };
  } else if (typeof remote.lastSyncModelUpdate !== 'number') {
    return {
      status: SyncStatus.UpdateRemote,
    };
  } else {
    if (typeof local.lastSync === 'number') {
      const r = _checkForUpdate({
        remote: remote.lastSyncModelUpdate,
        local: local.lastSyncModelUpdate,
        lastSync: local.lastSync,
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
            },
          };
        case UpdateCheckResult.LastSyncNotUpToDate:
          return {
            status: SyncStatus.Conflict,
            conflictData: {
              reason: ConflictReason.MatchingModelChangeButLastSyncMismatch,
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
      pfLog(1, 'DATA DIVERGED: local > remote');
      return UpdateCheckResult.DataDiverged;
    } else if (lastSync < local) {
      return UpdateCheckResult.RemoteUpdateRequired;
    } else if (lastSync === local) {
      throw new SyncInvalidTimeValuesError({
        msg: 'Dropbox date not up to date despite seemingly successful sync. (This might happen when: 1. You have conflict changes and decide to take the local version. 2. You open the other instance and also decide to use the local version.',
        lastSync,
        local,
      });
    }
  } else if (local < remote) {
    if (lastSync !== local) {
      pfLog(1, 'DATA DIVERGED: local < remote');
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
  console.log(params);
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
  console.log(zeroed, (Date.now() - (params as any)[keyOfOldest]) / 1000);
};
