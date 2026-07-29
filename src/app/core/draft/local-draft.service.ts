import { inject, Injectable } from '@angular/core';
import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { Log } from '../log';
import { UserProfileService } from '../../features/user-profile/user-profile.service';
import { UserProfileStorageService } from '../../features/user-profile/user-profile-storage.service';
import { DEFAULT_PROFILE_ID } from '../../features/user-profile/user-profile.model';
import { isConnectionClosingError } from '../../op-log/persistence/op-log-errors.const';

export type LocalDraftEntityType = 'NOTE';

/**
 * How a draft's text stopped being unsaved work: the user saved it, or threw it
 * away in the editor's discard confirmation.
 */
export type LocalDraftResolutionKind = 'SAVED' | 'DISCARDED';

export interface LocalDraft {
  key: string;
  entityType: LocalDraftEntityType;
  entityId: string;
  profileId: string;
  content: string;
  /**
   * The persisted entity content at the time the edit session started. Lets
   * callers detect whether the entity changed (e.g. through sync) since the
   * draft was created.
   */
  baseContent: string;
  /**
   * Present once the draft's text stopped being unsaved work. `content` records
   * WHICH text was resolved, so the marker only ever applies to the exact text
   * it was written for: a later checkpoint replaces the whole record (marker
   * included), and a marker left over from an older edit session simply stops
   * matching instead of silently suppressing newer text.
   *
   * This exists so the lifecycle never has to DELETE a draft to keep a stale one
   * from arming a spurious conflict prompt. A write can be wrong; it cannot
   * destroy text, which is what every previous round of this feature kept having
   * to prove it would not do.
   */
  resolved?: {
    content: string;
    kind: LocalDraftResolutionKind;
  };
  updatedAt: number;
}

/**
 * True once the marker applies to the text actually stored, i.e. the record can
 * no longer be recovered onto its entity and only suppresses a stale conflict
 * prompt. A marker left behind by an older edit session whose text was since
 * replaced does NOT count — that record is live.
 */
export const isDraftResolved = (draft: LocalDraft): boolean =>
  draft.resolved?.content === draft.content;

/** What an existing draft means for the entity it belongs to. */
export type DraftOpenAction = 'IGNORE' | 'RESTORE' | 'PROMPT';

/**
 * Decides what to do with an existing draft when its entity is opened, given the
 * entity's current (optimistic) content.
 *
 * The ORDER of these branches is the whole design, and it rests on ONE
 * invariant: a marker is only written once the save behind it is durable
 * (isDispatchDurable gates the write side; see markSaved).
 *
 * Without that, one record would have to serve two histories needing opposite
 * answers: a save that never became durable while the entity moved elsewhere
 * (the draft is the only surviving copy — must PROMPT), and a durable save the
 * entity was later edited back away from (historical — must not be restored
 * over that later edit). Gating the marker separates them, because only the
 * second history can carry one. Every path fails toward an extra prompt rather
 * than toward suppressing text.
 */
export const getDraftOpenAction = (
  draft: LocalDraft,
  entityContent: string,
): DraftOpenAction => {
  // The entity already holds the draft text: there is nothing left to recover.
  if (draft.content === entityContent) {
    return 'IGNORE';
  }
  // This text stopped being unsaved work, so the record is inert whatever the
  // entity now holds — and either kind of marker MUST outrank the crash-recovery
  // branch below. DISCARDED: a discard leaves the entity at `baseContent` by
  // definition, so restoring would hand back the exact text the user threw away.
  // SAVED: durability is proven before marking, so an entity at `baseContent`
  // means a later edit put it back there, and restoring would revert that edit.
  if (isDraftResolved(draft)) {
    return 'IGNORE';
  }
  // Unmarked text, and the entity is exactly where this edit session started:
  // the edit never landed. Crash recovery.
  if (draft.baseContent === entityContent) {
    return 'RESTORE';
  }
  // Unsaved text, and the entity changed underneath it. Only the user can say
  // which one wins.
  return 'PROMPT';
};

/**
 * Distinguishes a failed draft read from "no draft exists" so callers can
 * avoid destructive actions (overwrite/clear) on a draft they could not read.
 */
export const DRAFT_LOAD_ERROR = Symbol('DRAFT_LOAD_ERROR');

const DB_NAME = 'sp-local-drafts';
const DB_STORE_NAME = 'drafts';
const DB_VERSION = 1;

