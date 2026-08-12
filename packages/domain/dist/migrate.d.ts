import type { DomainState } from './entities';
export declare const migrateLegacyBackupToNoura: (input: unknown, now?: number) => DomainState;
/**
 * Migrates a persisted Noura DomainState (schemaVersion 1) to the current
 * schema (version 2): adds the new collections, moves `sessions` into
 * `trackedEntries`, upgrades TrackedEntry fields, and backfills config.
 * Unknown documents are rejected; anything recognizing as an object with tasks
 * and projects is normalized so stale stores remain loadable.
 */
export declare const migrateDomainState: (input: unknown) => DomainState;
/** Tries a legacy backup first, then migrates an existing Noura state. */
export declare const importAnyState: (input: unknown) => DomainState;
