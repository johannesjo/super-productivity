import { PersistentAction } from '../persistent-action.interface';

/**
 * Generates a unique capture ID for correlating meta-reducer and effect.
 * Uses action type + entity info + hash for uniqueness.
 *
 * @param action The persistent action to generate an ID for
 * @returns A unique string ID for this specific action instance
 */
export const generateCaptureId = (action: PersistentAction): string => {
  const entityKey = action.meta.entityId || action.meta.entityIds?.join(',') || 'no-id';
  const actionHash = simpleHash(JSON.stringify(action));
  return `${action.type}:${entityKey}:${actionHash}`;
};

/**
 * Simple hash function for generating unique IDs.
 * Produces a base-36 encoded 32-bit hash.
 *
 * @param str The string to hash
 * @returns A base-36 encoded hash string
 */
export const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};