// Reclaim policy for abandoned drafts, mirroring the conflict journal's
// retention (JOURNAL_RETENTION_DAYS / JOURNAL_MAX_ENTRIES in
// op-log/sync/conflict-journal.model.ts). A draft is device-local transient
// state: once its entity is gone or the edit is long abandoned there is nothing
// left to recover, so it should not accumulate forever. Kept as local consts
// (not imported from the sync module) to avoid a core -> sync layering edge.
const DRAFT_RETENTION_DAYS = 14;
const DRAFT_RETENTION_MS = DRAFT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const DRAFT_MAX_ENTRIES = 200;

/**
 * How far past {@link DRAFT_MAX_ENTRIES} a profile may grow before a save
 * prunes it back, mirroring JOURNAL_PRUNE_SLACK. count() is cheap; the O(n)
 * prune it gates is not, so it runs amortized once every DRAFT_PRUNE_SLACK
 * saves rather than on every checkpoint.
 */
export const DRAFT_PRUNE_SLACK = 20;

interface DraftsDb extends DBSchema {
  [DB_STORE_NAME]: {
    key: string;
    value: LocalDraft;
  };
}

/**
 * Device-local, profile-aware draft storage for crash-safe editing (e.g. the
 * fullscreen note editor). Drafts live in their own tiny IndexedDB, are keyed
 * by profile + entity type + entity id and are never synced. All methods fail
 * gracefully — a broken IndexedDB must never break editing itself.
 */
@Injectable({ providedIn: 'root' })
export class LocalDraftService {
  private readonly _userProfileService = inject(UserProfileService);
  private readonly _userProfileStorageService = inject(UserProfileStorageService);
  private _db: IDBPDatabase<DraftsDb> | undefined;
  private _initPromise: Promise<IDBPDatabase<DraftsDb>> | undefined;
  private _persistedProfileIdPromise: Promise<string> | undefined;
  private _prunePromise: Promise<void> | undefined;

  async saveDraft({
    entityType,
    entityId,
    content,
    baseContent,
  }: {
    entityType: LocalDraftEntityType;
    entityId: string;
    content: string;
    baseContent: string;
  }): Promise<void> {
    try {
      const profileId = await this._activeProfileId();
      const profileCount = await this._withRetryOnClose(async (db) => {
        await db.put(DB_STORE_NAME, {
          key: this._key(profileId, entityType, entityId),
          entityType,
          entityId,
          profileId,
          content,
          baseContent,
          updatedAt: Date.now(),
        });
        // Counts THIS PROFILE only, because that is what the sweep enforces.
        // ConflictJournalService.record() counts its whole store, but the
        // journal's cap is global; ours is per profile (see _pruneStaleDrafts).
        // A global count here would sit permanently above the threshold once two
        // profiles each hold a normal number of drafts, and every checkpoint
        // would then fire a full sweep that deletes nothing.
        return db.count(DB_STORE_NAME, this._profileKeyRange(profileId));
      });
      // Retention used to be reachable only from app start and the open path, so
      // a session that kept editing without opening a note grew unbounded.
      // count() is cheap; the O(n) sweep it gates runs amortized once every
      // DRAFT_PRUNE_SLACK saves. Fire-and-forget: a checkpoint must never wait
      // on (or fail with) a sweep.
      if (profileCount > DRAFT_MAX_ENTRIES + DRAFT_PRUNE_SLACK) {
        void this._pruneStaleDraftsOnce();
      }
    } catch (e) {
      Log.err('LocalDraftService: Failed to save draft', e);
    }
  }

  async loadDraft(
    entityType: LocalDraftEntityType,
    entityId: string,
  ): Promise<LocalDraft | undefined | typeof DRAFT_LOAD_ERROR> {
    // Reclaim long-abandoned drafts lazily on the open path (fire-and-forget,
    // coalesced with any in-flight sweep) so they do not accumulate forever.
    // Age/cap only —
    // it cannot know whether an entity still exists. It never blocks or fails
    // this load; it runs in its own transactions, so a draft sitting exactly on
    // the retention boundary may or may not still be here by the get() below —
    // either outcome is fine for a draft that old.
    void this._pruneStaleDraftsOnce();
    try {
      const profileId = await this._activeProfileId();
      return await this._withRetryOnClose((db) =>
        db.get(DB_STORE_NAME, this._key(profileId, entityType, entityId)),
      );
    } catch (e) {
      Log.err('LocalDraftService: Failed to load draft', e);
      return DRAFT_LOAD_ERROR;
    }
  }

