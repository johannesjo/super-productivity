import { ConflictData, LocalMeta, RemoteMeta, VectorClock } from '../pfapi.model';
import { ConflictReason, SyncStatus } from '../pfapi.const';
import {
  ImpossibleError,
  InvalidMetaError,
  NoRemoteMetaFile,
  SyncInvalidTimeValuesError,
} from '../errors/errors';
import { pfLog } from './log';
import {
  getLocalChangeCounter,
  getLastSyncedChangeCounter,
  hasVectorClocks,
} from './backwards-compat';
import {
  compareVectorClocks,
  VectorClockComparison,
  hasVectorClockChanges,
  vectorClockToString,
} from './vector-clock';

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
    // Check if we can use vector clocks for more accurate conflict detection
    const localHasVectorClock =
      local.vectorClock && Object.keys(local.vectorClock).length > 0;
    const remoteHasVectorClock =
      remote.vectorClock && Object.keys(remote.vectorClock).length > 0;

    pfLog(2, 'Vector clock availability check', {
      localHasVectorClock,
      remoteHasVectorClock,
      localVectorClock: local.vectorClock,
      remoteVectorClock: remote.vectorClock,
      hasVectorClocksResult: hasVectorClocks(local, remote),
      localLastUpdate: local.lastUpdate,
      remoteLastUpdate: remote.lastUpdate,
      localLastSyncedUpdate: local.lastSyncedUpdate,
    });

    // Try to use vector clocks first if both sides have them
    if (hasVectorClocks(local, remote)) {
      // Extract vector clocks directly since we're comparing full clocks
      // Don't use backwards compatibility functions here as they require client ID for migration
      const localVector = local.vectorClock!;
      const remoteVector = remote.vectorClock!;
      const lastSyncedVector = local.lastSyncedVectorClock;

      pfLog(2, 'Using vector clocks for sync status', {
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
        pfLog(0, 'Vector clock comparison failed, falling back to Lamport', {
          error: e,
          localVector: vectorClockToString(localVector),
          remoteVector: vectorClockToString(remoteVector),
          lastSyncedVector: vectorClockToString(lastSyncedVector),
        });
        // Fall through to Lamport comparison below
      }
    }

    // Enhanced fallback: Try to create hybrid comparison using available data
    const localChangeCounter = getLocalChangeCounter(local);
    const remoteChangeCounter = getLocalChangeCounter(remote);
    const lastSyncedChangeCounter = getLastSyncedChangeCounter(local);

    // Handle mixed vector clock states gracefully for migration
    if (localHasVectorClock !== remoteHasVectorClock) {
      pfLog(
        2,
        'Mixed vector clock state detected - using migration-friendly comparison',
        {
          localHasVectorClock,
          remoteHasVectorClock,
          localChangeCounter,
          remoteChangeCounter,
          lastSyncedChangeCounter,
        },
      );

      // If we have valid change counters (non-zero), use them for comparison during migration
      const hasValidChangeCounters =
        typeof localChangeCounter === 'number' &&
        typeof remoteChangeCounter === 'number' &&
        typeof lastSyncedChangeCounter === 'number' &&
        (localChangeCounter > 0 ||
          remoteChangeCounter > 0 ||
          lastSyncedChangeCounter > 0);

      if (hasValidChangeCounters) {
        // Use Lamport comparison logic for mixed states
        const hasLocalChanges = localChangeCounter > lastSyncedChangeCounter;
        const hasRemoteChanges = remoteChangeCounter > lastSyncedChangeCounter;

        if (!hasLocalChanges && !hasRemoteChanges) {
          return { status: SyncStatus.InSync };
        } else if (hasLocalChanges && !hasRemoteChanges) {
          return { status: SyncStatus.UpdateRemote };
        } else if (!hasLocalChanges && hasRemoteChanges) {
          return { status: SyncStatus.UpdateLocal };
        } else {
          // Both have changes - compare values
          if (localChangeCounter > remoteChangeCounter) {
            return { status: SyncStatus.UpdateRemote };
          } else if (remoteChangeCounter > localChangeCounter) {
            return { status: SyncStatus.UpdateLocal };
          } else {
            // Equal change counters with changes - likely same changes
            return { status: SyncStatus.InSync };
          }
        }
      }

      // If no valid change counters, fall back to timestamp comparison
      pfLog(2, 'No valid change counters in mixed state - using timestamp comparison', {
        localHasVectorClock,
        remoteHasVectorClock,
        localLastUpdate: local.lastUpdate,
        remoteLastUpdate: remote.lastUpdate,
        localLastSyncedUpdate: local.lastSyncedUpdate,
      });

      // If we have lastSyncedUpdate, check for changes
      if (typeof local.lastSyncedUpdate === 'number') {
        const hasLocalChanges = local.lastUpdate > local.lastSyncedUpdate;
        const hasRemoteChanges = remote.lastUpdate > local.lastSyncedUpdate;

        pfLog(2, 'Mixed state timestamp comparison', {
          hasLocalChanges,
          hasRemoteChanges,
          calculatedHasLocalChanges: `${local.lastUpdate} > ${local.lastSyncedUpdate} = ${hasLocalChanges}`,
          calculatedHasRemoteChanges: `${remote.lastUpdate} > ${local.lastSyncedUpdate} = ${hasRemoteChanges}`,
        });

        if (!hasLocalChanges && !hasRemoteChanges) {
          return { status: SyncStatus.InSync };
        } else if (hasLocalChanges && !hasRemoteChanges) {
          return { status: SyncStatus.UpdateRemote };
        } else if (!hasLocalChanges && hasRemoteChanges) {
          return { status: SyncStatus.UpdateLocal };
        } else {
          // Both have changes - need to compare timestamps
          if (local.lastUpdate > remote.lastUpdate) {
            return { status: SyncStatus.UpdateRemote };
          } else if (remote.lastUpdate > local.lastUpdate) {
            return { status: SyncStatus.UpdateLocal };
          } else {
            // Equal timestamps with changes - likely same changes
            return { status: SyncStatus.InSync };
          }
        }
      }

      // No lastSyncedUpdate - fall back to direct timestamp comparison
      if (local.lastUpdate === remote.lastUpdate) {
        return { status: SyncStatus.InSync };
      } else if (local.lastUpdate > remote.lastUpdate) {
        return { status: SyncStatus.UpdateRemote };
      } else {
        return { status: SyncStatus.UpdateLocal };
      }
    }

    // Standard Lamport fallback when both sides lack vector clocks

    if (
      typeof localChangeCounter === 'number' &&
      typeof remoteChangeCounter === 'number' &&
      typeof lastSyncedChangeCounter === 'number'
    ) {
      const lamportResult = _checkForUpdateLamport({
        remoteLocalLamport: remoteChangeCounter,
        localLamport: localChangeCounter,
        lastSyncedLamport: lastSyncedChangeCounter,
      });

      pfLog(2, 'Using change counters for sync status', {
        localChangeCounter,
        remoteChangeCounter,
        lastSyncedChangeCounter,
        result: lamportResult,
        hasLocalChanges: localChangeCounter > lastSyncedChangeCounter,
        hasRemoteChanges: remoteChangeCounter > lastSyncedChangeCounter,
      });

      switch (lamportResult) {
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
      }
    }

    // TODO remove later once it is likely that all running apps have lamport clocks
    // Final fallback to timestamp-based checking

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

  pfLog(2, 'Vector clock check', {
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

    pfLog(2, 'Both sides have changes, vector comparison result:', comparison);

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

const _checkForUpdateLamport = (params: {
  remoteLocalLamport: number;
  localLamport: number;
  lastSyncedLamport: number;
}): UpdateCheckResult => {
  const { remoteLocalLamport, localLamport, lastSyncedLamport } = params;

  pfLog(2, 'Lamport timestamp check', {
    localLamport,
    remoteLocalLamport,
    lastSyncedLamport,
    hasLocalChanges: localLamport > lastSyncedLamport,
    hasRemoteChanges: remoteLocalLamport > lastSyncedLamport,
  });

  // Check if there have been changes since last sync
  const hasLocalChanges = localLamport > lastSyncedLamport;
  const hasRemoteChanges = remoteLocalLamport > lastSyncedLamport;

  if (!hasLocalChanges && !hasRemoteChanges) {
    return UpdateCheckResult.InSync;
  } else if (hasLocalChanges && !hasRemoteChanges) {
    return UpdateCheckResult.RemoteUpdateRequired;
  } else if (!hasLocalChanges && hasRemoteChanges) {
    return UpdateCheckResult.LocalUpdateRequired;
  } else {
    // Both have changes - check if they're the same
    if (localLamport === remoteLocalLamport) {
      // Both made the same changes - they're in sync
      return UpdateCheckResult.InSync;
    }
    // Different changes - conflict
    return UpdateCheckResult.DataDiverged;
  }
};

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
