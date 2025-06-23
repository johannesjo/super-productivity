import { LocalMeta, RemoteMeta } from '../pfapi.model';

/**
 * Utility functions for backwards compatibility with old field names.
 * This allows gradual migration from localLamport/lastSyncedLamport to
 * localChangeCounter/lastSyncedChangeCounter.
 */

/**
 * Get the local change counter value, checking both old and new field names
 */
export const getLocalChangeCounter = (meta: LocalMeta | RemoteMeta): number => {
  // Prefer new field name if available
  if (meta.localChangeCounter !== undefined) {
    return meta.localChangeCounter;
  }
  // Fall back to old field name
  return meta.localLamport || 0;
};

/**
 * Get the last synced change counter value, checking both old and new field names
 */
export const getLastSyncedChangeCounter = (
  meta: LocalMeta | RemoteMeta,
): number | null => {
  // Prefer new field name if available
  if (meta.lastSyncedChangeCounter !== undefined) {
    return meta.lastSyncedChangeCounter;
  }
  // Fall back to old field name
  return meta.lastSyncedLamport;
};

/**
 * Set the local change counter value, updating both old and new field names
 * for backwards compatibility
 */
export const setLocalChangeCounter = (
  meta: LocalMeta | RemoteMeta,
  value: number,
): void => {
  meta.localLamport = value;
  meta.localChangeCounter = value;
};

/**
 * Set the last synced change counter value, updating both old and new field names
 * for backwards compatibility
 */
export const setLastSyncedChangeCounter = (
  meta: LocalMeta | RemoteMeta,
  value: number | null,
): void => {
  meta.lastSyncedLamport = value;
  meta.lastSyncedChangeCounter = value;
};

/**
 * Create a metadata object with both old and new field names populated
 */
export const createBackwardsCompatibleMeta = <T extends LocalMeta | RemoteMeta>(
  meta: T,
): T => {
  const result = { ...meta };

  // Ensure both field names are populated
  if (result.localChangeCounter !== undefined && result.localLamport === undefined) {
    result.localLamport = result.localChangeCounter;
  } else if (
    result.localLamport !== undefined &&
    result.localChangeCounter === undefined
  ) {
    result.localChangeCounter = result.localLamport;
  }

  if (
    result.lastSyncedChangeCounter !== undefined &&
    result.lastSyncedLamport === undefined
  ) {
    result.lastSyncedLamport = result.lastSyncedChangeCounter;
  } else if (
    result.lastSyncedLamport !== undefined &&
    result.lastSyncedChangeCounter === undefined
  ) {
    result.lastSyncedChangeCounter = result.lastSyncedLamport;
  }

  return result;
};