  async clearDraft(entityType: LocalDraftEntityType, entityId: string): Promise<void> {
    try {
      const profileId = await this._activeProfileId();
      await this._withRetryOnClose((db) =>
        db.delete(DB_STORE_NAME, this._key(profileId, entityType, entityId)),
      );
    } catch (e) {
      Log.err('LocalDraftService: Failed to clear draft', e);
    }
  }

  /**
   * Records that `savedContent` was handed to the entity, so a later open does
   * not offer it back as unsaved work. Scoped to that exact text: if a newer
   * edit session checkpointed different content into the same key, this is a
   * no-op and that newer text stays live.
   *
   * CALLERS MUST PROVE DURABILITY FIRST (isDispatchDurable). The marker is what
   * lets getDraftOpenAction() treat a record as inert, so writing one for a save
   * that never became durable suppresses the only remaining copy of the text.
   * When durability cannot be proven, leave the draft unresolved: the cost is an
   * extra recovery prompt, not lost work.
   */
  async markSaved(
    entityType: LocalDraftEntityType,
    entityId: string,
    savedContent: string,
  ): Promise<void> {
    await this._markResolved(entityType, entityId, (existing) =>
      existing.content === savedContent
        ? { content: savedContent, kind: 'SAVED' }
        : undefined,
    );
  }

  /**
   * Records that the user threw this entity's draft away in the editor's discard
   * confirmation.
   *
   * Unlike markSaved() this is NOT scoped to a specific text, because the exact
   * bytes at the moment of the click are not knowable: checkpoints are debounced,
   * so the stored copy can lag the editor by up to that debounce. A confirmed
   * discard is an explicit instruction about this entity's draft as a whole. It
   * still only writes — the text stays in the record, it is merely no longer
   * offered for recovery.
   */
  async markDiscarded(entityType: LocalDraftEntityType, entityId: string): Promise<void> {
    await this._markResolved(entityType, entityId, (existing) => ({
      content: existing.content,
      kind: 'DISCARDED',
    }));
  }

  /**
   * Read-modify-write of the resolution marker alone, in one transaction.
   *
   * `content` is written back exactly as read, so this can never overwrite a
   * concurrent checkpoint with older text (IndexedDB serializes the two
   * read-write transactions either way round). `updatedAt` is deliberately NOT
   * bumped: a resolved draft should keep ageing out on the normal retention
   * clock rather than being kept alive by being resolved.
   *
   * The get and the put are sequential by nature here (the put depends on what
   * was read), unlike the prune path which can issue its deletes up front.
   */
  private async _markResolved(
    entityType: LocalDraftEntityType,
    entityId: string,
    toMarker: (existing: LocalDraft) => LocalDraft['resolved'],
  ): Promise<void> {
    try {
      const profileId = await this._activeProfileId();
      const key = this._key(profileId, entityType, entityId);
      await this._withRetryOnClose(async (db) => {
        const tx = db.transaction(DB_STORE_NAME, 'readwrite');
        const existing = await tx.store.get(key);
        const resolved = existing && toMarker(existing);
        if (existing && resolved) {
          await tx.store.put({ ...existing, resolved });
        }
        await tx.done;
      });
    } catch (e) {
      Log.err('LocalDraftService: Failed to mark draft resolved', e);
    }
  }

  /**
   * Deletes every draft belonging to a profile. Called from the profile-deletion
   * lifecycle (UserProfileService.deleteProfile) so a deleted profile does not
   * leave its (never-synced) draft contents behind. Drafts of other profiles are
   * untouched — keys are `${profileId}:${entityType}:${entityId}` and the profile
   * id cannot contain a `:` separator, so the prefix match is unambiguous.
   */
  async deleteDraftsForProfile(profileId: string): Promise<void> {
    try {
      await this._withRetryOnClose(async (db) => {
        const prefix = `${profileId}:`;
        const keys = await db.getAllKeys(DB_STORE_NAME);
        await Promise.all(
          keys
            .filter((key) => key.startsWith(prefix))
            .map((key) => db.delete(DB_STORE_NAME, key)),
        );
      });
    } catch (e) {
      Log.err('LocalDraftService: Failed to delete drafts for profile', e);
    }
  }

