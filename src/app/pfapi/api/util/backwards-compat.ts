import { LocalMeta, RemoteMeta } from '../pfapi.model';
import { isVectorClockEmpty } from './vector-clock';

/**
 * Utility functions for backwards compatibility.
 * Now focused on vector clock utilities only.
 */

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

/**
 * Get the vector clock from metadata
 * @param meta Metadata object
 * @param clientId Client ID (unused, kept for compatibility)
 * @returns Vector clock or null if not present or empty
 */
export const getVectorClock = (
  meta: LocalMeta | RemoteMeta,
  clientId?: string,
): Record<string, number> | null => {
  if (!meta.vectorClock || Object.keys(meta.vectorClock).length === 0) {
    return null;
  }
  return meta.vectorClock;
};
