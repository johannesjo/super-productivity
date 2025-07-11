import { ConflictData, LocalMeta, RemoteMeta, VectorClock } from '../pfapi.model';
import { ConflictReason, SyncStatus } from '../pfapi.const';
import { ImpossibleError, InvalidMetaError, NoRemoteMetaFile } from '../errors/errors';
import { PFLog } from '../../../core/log';
import { hasVectorClocks } from './backwards-compat';
import {
  compareVectorClocks,
  VectorClockComparison,
  hasVectorClockChanges,
  vectorClockToString,
} from './vector-clock';

const getTotalVectorClockUpdates = (vc: VectorClock | null | undefined): number => {
  if (!vc) return 0;
  return Object.values(vc).reduce((sum, val) => sum + val, 0);
};

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

  // Check for first-time sync with minimal local data
  // Only auto-import remote if local has very few changes (indicating fresh installation)
  const MINIMAL_UPDATE_THRESHOLD = 1;

  // Handle the case where remote is empty (lastUpdate = 0) - should upload local data
  if (remote.lastUpdate === 0 && local.lastUpdate > 0) {
    PFLog.normal('Remote is empty, uploading local data');
    return {
      status: SyncStatus.UpdateRemote,
    };
  }

  // Handle the case where local is empty (lastUpdate = 0) - should download remote data
  if (local.lastUpdate === 0 && remote.lastUpdate > 0) {
    PFLog.normal('Local is empty, downloading remote data');
    return {
      status: SyncStatus.UpdateLocal,
    };
  }

  if (local.vectorClock && remote.lastUpdate > 0) {
    const localTotalUpdates = getTotalVectorClockUpdates(local.vectorClock);
    const remoteTotalUpdates = getTotalVectorClockUpdates(remote.vectorClock);

    // Only auto-import if local has minimal updates AND remote has significantly more
    if (localTotalUpdates <= MINIMAL_UPDATE_THRESHOLD) {
      PFLog.normal('First-time sync detected with minimal local data', {
        localTotalUpdates,
        remoteTotalUpdates,
        threshold: MINIMAL_UPDATE_THRESHOLD,
        localVectorClock: local.vectorClock,
        remoteVectorClock: remote.vectorClock,
      });
      return {
        status: SyncStatus.UpdateLocal,
      };
    }
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
    // Check if we can use vector clocks for more accurate conflict detection
    const localHasVectorClock =
      local.vectorClock && Object.keys(local.vectorClock).length > 0;
    const remoteHasVectorClock =
      remote.vectorClock && Object.keys(remote.vectorClock).length > 0;

    PFLog.normal('Vector clock availability check', {
      localHasVectorClock,
      remoteHasVectorClock,
      localVectorClock: local.vectorClock,
      remoteVectorClock: remote.vectorClock,
      hasVectorClocksResult: hasVectorClocks(local, remote),
      localLastUpdate: local.lastUpdate,
      remoteLastUpdate: remote.lastUpdate,
      localLastSyncedUpdate: local.lastSyncedUpdate,
    });

    // Always return conflict if either side has no vector clock
    if (!localHasVectorClock || !remoteHasVectorClock) {
      return {
        status: SyncStatus.Conflict,
        conflictData: {
          reason: ConflictReason.BothNewerLastSync,
          remote,
          local,
          additional: {
            vectorClockMissing: true,
            localHasVectorClock,
            remoteHasVectorClock,
          },
        },
      };
    }

    // Try to use vector clocks first if both sides have them
    if (hasVectorClocks(local, remote)) {
      // Extract vector clocks directly since we're comparing full clocks
      // Don't use backwards compatibility functions here as they require client ID for migration
      const localVector = local.vectorClock!;
      const remoteVector = remote.vectorClock!;
      const lastSyncedVector = local.lastSyncedVectorClock;

      PFLog.normal('Using vector clocks for sync status', {
        localVector: vectorClockToString(localVector),
        remoteVector: vectorClockToString(remoteVector),
        lastSyncedVector: vectorClockToString(lastSyncedVector),
        localVectorRaw: localVector,
        remoteVectorRaw: remoteVector,
        lastSyncedVectorRaw: lastSyncedVector,
      });

      try {
        const vectorResult = _checkForUpdateVectorClock({
          localVector,
          remoteVector,
          lastSyncedVector: lastSyncedVector || null,
        });

        switch (vectorResult) {
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
                additional: {
                  vectorClockComparison: VectorClockComparison.CONCURRENT,
                  localVector: vectorClockToString(localVector),
                  remoteVector: vectorClockToString(remoteVector),
                },
              },
            };
        }
      } catch (e) {
        PFLog.critical('Vector clock comparison failed', {
          error: e,
          localVector: vectorClockToString(localVector),
          remoteVector: vectorClockToString(remoteVector),
          lastSyncedVector: vectorClockToString(lastSyncedVector),
        });

        // Return conflict if vector clock comparison fails
        return {
          status: SyncStatus.Conflict,
          conflictData: {
            reason: ConflictReason.BothNewerLastSync,
            remote,
            local,
            additional: {
              vectorClockError: e instanceof Error ? e.message : 'Unknown error',
              localVector: vectorClockToString(localVector),
              remoteVector: vectorClockToString(remoteVector),
            },
          },
        };
      }
    }

    // This should never be reached since we return conflict if vector clocks are missing
    throw new ImpossibleError(
      'Reached unreachable code - vector clocks should be required',
    );
  }
};