  /**
   * Deletes the active profile's drafts. Called where that profile's dataset is
   * replaced wholesale (JSON import, SuperSync "Use Server Data"): every draft's
   * baseContent then refers to note content that no longer exists, so keeping
   * them would only offer stale, misleading recovery.
   *
   * Deliberately called from those two call sites rather than from
   * BackupService.importCompleteBackup, where the conflict journal clears: a
   * profile SWITCH also funnels through that method, and unlike the (profile-
   * agnostic) journal, drafts are profile-keyed — profile A's drafts still refer
   * to profile A's notes, which a switch only unloads, never replaces. Clearing
   * there would silently destroy the recovery draft this feature exists for.
   */
  async deleteDraftsForActiveProfile(): Promise<void> {
    try {
      await this.deleteDraftsForProfile(await this._activeProfileId());
    } catch (e) {
      Log.err('LocalDraftService: Failed to delete drafts for the active profile', e);
    }
  }

  /**
   * Prunes stale drafts on app start, mirroring ConflictJournalService.pruneOnStart
   * (wired via APP_INITIALIZER in main.ts). Without this, prune only ever ran
   * lazily off loadDraft(), so a user who stopped opening notes never pruned
   * again and their drafts — full note content — could outlive the documented
   * 14-day retention indefinitely. Shares the in-flight guard, so it coalesces
   * with a sweep already running; later opens and saves in the same session
   * deliberately sweep again. Fire-and-forget and best-effort: it opens its own
   * IndexedDB lazily and swallows its own errors, so it can never block or fail
   * bootstrap.
   */
  pruneOnStart(): Promise<void> {
    return this._pruneStaleDraftsOnce();
  }

  /**
   * Prunes drafts by `updatedAt`: drops anything older than the retention window
   * and, if still over the entry cap, the oldest remaining entries. Concurrent
   * callers share one sweep (`_prunePromise`); sequential ones each get their
   * own. Best-effort — a failure is logged and swallowed so it can never break
   * the load or save that triggered it.
   */
  private _pruneStaleDraftsOnce(): Promise<void> {
    if (!this._prunePromise) {
      this._prunePromise = this._pruneStaleDrafts()
        .catch((e) => {
          Log.err('LocalDraftService: Failed to prune stale drafts', e);
        })
        // In-flight guard, NOT once-per-session: clearing it on settle keeps
        // concurrent callers sharing one sweep while leaving retention reachable
        // for the rest of the session. Cached forever, the startup initializer
        // consumed the only sweep a long-lived (Electron) session would ever get,
        // and everything created afterwards outlived both the retention window
        // and the entry cap until restart.
        .finally(() => {
          this._prunePromise = undefined;
        });
    }
    return this._prunePromise;
  }

  /**
   * `now` is a parameter (rather than read inside) so the policy stays
   * deterministic under test, mirroring ConflictJournalService.pruneOnStart.
   */
  private async _pruneStaleDrafts(now: number = Date.now()): Promise<void> {
    await this._withRetryOnClose(async (db) => {
      // Select and delete inside ONE read-write transaction so a concurrent
      // save/checkpoint cannot refresh a key between the snapshot and its
      // deletion: the getAll() snapshot and the deletes are consistent, and any
      // interleaving write is serialized either fully before (seen here, and if
      // fresh it survives) or fully after this transaction (#8982 review).
      const tx = db.transaction(DB_STORE_NAME, 'readwrite');
      const all = await tx.store.getAll();
      const cutoff = now - DRAFT_RETENTION_MS;
      // Age applies to every draft equally, resolved or not: a resolution marker
      // does not bump updatedAt, so markers age out on the same 14-day clock as
      // the drafts they sit on and cannot accumulate past it.
      const expiredKeys = all.filter((d) => d.updatedAt < cutoff).map((d) => d.key);
      // The entry cap is PER PROFILE. A global cap let one profile's drafts evict
      // another profile's only unsaved recovery copy, which is exactly the data
      // this feature exists to protect (#8982 review).
      const survivorsByProfile = new Map<string, LocalDraft[]>();
      for (const draft of all) {
        if (draft.updatedAt < cutoff) {
          continue;
        }
        const forProfile = survivorsByProfile.get(draft.profileId);
        if (forProfile) {
          forProfile.push(draft);
        } else {
          survivorsByProfile.set(draft.profileId, [draft]);
        }
      }
      const overflowKeys = [...survivorsByProfile.values()].flatMap((drafts) =>
        drafts
          // Resolved drafts go first when a profile is over its cap: their text
          // is already saved or discarded, so all they still carry is
          // conflict-prompt suppression. Losing that costs at most one extra
          // prompt; dropping a live draft instead would cost unsaved text.
          .sort(
            (a, b) =>
              Number(isDraftResolved(a)) - Number(isDraftResolved(b)) ||
              b.updatedAt - a.updatedAt,
          )
          .slice(DRAFT_MAX_ENTRIES)
          .map((d) => d.key),
      );
      // Issue every delete request up front and await them together with tx.done
      // (idb's canonical multi-write pattern) rather than awaiting each delete in
      // turn: an await BETWEEN requests can let the transaction go inactive on
      // WebKit/iOS, which this DB is already known to be touchy about (#6643).
      await Promise.all([
        ...[...expiredKeys, ...overflowKeys].map((key) => tx.store.delete(key)),
        tx.done,
      ]);
    });
  }

