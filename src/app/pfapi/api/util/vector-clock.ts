import { pfLog } from './log';

/**
 * Vector Clock implementation for distributed synchronization
 *
 * A vector clock is a data structure used to determine the partial ordering of events
 * in a distributed system and detect causality violations.
 *
 * Each process/device maintains its own component in the vector, incrementing it
 * on local updates. This allows us to determine if two states are:
 * - EQUAL: Same vector values
 * - LESS_THAN: A happened before B
 * - GREATER_THAN: B happened before A
 * - CONCURRENT: Neither happened before the other (true conflict)
 */

/**
 * Vector clock data structure
 * Maps client IDs to their respective clock values
 */
export interface VectorClock {
  [clientId: string]: number;
}

/**
 * Result of comparing two vector clocks
 */
export enum VectorClockComparison {
  EQUAL = 'EQUAL',
  LESS_THAN = 'LESS_THAN',
  GREATER_THAN = 'GREATER_THAN',
  CONCURRENT = 'CONCURRENT',
}

/**
 * Initialize a new vector clock for a client
 * @param clientId The client's unique identifier
 * @param initialValue Optional initial value (defaults to 0)
 * @returns A new vector clock
 */
export const initializeVectorClock = (
  clientId: string,
  initialValue: number = 0,
): VectorClock => {
  return { [clientId]: initialValue };
};

/**
 * Check if a vector clock is empty or uninitialized
 * @param clock The vector clock to check
 * @returns True if the clock is null, undefined, or has no entries
 */
export const isVectorClockEmpty = (clock: VectorClock | null | undefined): boolean => {
  return !clock || Object.keys(clock).length === 0;
};

/**
 * Compare two vector clocks to determine their relationship
 *
 * @param a First vector clock
 * @param b Second vector clock
 * @returns The comparison result
 */
export const compareVectorClocks = (
  a: VectorClock | null | undefined,
  b: VectorClock | null | undefined,
): VectorClockComparison => {
  // Handle null/undefined cases
  if (isVectorClockEmpty(a) && isVectorClockEmpty(b)) {
    return VectorClockComparison.EQUAL;
  }
  if (isVectorClockEmpty(a)) {
    return VectorClockComparison.LESS_THAN;
  }
  if (isVectorClockEmpty(b)) {
    return VectorClockComparison.GREATER_THAN;
  }

  // Safe type assertion after null checks
  const clockA = a!;
  const clockB = b!;

  // Get all client IDs from both clocks
  const allClientIds = new Set([...Object.keys(clockA), ...Object.keys(clockB)]);

  let aHasGreater = false;
  let bHasGreater = false;

  // Compare each component
  for (const clientId of allClientIds) {
    const aVal = clockA[clientId] || 0;
    const bVal = clockB[clientId] || 0;

    if (aVal > bVal) {
      aHasGreater = true;
    }
    if (bVal > aVal) {
      bHasGreater = true;
    }
  }

  // Determine relationship
  if (!aHasGreater && !bHasGreater) {
    return VectorClockComparison.EQUAL;
  } else if (!aHasGreater) {
    // B has some greater components, A has none -> A < B
    return VectorClockComparison.LESS_THAN;
  } else if (!bHasGreater) {
    // A has some greater components, B has none -> A > B
    return VectorClockComparison.GREATER_THAN;
  } else {
    // Both have some greater components -> concurrent
    return VectorClockComparison.CONCURRENT;
  }
};

/**
 * Increment a client's component in the vector clock
 * Creates a new vector clock with the incremented value
 *
 * @param clock The current vector clock
 * @param clientId The client ID to increment
 * @returns A new vector clock with the incremented value
 */
export const incrementVectorClock = (
  clock: VectorClock | null | undefined,
  clientId: string,
): VectorClock => {
  const newClock = { ...(clock || {}) };
  const currentValue = newClock[clientId] || 0;

  // Handle overflow - reset to 1 if approaching max safe integer
  if (currentValue >= Number.MAX_SAFE_INTEGER - 1000) {
    pfLog(1, 'Vector clock component overflow protection triggered', {
      clientId,
      currentValue,
    });
    newClock[clientId] = 1;
  } else {
    newClock[clientId] = currentValue + 1;
  }

  return newClock;
};

/**
 * Merge two vector clocks by taking the maximum value for each component
 * This is used when receiving updates to ensure we have the most recent view
 *
 * @param a First vector clock
 * @param b Second vector clock
 * @returns A new merged vector clock
 */
export const mergeVectorClocks = (
  a: VectorClock | null | undefined,
  b: VectorClock | null | undefined,
): VectorClock => {
  if (isVectorClockEmpty(a)) return { ...(b || {}) };
  if (isVectorClockEmpty(b)) return { ...(a || {}) };

  const merged: VectorClock = {};
  const allClientIds = new Set([...Object.keys(a!), ...Object.keys(b!)]);

  for (const clientId of allClientIds) {
    const aVal = a![clientId] || 0;
    const bVal = b![clientId] || 0;
    merged[clientId] = Math.max(aVal, bVal);
  }

  return merged;
};

/**
 * Convert a Lamport timestamp to a vector clock
 * Used for backwards compatibility during migration
 *
 * @param lamport The Lamport timestamp value
 * @param clientId The client ID to use
 * @returns A vector clock with a single component
 */
export const lamportToVectorClock = (
  lamport: number | null | undefined,
  clientId: string,
): VectorClock => {
  if (lamport == null || lamport === 0) {
    return {};
  }
  return { [clientId]: lamport };
};

/**
 * Get a human-readable string representation of a vector clock
 * Useful for debugging and logging
 *
 * @param clock The vector clock
 * @returns A string representation
 */
export const vectorClockToString = (clock: VectorClock | null | undefined): string => {
  if (isVectorClockEmpty(clock)) {
    return '{}';
  }

  const entries = Object.entries(clock!)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, val]) => `${id}:${val}`);

  return `{${entries.join(', ')}}`;
};

/**
 * Check if a vector clock has changes compared to a reference clock
 * Used to determine if local changes exist
 *
 * @param current The current vector clock
 * @param reference The reference vector clock (e.g., last synced)
 * @returns True if current has any components greater than reference
 */
export const hasVectorClockChanges = (
  current: VectorClock | null | undefined,
  reference: VectorClock | null | undefined,
): boolean => {
  if (isVectorClockEmpty(current)) {
    return false;
  }
  if (isVectorClockEmpty(reference)) {
    return !isVectorClockEmpty(current);
  }

  // Check if any component in current is greater than in reference
  for (const [clientId, currentVal] of Object.entries(current!)) {
    const refVal = reference![clientId] || 0;
    if (currentVal > refVal) {
      return true;
    }
  }

  return false;
};
