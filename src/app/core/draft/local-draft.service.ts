import { inject, Injectable } from '@angular/core';
import { Log } from '../log';
import { LS_LOCAL_DRAFT_PREFIX } from '../persistence/storage-keys.const';
import { UserProfileService } from '../../features/user-profile/user-profile.service';
import { UserProfileStorageService } from '../../features/user-profile/user-profile-storage.service';
import { DEFAULT_PROFILE_ID } from '../../features/user-profile/user-profile.model';

export type LocalDraftEntityType = 'NOTE';

export interface LocalDraft {
  content: string;
  /**
   * The persisted entity content at the time the edit session started. Lets
   * callers detect whether the entity changed (e.g. through sync) since the
   * draft was created.
   */
  baseContent: string;
  updatedAt: number;
}

/** What an existing draft means for the entity it belongs to. */
export type DraftOpenAction = 'IGNORE' | 'RESTORE' | 'PROMPT';

/**
 * Decides what to do with an existing draft when its entity is opened.
 */
export const getDraftOpenAction = (
  draft: LocalDraft,
  entityContent: string,
): DraftOpenAction => {
  // The entity already holds the draft text: there is nothing left to recover.
  if (draft.content === entityContent) {
    return 'IGNORE';
  }
  // The entity is exactly where this edit session started: the edit never
  // landed. Crash recovery.
  if (draft.baseContent === entityContent) {
    return 'RESTORE';
  }
  // Unsaved text, and the entity changed underneath it (e.g. through sync).
  // Only the user can say which one wins.
  return 'PROMPT';
};

const DRAFT_RETENTION_DAYS = 14;
export const DRAFT_RETENTION_MS = DRAFT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Drafts whose content + baseContent exceed this are not checkpointed.
 * localStorage's quota (~5 MB) is shared with everything else the app keeps
 * there (profile metadata, UI state), so one huge note must not be able to fill
 * it and break those writes. A note this large simply goes without
 * crash-safety; editing itself is unaffected.
 */
export const DRAFT_MAX_CONTENT_LENGTH = 500_000;

const isStoredDraft = (v: unknown): v is LocalDraft =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as LocalDraft).content === 'string' &&
  typeof (v as LocalDraft).baseContent === 'string' &&
  typeof (v as LocalDraft).updatedAt === 'number';

/**
 * Device-local, profile-aware draft storage for crash-safe editing (e.g. the
 * fullscreen note editor). Drafts live in localStorage, keyed by profile +
 * entity type + entity id, and are never synced or included in backups.
 *
 * localStorage is deliberate: it is synchronous, so writes, reads and deletes
 * happen in program order with nothing in flight — no stale connection, no
 * hung request, no delete racing a debounced write. The entire lifecycle
 * reduces to "write while editing, remove in the handler that consumed the
 * draft". All methods fail gracefully; broken storage must never break editing.
 */
@Injectable({ providedIn: 'root' })
export class LocalDraftService {
  private readonly _userProfileService = inject(UserProfileService);
  private readonly _userProfileStorageService = inject(UserProfileStorageService);

  saveDraft({
    entityType,
    entityId,
    content,
    baseContent,
  }: {
    entityType: LocalDraftEntityType;
    entityId: string;
    content: string;
    baseContent: string;
  }): void {
    try {
      const key = this._key(this._activeProfileId(), entityType, entityId);
      if (content.length + baseContent.length > DRAFT_MAX_CONTENT_LENGTH) {
        // Also drop a smaller draft stored earlier in the session: once
        // checkpointing stops, keeping it would offer long-outdated text on
        // the next open.
        localStorage.removeItem(key);
        return;
      }
      const draft: LocalDraft = { content, baseContent, updatedAt: Date.now() };
      localStorage.setItem(key, JSON.stringify(draft));
    } catch (e) {
      // Quota exceeded is the realistic failure. A draft is best-effort, so
      // editing goes on without crash-safety rather than surfacing an error.
      Log.err('LocalDraftService: Failed to save draft', e);
    }
  }

