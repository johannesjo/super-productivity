import { LocalMeta, RemoteMeta, VectorClock } from '../pfapi.model';
import { lamportToVectorClock, isVectorClockEmpty } from './vector-clock';
import { pfLog } from './log';

/**
 * Utility functions for backwards compatibility with old field names.
 * This allows gradual migration from localLamport/lastSyncedLamport to
 * localChangeCounter/lastSyncedChangeCounter and to vector clocks.
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
  // Fall back to old field name, ensuring we return null if undefined
  return meta.lastSyncedLamport ?? null;
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
  } else if (
    result.localChangeCounter !== undefined &&
    result.localLamport !== undefined &&
    result.localChangeCounter !== result.localLamport
  ) {
    // Warn about field mismatch but use the newer field
    pfLog(1, 'WARN: Mismatch between localChangeCounter and localLamport fields', {
      localChangeCounter: result.localChangeCounter,
      localLamport: result.localLamport,
      using: 'localChangeCounter',
    });
    result.localLamport = result.localChangeCounter;
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
  } else if (
    result.lastSyncedChangeCounter !== undefined &&
    result.lastSyncedLamport !== undefined &&
    result.lastSyncedChangeCounter !== result.lastSyncedLamport
  ) {
    // Warn about field mismatch but use the newer field
    pfLog(
      1,
      'WARN: Mismatch between lastSyncedChangeCounter and lastSyncedLamport fields',
      {
        lastSyncedChangeCounter: result.lastSyncedChangeCounter,
        lastSyncedLamport: result.lastSyncedLamport,
        using: 'lastSyncedChangeCounter',
      },
    );
    result.lastSyncedLamport = result.lastSyncedChangeCounter;
  }

  return result;
};

/**
 * Get the vector clock, creating it from Lamport timestamp if needed
 * @param meta The metadata object
 * @param clientId The client ID to use for migration
 * @returns The vector clock
 */
export const getVectorClock = (
  meta: LocalMeta | RemoteMeta,
  clientId: string,
): VectorClock | undefined => {
  // Return existing vector clock if available
  if (meta.vectorClock && !isVectorClockEmpty(meta.vectorClock)) {
    return meta.vectorClock;
  }

  // Migrate from Lamport timestamp if available
  const changeCounter = getLocalChangeCounter(meta);
  if (changeCounter > 0) {
    return lamportToVectorClock(changeCounter, clientId);
  }

  return undefined;
};

/**
 * Get the last synced vector clock, creating it from Lamport timestamp if needed
 * @param meta The metadata object
 * @param clientId The client ID to use for migration
 * @returns The last synced vector clock
 */
export const getLastSyncedVectorClock = (
  meta: LocalMeta | RemoteMeta,
  clientId: string,
): VectorClock | null => {
  // Return existing vector clock if available
  if (meta.lastSyncedVectorClock && !isVectorClockEmpty(meta.lastSyncedVectorClock)) {
    return meta.lastSyncedVectorClock;
  }

  // Migrate from Lamport timestamp if available
  const lastSyncedCounter = getLastSyncedChangeCounter(meta);
  if (lastSyncedCounter != null && lastSyncedCounter > 0) {
    return lamportToVectorClock(lastSyncedCounter, clientId);
  }

  return null;
};

/**
 * Set the vector clock and update Lamport timestamps for compatibility
 * @param meta The metadata object
 * @param vectorClock The vector clock to set
 * @param clientId The client ID for this instance
 */
export const setVectorClock = (
  meta: LocalMeta | RemoteMeta,
  vectorClock: VectorClock,
  clientId: string,
): void => {
  meta.vectorClock = vectorClock;

  // Update Lamport timestamps for backwards compatibility
  // Use this client's component value
  const clientValue = vectorClock[clientId] || 0;
  setLocalChangeCounter(meta, clientValue);
};

/**
 * Set the last synced vector clock and update Lamport timestamps for compatibility
 * @param meta The metadata object
 * @param vectorClock The vector clock to set (can be null)
 * @param clientId The client ID for this instance
 */
export const setLastSyncedVectorClock = (
  meta: LocalMeta | RemoteMeta,
  vectorClock: VectorClock | null,
  clientId: string,
): void => {
  meta.lastSyncedVectorClock = vectorClock;

  // Update Lamport timestamps for backwards compatibility
  if (vectorClock) {
    const clientValue = vectorClock[clientId] || 0;
    setLastSyncedChangeCounter(meta, clientValue);
  } else {
    setLastSyncedChangeCounter(meta, null);
  }
};

/**
 * Check if both metadata objects have vector clocks
 * @param local Local metadata
 * @param remote Remote metadata
 * @returns True if both have non-empty vector clocks
 */
export const hasVectorClocks = (local: LocalMeta, remote: RemoteMeta): boolean => {
  return (
    !isVectorClockEmpty(local.vectorClock) && !isVectorClockEmpty(remote.vectorClock)
  );
};