enum UpdateCheckResult {
  InSync = 'InSync',
  LocalUpdateRequired = 'LocalUpdateRequired',
  RemoteUpdateRequired = 'RemoteUpdateRequired',
  DataDiverged = 'DataDiverged',
  LastSyncNotUpToDate = 'LastSyncNotUpToDate',
}

const _checkForUpdateVectorClock = (params: {
  localVector: VectorClock;
  remoteVector: VectorClock;
  lastSyncedVector: VectorClock | null;
}): UpdateCheckResult => {
  const { localVector, remoteVector, lastSyncedVector } = params;

  // Validate inputs
  if (!localVector || typeof localVector !== 'object') {
    throw new Error('Invalid localVector in vector clock comparison');
  }
  if (!remoteVector || typeof remoteVector !== 'object') {
    throw new Error('Invalid remoteVector in vector clock comparison');
  }

  PFLog.normal('Vector clock check', {
    localVector: vectorClockToString(localVector),
    remoteVector: vectorClockToString(remoteVector),
    lastSyncedVector: vectorClockToString(lastSyncedVector),
  });

  // Check if there have been changes since last sync
  const hasLocalChanges = hasVectorClockChanges(localVector, lastSyncedVector);
  const hasRemoteChanges = hasVectorClockChanges(remoteVector, lastSyncedVector);

  if (!hasLocalChanges && !hasRemoteChanges) {
    return UpdateCheckResult.InSync;
  } else if (hasLocalChanges && !hasRemoteChanges) {
    return UpdateCheckResult.RemoteUpdateRequired;
  } else if (!hasLocalChanges && hasRemoteChanges) {
    return UpdateCheckResult.LocalUpdateRequired;
  } else {
    // Both have changes - need to check if they're truly concurrent
    const comparison = compareVectorClocks(localVector, remoteVector);

    PFLog.normal('Both sides have changes, vector comparison result:', comparison);

    // If one vector clock dominates the other, we can still sync
    if (comparison === VectorClockComparison.LESS_THAN) {
      // Remote is strictly ahead, update local
      return UpdateCheckResult.LocalUpdateRequired;
    } else if (comparison === VectorClockComparison.GREATER_THAN) {
      // Local is strictly ahead, update remote
      return UpdateCheckResult.RemoteUpdateRequired;
    } else if (comparison === VectorClockComparison.EQUAL) {
      // Both have the same vector clock - they're in sync
      return UpdateCheckResult.InSync;
    } else {
      // Vectors are concurrent - true conflict
      return UpdateCheckResult.DataDiverged;
    }
  }
};
