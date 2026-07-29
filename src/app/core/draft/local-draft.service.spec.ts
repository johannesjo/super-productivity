import { TestBed } from '@angular/core/testing';
import {
  DRAFT_LOAD_ERROR,
  DRAFT_MAX_ENTRIES,
  DRAFT_PRUNE_SLACK,
  getDraftOpenAction,
  isDraftResolved,
  LocalDraft,
  LocalDraftService,
} from './local-draft.service';
import { UserProfileService } from '../../features/user-profile/user-profile.service';
import { UserProfileStorageService } from '../../features/user-profile/user-profile-storage.service';
import { DEFAULT_PROFILE_ID } from '../../features/user-profile/user-profile.model';

describe('LocalDraftService', () => {
  let service: LocalDraftService;
  let activeProfileId: string | null;
  let persistedActiveProfileId: string | null;

  const uniqueId = (): string =>
    `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Unwraps the load-error sentinel so tests can dereference draft fields.
  const loadDraft = async (entityId: string): Promise<LocalDraft | undefined> => {
    const res = await service.loadDraft('NOTE', entityId);
    expect(res).not.toBe(DRAFT_LOAD_ERROR);
    return res === DRAFT_LOAD_ERROR ? undefined : res;
  };

  beforeEach(() => {
    activeProfileId = null;
    persistedActiveProfileId = null;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UserProfileService,
          useValue: {
            activeProfile: () => (activeProfileId ? { id: activeProfileId } : null),
          },
        },
        {
          provide: UserProfileStorageService,
          useValue: {
            loadProfileMetadata: () =>
              Promise.resolve(
                persistedActiveProfileId
                  ? { activeProfileId: persistedActiveProfileId }
                  : null,
              ),
          },
        },
      ],
    });
    service = TestBed.inject(LocalDraftService);
  });

  // Every test here shares ONE real IndexedDB, and this repo runs specs in a
  // random order — so anything left behind leaks into whichever test happens to
  // run next (most visibly the entry-cap tests, which count records). Wipe the
  // store between tests instead of relying on each one to tidy up after itself.
  afterEach(async () => {
    try {
      await (service as any)._withRetryOnClose((db: any) => db.clear('drafts'));
    } catch {
      // A test that deliberately broke IndexedDB has nothing to clean up.
    }
  });

  it('should save and load a draft preserving content and baseContent', async () => {
    const entityId = uniqueId();
    await service.saveDraft({
      entityType: 'NOTE',
      entityId,
      content: 'draft content',
      baseContent: 'base content',
    });

    const draft = await loadDraft(entityId);

    expect(draft?.content).toBe('draft content');
    expect(draft?.baseContent).toBe('base content');
    expect(draft?.entityType).toBe('NOTE');
    expect(draft?.entityId).toBe(entityId);
    await service.clearDraft('NOTE', entityId);
  });

  it('should return undefined when no draft exists', async () => {
    expect(await service.loadDraft('NOTE', uniqueId())).toBeUndefined();
  });

  it('should overwrite an existing draft on save', async () => {
    const entityId = uniqueId();
    await service.saveDraft({
      entityType: 'NOTE',
      entityId,
      content: 'first',
      baseContent: 'base',
    });
    await service.saveDraft({
      entityType: 'NOTE',
      entityId,
      content: 'second',
      baseContent: 'base',
    });

    const draft = await loadDraft(entityId);

    expect(draft?.content).toBe('second');
    await service.clearDraft('NOTE', entityId);
  });

  it('should clear a draft', async () => {
    const entityId = uniqueId();
    await service.saveDraft({
      entityType: 'NOTE',
      entityId,
      content: 'draft content',
      baseContent: 'base content',
    });

    await service.clearDraft('NOTE', entityId);

    expect(await service.loadDraft('NOTE', entityId)).toBeUndefined();
  });

  it('should key drafts by the active profile', async () => {
    const entityId = uniqueId();
    activeProfileId = 'profile-a';
    await service.saveDraft({
      entityType: 'NOTE',
      entityId,
      content: 'profile a draft',
      baseContent: 'base',
    });

    activeProfileId = 'profile-b';
    expect(await service.loadDraft('NOTE', entityId)).toBeUndefined();

    activeProfileId = 'profile-a';
    const draft = await loadDraft(entityId);
    expect(draft?.content).toBe('profile a draft');
    expect(draft?.profileId).toBe('profile-a');
    await service.clearDraft('NOTE', entityId);
  });

  it('should fall back to the default profile id when no profile is active', async () => {
    const entityId = uniqueId();
    await service.saveDraft({
      entityType: 'NOTE',
      entityId,
      content: 'draft content',
      baseContent: 'base content',
    });

    const draft = await loadDraft(entityId);

    expect(draft?.profileId).toBe(DEFAULT_PROFILE_ID);
    await service.clearDraft('NOTE', entityId);
  });

  it('should fail gracefully on a broken IndexedDB and retry once it recovers', async () => {
    const entityId = uniqueId();
    const openSpy = spyOn(indexedDB, 'open').and.throwError('IDB is broken');

    expect(await service.loadDraft('NOTE', entityId)).toBe(DRAFT_LOAD_ERROR);
    await expectAsync(
      service.saveDraft({
        entityType: 'NOTE',
        entityId,
        content: 'c',
        baseContent: 'b',
      }),
    ).toBeResolved();
    await expectAsync(service.clearDraft('NOTE', entityId)).toBeResolved();

    // Once IndexedDB works again the next operation retries instead of
    // reusing the cached failure.
    openSpy.and.callThrough();
    await service.saveDraft({
      entityType: 'NOTE',
      entityId,
      content: 'recovered',
      baseContent: 'base',
    });
    const draft = await loadDraft(entityId);
    expect(draft?.content).toBe('recovered');
    await service.clearDraft('NOTE', entityId);
  });

  it('should key drafts to the persisted active profile when no profile is active in memory (feature disabled)', async () => {
    // Feature disabled: activeProfile() is null, but the last active profile id
    // is persisted. Drafts must key to it, not to DEFAULT_PROFILE_ID.
    const entityId = uniqueId();
    activeProfileId = null;
    persistedActiveProfileId = 'persisted-profile';

    await service.saveDraft({
      entityType: 'NOTE',
      entityId,
      content: 'draft content',
      baseContent: 'base content',
    });

    const draft = await loadDraft(entityId);
    expect(draft?.profileId).toBe('persisted-profile');
    expect(draft?.content).toBe('draft content');
    await service.clearDraft('NOTE', entityId);
  });

  it('should delete all drafts for a profile while preserving other profiles drafts', async () => {
    const idA = uniqueId();
    const idB = uniqueId();

    activeProfileId = 'profile-a';
    await service.saveDraft({
      entityType: 'NOTE',
      entityId: idA,
      content: 'a1',
      baseContent: 'base',
    });
    await service.saveDraft({
      entityType: 'NOTE',
      entityId: idB,
      content: 'a2',
      baseContent: 'base',
    });

    activeProfileId = 'profile-b';
    await service.saveDraft({
      entityType: 'NOTE',
      entityId: idA,
      content: 'b1',
      baseContent: 'base',
    });

    await service.deleteDraftsForProfile('profile-a');

    // profile-a drafts are gone
    activeProfileId = 'profile-a';
    expect(await service.loadDraft('NOTE', idA)).toBeUndefined();
    expect(await service.loadDraft('NOTE', idB)).toBeUndefined();

    // profile-b draft survives
    activeProfileId = 'profile-b';
    const survivor = await loadDraft(idA);
    expect(survivor?.content).toBe('b1');
    await service.clearDraft('NOTE', idA);
  });

  it('should delete only the active profiles drafts on deleteDraftsForActiveProfile', async () => {
    const idA = uniqueId();
    const idB = uniqueId();

    activeProfileId = 'profile-a';
    await service.saveDraft({
      entityType: 'NOTE',
      entityId: idA,
      content: 'a',
      baseContent: 'base',
    });
    activeProfileId = 'profile-b';
    await service.saveDraft({
      entityType: 'NOTE',
      entityId: idB,
      content: 'b',
      baseContent: 'base',
    });

    // Only profile-b's dataset was replaced (import/restore runs against the
    // active profile), so profile-a's drafts must survive.
    await service.deleteDraftsForActiveProfile();

    activeProfileId = 'profile-b';
    expect(await service.loadDraft('NOTE', idB)).toBeUndefined();
    activeProfileId = 'profile-a';
    const survivor = await loadDraft(idA);
    expect(survivor?.content).toBe('a');
    await service.clearDraft('NOTE', idA);
  });

  it('should prune drafts past the retention window on open, keeping fresh ones', async () => {
    activeProfileId = 'profile-a';
    const freshId = uniqueId();
    const staleId = uniqueId();

    // Fresh draft via the normal path (updatedAt = now).
    await service.saveDraft({
      entityType: 'NOTE',
      entityId: freshId,
      content: 'fresh',
      baseContent: 'base',
    });

    // Stale draft written directly with an updatedAt older than the 14-day
    // retention window (saveDraft always stamps now, so it cannot create one).
    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
    await (service as any)._withRetryOnClose((db: any) =>
      db.put('drafts', {
        key: `profile-a:NOTE:${staleId}`,
        entityType: 'NOTE',
        entityId: staleId,
        profileId: 'profile-a',
        content: 'stale',
        baseContent: 'base',
        updatedAt: Date.now() - fifteenDaysMs,
      }),
    );

    // Trigger the once-per-session prune and let it finish (loadDraft fires it
    // fire-and-forget; here we await it deterministically).
    await (service as any)._pruneStaleDraftsOnce();

    expect(await service.loadDraft('NOTE', staleId)).toBeUndefined();
    const survivor = await loadDraft(freshId);
    expect(survivor?.content).toBe('fresh');
    await service.clearDraft('NOTE', freshId);
  });

  it('coalesces concurrent prune requests into one sweep', async () => {
    activeProfileId = 'profile-a';
    const pruneSpy = spyOn(service as any, '_pruneStaleDrafts').and.callThrough();

    // Overlapping callers (app start, an open, a save crossing the soft cap)
    // share the in-flight sweep rather than each running their own O(n) pass.
    // Note these are NOT awaited in turn — sequential calls deliberately DO
    // sweep again, which is what keeps retention reachable all session.
    await Promise.all([
      (service as any)._pruneStaleDraftsOnce(),
      (service as any)._pruneStaleDraftsOnce(),
    ]);

    expect(pruneSpy).toHaveBeenCalledTimes(1);
  });

  it('should prune the oldest drafts beyond the 200-entry cap', async () => {
    activeProfileId = 'profile-a';
    // Write 201 fresh drafts (all inside the retention window) with strictly
    // increasing updatedAt so "oldest" is well-defined. saveDraft always stamps
    // now(), so write directly to control the age.
    const base = Date.now();
    const ids = Array.from({ length: 201 }, () => uniqueId());
    await (service as any)._withRetryOnClose(async (db: any) => {
      for (let i = 0; i < ids.length; i++) {
        await db.put('drafts', {
          key: `profile-a:NOTE:${ids[i]}`,
          entityType: 'NOTE',
          entityId: ids[i],
          profileId: 'profile-a',
          content: `c${i}`,
          baseContent: 'base',
          updatedAt: base + i,
        });
      }
    });

    await (service as any)._pruneStaleDraftsOnce();

    // The single oldest survivor is evicted to hold the cap; the newest stays.
    // Delete the DRAFT_MAX_ENTRIES overflow slice and all 201 remain -> red.
    expect(await service.loadDraft('NOTE', ids[0])).toBeUndefined();
    const newest = await loadDraft(ids[ids.length - 1]);
    expect(newest?.content).toBe('c200');

    await (service as any)._withRetryOnClose(async (db: any) => {
      for (const id of ids) {
        await db.delete('drafts', `profile-a:NOTE:${id}`);
      }
    });
  });

  it('should run the prune when triggered through the public loadDraft() (not just the private method)', async () => {
    activeProfileId = 'profile-a';
    const staleId = uniqueId();
    const otherId = uniqueId();
    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
    await (service as any)._withRetryOnClose((db: any) =>
      db.put('drafts', {
        key: `profile-a:NOTE:${staleId}`,
        entityType: 'NOTE',
        entityId: staleId,
        profileId: 'profile-a',
        content: 'stale',
        baseContent: 'base',
        updatedAt: Date.now() - fifteenDaysMs,
      }),
    );

    // Public API only: loadDraft fires the once-per-session prune fire-and-forget.
    // Remove the `void this._pruneStaleDraftsOnce()` wiring line from loadDraft
    // and _prunePromise stays undefined, the stale draft survives -> red.
    await service.loadDraft('NOTE', otherId);
    await (service as any)._prunePromise;

    expect(await service.loadDraft('NOTE', staleId)).toBeUndefined();
  });

  it('should prune on app start via the public pruneOnStart()', async () => {
    activeProfileId = 'profile-a';
    const staleId = uniqueId();
    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
    await (service as any)._withRetryOnClose((db: any) =>
      db.put('drafts', {
        key: `profile-a:NOTE:${staleId}`,
        entityType: 'NOTE',
        entityId: staleId,
        profileId: 'profile-a',
        content: 'stale',
        baseContent: 'base',
        updatedAt: Date.now() - fifteenDaysMs,
      }),
    );

    await service.pruneOnStart();

    expect(await service.loadDraft('NOTE', staleId)).toBeUndefined();
  });

  it('should retry once and succeed when the connection closes mid-operation (iOS #6643)', async () => {
    // Seed a draft, then simulate the iOS "connection is closing" DOMException
    // on the first read; the retry-once wrapper must re-open and succeed.
    const entityId = uniqueId();
    activeProfileId = 'profile-a';
    await service.saveDraft({
      entityType: 'NOTE',
      entityId,
      content: 'survives',
      baseContent: 'base',
    });

    const closingError = new DOMException(
      "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.",
      'InvalidStateError',
    );
    // Fail the first get on the cached connection. The wrapper invalidates the
    // handle and re-opens a fresh connection (a new db instance, so this spy no
    // longer applies), whose real get returns the still-persisted draft. A
    // successful, correct result therefore can only happen via the retry — the
    // outer catch would otherwise surface DRAFT_LOAD_ERROR.
    const db = await (service as any)._ensureDb();
    const getSpy = spyOn(db, 'get').and.returnValue(Promise.reject(closingError));

    // loadDraft() already asserts the result is not DRAFT_LOAD_ERROR — reaching a
    // correct value proves the retry recovered rather than surfacing the error.
    const draft = await loadDraft(entityId);
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(draft?.content).toBe('survives');
    await service.clearDraft('NOTE', entityId);
  });

  describe('resolution markers (non-destructive retirement)', () => {
    const seed = async (id: string, content: string): Promise<void> => {
      activeProfileId = 'profile-a';
      await service.saveDraft({
        entityType: 'NOTE',
        entityId: id,
        content,
        baseContent: 'base',
      });
    };

    it('markSaved records the text without removing it', async () => {
      const id = uniqueId();
      await seed(id, 'v1');

      await service.markSaved('NOTE', id, 'v1');

      // The whole point of the rework: retiring a draft is a WRITE. The text is
      // still there to recover from if the save turns out not to have landed.
      const draft = await loadDraft(id);
      expect(draft?.content).toBe('v1');
      expect(draft?.resolved).toEqual({ content: 'v1', kind: 'SAVED' });
    });

    it("markSaved leaves a newer session's checkpoint unmarked", async () => {
      const id = uniqueId();
      // Session B checkpointed Y under the shared key while an older lifecycle A
      // still believes it owns X. A's marker must not claim Y as saved, or Y
      // stops being offered for recovery.
      await seed(id, 'Y-newer');

      await service.markSaved('NOTE', id, 'X-older');

      const draft = await loadDraft(id);
      expect(draft?.content).toBe('Y-newer');
      expect(draft?.resolved).toBeUndefined();
    });

    it('markDiscarded retires whatever text is stored, still without deleting it', async () => {
      const id = uniqueId();
      await seed(id, 'typed then thrown away');

      await service.markDiscarded('NOTE', id);

      const draft = await loadDraft(id);
      expect(draft?.content).toBe('typed then thrown away');
      expect(draft?.resolved).toEqual({
        content: 'typed then thrown away',
        kind: 'DISCARDED',
      });
    });

    it('a later checkpoint clears the marker, so typing again revives the draft', async () => {
      const id = uniqueId();
      await seed(id, 'v1');
      await service.markSaved('NOTE', id, 'v1');

      await seed(id, 'v2 typed after saving');

      // saveDraft puts a whole fresh record; if it ever preserved `resolved` the
      // new text would be born already suppressed and silently unrecoverable.
      const draft = await loadDraft(id);
      expect(draft?.resolved).toBeUndefined();
      expect(getDraftOpenAction(draft!, 'base')).toBe('RESTORE');
    });

    it('markSaved does not extend the draft retention window', async () => {
      activeProfileId = 'profile-a';
      const id = uniqueId();
      // Seed with an updatedAt well in the past. Seeding via saveDraft() would
      // stamp now(), and a re-stamp on marking lands in the SAME millisecond —
      // so the assertion below would hold either way and test nothing.
      const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
      const tenDaysAgo = Date.now() - tenDaysMs;
      await (service as any)._withRetryOnClose((db: any) =>
        db.put('drafts', {
          key: `profile-a:NOTE:${id}`,
          entityType: 'NOTE',
          entityId: id,
          profileId: 'profile-a',
          content: 'v1',
          baseContent: 'base',
          updatedAt: tenDaysAgo,
        }),
      );

      await service.markSaved('NOTE', id, 'v1');

      // Bumping updatedAt here would let a resolved draft keep itself alive past
      // the documented 14 days just by being resolved.
      expect((await loadDraft(id))!.updatedAt).toBe(tenDaysAgo);
      expect((await loadDraft(id))!.resolved).toEqual({ content: 'v1', kind: 'SAVED' });
    });

    it('are safe no-ops when the draft is already gone', async () => {
      activeProfileId = 'profile-a';
      await expectAsync(service.markSaved('NOTE', uniqueId(), 'x')).toBeResolved();
      await expectAsync(service.markDiscarded('NOTE', uniqueId())).toBeResolved();
      // Nothing was created just to hold a marker.
      expect(await service.loadDraft('NOTE', uniqueId())).toBeUndefined();
    });
  });

  it('holds the entry cap PER PROFILE, not globally', async () => {
    // A global cap let a busy profile evict another profile's only unsaved
    // recovery copy — the exact data this feature exists to protect (#8982
    // review). Fill profile-a past the cap and check profile-b's single draft.
    const base = Date.now();
    const victimId = uniqueId();
    const busyIds = Array.from({ length: 201 }, () => uniqueId());
    await (service as any)._withRetryOnClose(async (db: any) => {
      // profile-b's draft is the OLDEST record in the store, so a global cap
      // sorted by updatedAt evicts precisely this one.
      await db.put('drafts', {
        key: `profile-b:NOTE:${victimId}`,
        entityType: 'NOTE',
        entityId: victimId,
        profileId: 'profile-b',
        content: 'the only unsaved copy profile-b has',
        baseContent: 'base',
        updatedAt: base,
      });
      for (let i = 0; i < busyIds.length; i++) {
        await db.put('drafts', {
          key: `profile-a:NOTE:${busyIds[i]}`,
          entityType: 'NOTE',
          entityId: busyIds[i],
          profileId: 'profile-a',
          content: `c${i}`,
          baseContent: 'base',
          updatedAt: base + 1 + i,
        });
      }
    });

    await (service as any)._pruneStaleDraftsOnce();

    // Make the cap global again (drop the per-profile grouping) and profile-b's
    // draft is the one that gets evicted -> red.
    activeProfileId = 'profile-b';
    expect((await loadDraft(victimId))?.content).toBe(
      'the only unsaved copy profile-b has',
    );
    // profile-a is still capped: its own oldest entry went.
    activeProfileId = 'profile-a';
    expect(await service.loadDraft('NOTE', busyIds[0])).toBeUndefined();
  });

  it('evicts resolved drafts before live ones when a profile is over the cap', async () => {
    // Over the cap, something must go. A resolved draft only carries
    // conflict-prompt suppression; a live one carries unsaved text. Make the
    // resolved record the NEWEST so an updatedAt-only sort would keep it and
    // evict the live one instead.
    const base = Date.now();
    const liveId = uniqueId();
    const resolvedId = uniqueId();
    const fillerIds = Array.from({ length: 199 }, () => uniqueId());
    await (service as any)._withRetryOnClose(async (db: any) => {
      await db.put('drafts', {
        key: `profile-a:NOTE:${liveId}`,
        entityType: 'NOTE',
        entityId: liveId,
        profileId: 'profile-a',
        content: 'unsaved text',
        baseContent: 'base',
        updatedAt: base,
      });
      for (let i = 0; i < fillerIds.length; i++) {
        await db.put('drafts', {
          key: `profile-a:NOTE:${fillerIds[i]}`,
          entityType: 'NOTE',
          entityId: fillerIds[i],
          profileId: 'profile-a',
          content: `c${i}`,
          baseContent: 'base',
          updatedAt: base + 1 + i,
        });
      }
      await db.put('drafts', {
        key: `profile-a:NOTE:${resolvedId}`,
        entityType: 'NOTE',
        entityId: resolvedId,
        profileId: 'profile-a',
        content: 'already saved',
        baseContent: 'base',
        resolved: { content: 'already saved', kind: 'SAVED' },
        updatedAt: base + 1000,
      });
    });

    await (service as any)._pruneStaleDraftsOnce();

    activeProfileId = 'profile-a';
    // Sort by updatedAt alone (drop the isDraftResolved tiebreak) and this flips:
    // the live draft is evicted and the inert one kept -> red.
    expect((await loadDraft(liveId))?.content).toBe('unsaved text');
    expect(await service.loadDraft('NOTE', resolvedId)).toBeUndefined();
  });

  it('ages resolved drafts out on the normal retention clock', async () => {
    activeProfileId = 'profile-a';
    const id = uniqueId();
    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
    await (service as any)._withRetryOnClose((db: any) =>
      db.put('drafts', {
        key: `profile-a:NOTE:${id}`,
        entityType: 'NOTE',
        entityId: id,
        profileId: 'profile-a',
        content: 'saved long ago',
        baseContent: 'base',
        resolved: { content: 'saved long ago', kind: 'SAVED' },
        updatedAt: Date.now() - fifteenDaysMs,
      }),
    );

    await (service as any)._pruneStaleDraftsOnce();

    // Markers must not become a way for records to outlive the documented 14-day
    // retention: exempt resolved drafts from the age sweep and this goes red.
    expect(await service.loadDraft('NOTE', id)).toBeUndefined();
  });

  it('prunes again later in the same session (the guard is in-flight only)', async () => {
    activeProfileId = 'profile-a';
    // One prune has already run this session (app start, or the first note
    // opened). Everything created afterwards used to be unreachable by the
    // retention policy for the rest of the process lifetime.
    await (service as any)._pruneStaleDraftsOnce();

    const id = uniqueId();
    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
    await (service as any)._withRetryOnClose((db: any) =>
      db.put('drafts', {
        key: `profile-a:NOTE:${id}`,
        entityType: 'NOTE',
        entityId: id,
        profileId: 'profile-a',
        content: 'note text past retention',
        baseContent: 'base',
        updatedAt: Date.now() - fifteenDaysMs,
      }),
    );

    await (service as any)._pruneStaleDraftsOnce();

    // Read the store directly: loadDraft() fires its own (fire-and-forget)
    // prune, which could make this pass by luck rather than by the guard.
    const survivor = await (service as any)._withRetryOnClose((db: any) =>
      db.get('drafts', `profile-a:NOTE:${id}`),
    );
    // Cache the settled promise once per session (rather than clearing it when
    // the prune finishes) and this draft — full note content, well past the
    // documented 14-day retention — survives until the app restarts -> red.
    expect(survivor).toBeUndefined();
  });

  it('does not sweep on a save that is well under the soft cap', async () => {
    activeProfileId = 'profile-a';
    const pruneSpy = spyOn(service as any, '_pruneStaleDrafts').and.callThrough();

    for (let i = 0; i < 5; i++) {
      await service.saveDraft({
        entityType: 'NOTE',
        entityId: uniqueId(),
        content: `c${i}`,
        baseContent: 'base',
      });
    }
    // Give any fire-and-forget sweep a chance to start before asserting absence.
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 0));
    }

    // The soft cap is the entire point of the counter: sweep unconditionally
    // (`if (true)`, or drop DRAFT_PRUNE_SLACK) and every checkpoint pays for a
    // full O(n) pass over the store -> red.
    expect(pruneSpy).not.toHaveBeenCalled();
  });

  it('does not sweep because OTHER profiles pushed the store over the cap', async () => {
    // The cap _pruneStaleDrafts enforces is PER PROFILE, so the trigger has to
    // count per profile too. Counting the whole store instead sits permanently
    // above the threshold once two profiles each hold a normal number of
    // drafts, turning "amortized every DRAFT_PRUNE_SLACK saves" into "a full
    // sweep on every keystroke checkpoint" -> red.
    activeProfileId = 'profile-b';
    await (service as any)._withRetryOnClose(async (db: any) => {
      for (let i = 0; i < DRAFT_MAX_ENTRIES + DRAFT_PRUNE_SLACK + 1; i++) {
        const id = uniqueId();
        await db.put('drafts', {
          key: `profile-b:NOTE:${id}`,
          entityType: 'NOTE',
          entityId: id,
          profileId: 'profile-b',
          content: `b${i}`,
          baseContent: 'base',
          updatedAt: Date.now(),
        });
      }
    });

    activeProfileId = 'profile-a';
    const pruneSpy = spyOn(service as any, '_pruneStaleDrafts').and.callThrough();
    await service.saveDraft({
      entityType: 'NOTE',
      entityId: uniqueId(),
      content: 'the only draft profile-a has',
      baseContent: 'base',
    });
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 0));
    }

    expect(pruneSpy).not.toHaveBeenCalled();
  });

  it('prunes off the save path once a profile crosses the soft cap', async () => {
    activeProfileId = 'profile-a';
    const expiredId = uniqueId();
    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
    await (service as any)._withRetryOnClose((db: any) =>
      db.put('drafts', {
        key: `profile-a:NOTE:${expiredId}`,
        entityType: 'NOTE',
        entityId: expiredId,
        profileId: 'profile-a',
        content: 'note text past retention',
        baseContent: 'base',
        updatedAt: Date.now() - fifteenDaysMs,
      }),
    );

    // A long-lived session (Electron) that keeps editing: checkpoints alone must
    // bring retention back around, without a load or a restart to trigger it.
    for (let i = 0; i < DRAFT_MAX_ENTRIES + DRAFT_PRUNE_SLACK + 1; i++) {
      await service.saveDraft({
        entityType: 'NOTE',
        entityId: uniqueId(),
        content: `c${i}`,
        baseContent: 'base',
      });
    }

    // The sweep is fire-and-forget (a checkpoint must not wait on it), so poll
    // rather than reading once. Deliberately does NOT call the prune itself:
    // triggering it here would pass even with nothing on the save path. Reads
    // the store directly for the same reason — loadDraft() fires its own prune.
    for (let i = 0; i < 200; i++) {
      const survivor = await (service as any)._withRetryOnClose((db: any) =>
        db.get('drafts', `profile-a:NOTE:${expiredId}`),
      );
      if (survivor === undefined) {
        return;
      }
      await new Promise((r) => setTimeout(r, 0));
    }

    // Leave the save path free of any retention trigger and the store grows
    // unbounded for the whole session, keeping expired note text with it -> red.
    fail('the expired draft was never pruned off the save path');
  });

  describe('getDraftOpenAction (the read-time decision tree)', () => {
    const draft = (over: Partial<LocalDraft> = {}): LocalDraft => ({
      key: 'p:NOTE:n1',
      entityType: 'NOTE',
      entityId: 'n1',
      profileId: 'p',
      content: 'DRAFT',
      baseContent: 'BASE',
      updatedAt: 1,
      ...over,
    });

    it('ignores a draft the entity already contains', () => {
      expect(getDraftOpenAction(draft(), 'DRAFT')).toBe('IGNORE');
    });

    it('restores a draft whose edit never landed (entity still at baseContent)', () => {
      expect(getDraftOpenAction(draft(), 'BASE')).toBe('RESTORE');
    });

    it('prompts when the text is unsaved and the entity moved on', () => {
      expect(getDraftOpenAction(draft(), 'REMOTE')).toBe('PROMPT');
    });

    it('ignores a SAVED draft once the entity has moved on (the spurious prompt)', () => {
      // This is the ONLY thing the old destructive clear bought, and the marker
      // buys it without deleting. Drop the SAVED branch and this prompts the user
      // about an edit they already saved -> red.
      const d = draft({ resolved: { content: 'DRAFT', kind: 'SAVED' } });
      expect(getDraftOpenAction(d, 'REMOTE')).toBe('IGNORE');
    });

    it('ignores a durably SAVED draft when the entity was later edited back to baseContent', () => {
      // A SAVED marker now means the operation behind the save was durably
      // acknowledged (isDispatchDurable gates the write side), so an entity
      // sitting at baseContent means a LATER intentional edit put it back there
      // — not that the save was lost. Rank the baseContent branch above SAVED
      // and the next open hands back the superseded text, which Escape or a
      // navigation then saves over that later edit -> red.
      const d = draft({ resolved: { content: 'DRAFT', kind: 'SAVED' } });
      expect(getDraftOpenAction(d, 'BASE')).toBe('IGNORE');
    });

    it('separates the two histories only the durability marker can tell apart', () => {
      // The same stored text, the same entity contents, opposite answers — the
      // marker is the only thing distinguishing them, which is why it may not be
      // written for a save that was deferred or failed.
      const unmarked = draft(); // dispatch never became durable
      const durable = draft({ resolved: { content: 'DRAFT', kind: 'SAVED' } });

      // Entity moved on: the unmarked copy is the only one left -> ask.
      expect(getDraftOpenAction(unmarked, 'REMOTE')).toBe('PROMPT');
      expect(getDraftOpenAction(durable, 'REMOTE')).toBe('IGNORE');
      // Entity back at base: crash recovery vs. a later edit that must not be
      // reverted. Move the baseContent branch above the marker and the second
      // assertion flips to RESTORE -> red.
      expect(getDraftOpenAction(unmarked, 'BASE')).toBe('RESTORE');
      expect(getDraftOpenAction(durable, 'BASE')).toBe('IGNORE');
    });

    it('never resurrects a DISCARDED draft, not even from its own baseContent', () => {
      // A discard leaves the entity at baseContent by definition, so DISCARDED
      // must outrank the RESTORE branch. Move it below and the next open hands
      // back the exact text the user threw away -> red.
      const d = draft({ resolved: { content: 'DRAFT', kind: 'DISCARDED' } });
      expect(getDraftOpenAction(d, 'BASE')).toBe('IGNORE');
      expect(getDraftOpenAction(d, 'REMOTE')).toBe('IGNORE');
    });

    it('ignores a marker left over from an older edit session', () => {
      // The marker names the text it applies to. Newer text under the same key is
      // live work, so a stale marker must not suppress it. Compare only the kind
      // (not resolved.content === content) and this stops prompting about real
      // unsaved text -> red.
      const d = draft({
        content: 'NEWER',
        resolved: { content: 'OLDER', kind: 'SAVED' },
      });
      expect(getDraftOpenAction(d, 'REMOTE')).toBe('PROMPT');
      expect(isDraftResolved(d)).toBe(false);
    });
  });

  it('does not prune a stale draft that is concurrently refreshed (atomic select+delete)', async () => {
    activeProfileId = 'profile-a';
    const staleId = uniqueId();
    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
    // Seed a draft old enough to be pruned.
    await (service as any)._withRetryOnClose((db: any) =>
      db.put('drafts', {
        key: `profile-a:NOTE:${staleId}`,
        entityType: 'NOTE',
        entityId: staleId,
        profileId: 'profile-a',
        content: 'stale',
        baseContent: 'base',
        updatedAt: Date.now() - fifteenDaysMs,
      }),
    );

    // Fire the prune and a concurrent refresh of the SAME key. The prune's single
    // read-write transaction serializes against the save: the save lands either
    // fully before the prune (fresh in the snapshot -> survives) or fully after
    // it (re-created fresh). Either way the refreshed draft must survive. The old
    // getAll-then-separate-delete code could delete the refreshed key.
    await Promise.all([
      (service as any)._pruneStaleDrafts(),
      service.saveDraft({
        entityType: 'NOTE',
        entityId: staleId,
        content: 'refreshed',
        baseContent: 'base',
      }),
    ]);

    const survivor = await loadDraft(staleId);
    expect(survivor?.content).toBe('refreshed');
    await service.clearDraft('NOTE', staleId);
  });
});