  loadDraft(entityType: LocalDraftEntityType, entityId: string): LocalDraft | undefined {
    try {
      const raw = localStorage.getItem(
        this._key(this._activeProfileId(), entityType, entityId),
      );
      if (!raw) {
        return undefined;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Deliberately logged WITHOUT the error: V8 SyntaxErrors quote the
        // raw input, which is user content and must never reach the
        // exportable log. The startup sweep removes such entries; the next
        // checkpoint overwrites them.
        Log.err('LocalDraftService: Draft unparseable');
        return undefined;
      }
      return isStoredDraft(parsed) ? parsed : undefined;
    } catch (e) {
      // Unreadable storage: nothing can be offered back.
      Log.err('LocalDraftService: Failed to load draft', e);
      return undefined;
    }
  }

  clearDraft(entityType: LocalDraftEntityType, entityId: string): void {
    try {
      localStorage.removeItem(this._key(this._activeProfileId(), entityType, entityId));
    } catch (e) {
      Log.err('LocalDraftService: Failed to clear draft', e);
    }
  }

  /**
   * Deletes every draft belonging to a profile. Called from the profile
   * deletion lifecycle so a deleted profile does not leave its (never-synced)
   * draft contents behind. Keys are `<prefix><profileId>:<type>:<id>` and a
   * profile id cannot contain the `:` separator, so the prefix match is
   * unambiguous.
   */
  deleteDraftsForProfile(profileId: string): void {
    try {
      const prefix = `${LS_LOCAL_DRAFT_PREFIX}${profileId}:`;
      this._draftKeys()
        .filter((key) => key.startsWith(prefix))
        .forEach((key) => localStorage.removeItem(key));
    } catch (e) {
      Log.err('LocalDraftService: Failed to delete drafts for profile', e);
    }
  }

  /**
   * Deletes the active profile's drafts. Called where that profile's dataset
   * is replaced wholesale (JSON import, SuperSync "Use Server Data"): every
   * draft's baseContent then refers to note content that no longer exists, so
   * keeping them would only offer stale, misleading recovery.
   */
  deleteDraftsForActiveProfile(): void {
    this.deleteDraftsForProfile(this._activeProfileId());
  }

  /**
   * Removes drafts past the retention window (and unparseable leftovers) on
   * app start, wired via APP_INITIALIZER in main.ts. Drafts are normally
   * removed by the handler that consumed them; only crash leftovers whose note
   * is never reopened reach this sweep, so age is the only policy needed.
   */
  pruneOnStart(now: number = Date.now()): void {
    try {
      const cutoff = now - DRAFT_RETENTION_MS;
      for (const key of this._draftKeys()) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(localStorage.getItem(key) ?? '');
        } catch (e) {
          parsed = undefined;
        }
        if (!isStoredDraft(parsed) || parsed.updatedAt < cutoff) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      Log.err('LocalDraftService: Failed to prune stale drafts', e);
    }
  }

  private _activeProfileId(): string {
    const active = this._userProfileService.activeProfile()?.id;
    if (active) {
      return active;
    }
    // The profile feature can be disabled, in which case UserProfileService is
    // never initialized and its in-memory signal stays null — but the last
    // active profile id is still persisted. Fall back to it so drafts stay
    // keyed to the profile whose data is actually loaded.
    return (
      this._userProfileStorageService.loadProfileMetadataSync()?.activeProfileId ||
      DEFAULT_PROFILE_ID
    );
  }

  private _key(
    profileId: string,
    entityType: LocalDraftEntityType,
    entityId: string,
  ): string {
    return `${LS_LOCAL_DRAFT_PREFIX}${profileId}:${entityType}:${entityId}`;
  }

  private _draftKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LS_LOCAL_DRAFT_PREFIX)) {
        keys.push(key);
      }
    }
    return keys;
  }
}