  private async _activeProfileId(): Promise<string> {
    const active = this._userProfileService.activeProfile()?.id;
    if (active) {
      return active;
    }
    // The profile feature can be disabled, in which case UserProfileService is
    // never initialized and its in-memory signal stays null — but the last
    // active profile id is still persisted (localStorage). Fall back to it so
    // drafts stay keyed to the profile whose data is actually loaded, instead
    // of a wrong DEFAULT_PROFILE_ID. The persisted id is stable for the session
    // (switching profiles reloads the app), so it is read at most once.
    if (!this._persistedProfileIdPromise) {
      // loadProfileMetadata() catches internally and resolves to null on any
      // failure (never rejects), and null falls through to DEFAULT_PROFILE_ID
      // here — so no .catch is needed on this chain.
      this._persistedProfileIdPromise = this._userProfileStorageService
        .loadProfileMetadata()
        .then((meta) => meta?.activeProfileId || DEFAULT_PROFILE_ID);
    }
    return this._persistedProfileIdPromise;
  }

  /**
   * Runs a draft DB operation, recovering once from an iOS/WebKit "connection
   * is closing" error (#6643): the OS can silently close the IndexedDB
   * connection when the app backgrounds, leaving the cached handle stale so
   * every later op fails for the rest of the session. Mirrors
   * ArchiveStoreService._withRetryOnClose — invalidate the cached handle and
   * retry once against a fresh connection.
   */
  private async _withRetryOnClose<T>(
    fn: (db: IDBPDatabase<DraftsDb>) => Promise<T>,
  ): Promise<T> {
    // _ensureDb() must be inside the try so a "connection is closing" error
    // thrown while (re)opening the DB is caught and retried too, not just one
    // thrown by fn(). Mirrors ArchiveStoreService._withRetryOnClose.
    try {
      return await fn(await this._ensureDb());
    } catch (e) {
      if (isConnectionClosingError(e)) {
        Log.warn('LocalDraftService: Connection closing error detected, re-opening', e);
        this._db = undefined;
        this._initPromise = undefined;
        return await fn(await this._ensureDb());
      }
      throw e;
    }
  }

  private _key(
    profileId: string,
    entityType: LocalDraftEntityType,
    entityId: string,
  ): string {
    return `${profileId}:${entityType}:${entityId}`;
  }

  /**
   * Every key of one profile. Keys are `${profileId}:${entityType}:${entityId}`
   * and a profile id cannot contain the `:` separator, so the prefix range is
   * exact. `￿` is above every character that can follow the separator.
   */
  private _profileKeyRange(profileId: string): IDBKeyRange {
    return IDBKeyRange.bound(`${profileId}:`, `${profileId}:￿`);
  }

  private async _ensureDb(): Promise<IDBPDatabase<DraftsDb>> {
    if (this._db) {
      return this._db;
    }
    if (!this._initPromise) {
      this._initPromise = openDB<DraftsDb>(DB_NAME, DB_VERSION, {
        upgrade: (database) => {
          if (!database.objectStoreNames.contains(DB_STORE_NAME)) {
            database.createObjectStore(DB_STORE_NAME, { keyPath: 'key' });
          }
        },
        // The browser can terminate the connection at any time (e.g. storage
        // pressure); reset so the next operation re-opens it.
        terminated: () => {
          this._db = undefined;
          this._initPromise = undefined;
        },
      }).then(
        (opened) => {
          // A newer tab is upgrading this DB (future schema bump). Close now so
          // this connection does not block the upgrade; the next op reopens
          // transparently via _ensureDb(). (The `close`/`terminated` case above
          // already resets the cached handle.)
          opened.addEventListener('versionchange', () => {
            opened.close();
            this._db = undefined;
            this._initPromise = undefined;
          });
          this._db = opened;
          return opened;
        },
        (e) => {
          // Don't cache the failure — the next operation should retry. Failures
          // stay console-only by design: a snackbar for every debounced draft
          // write would be noisier than the (device-local) draft loss.
          this._initPromise = undefined;
          throw e;
        },
      );
    }
    return this._initPromise;
  }
}
