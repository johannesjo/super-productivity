import { TestBed } from '@angular/core/testing';
import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { EMPTY, of, Subject } from 'rxjs';
import { NoteComponent } from './note.component';
import { Note } from '../note.model';
import { NoteService } from '../note.service';
import { ProjectService } from '../../project/project.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { ClipboardImageService } from '../../../core/clipboard-image/clipboard-image.service';
import {
  DRAFT_LOAD_ERROR,
  LocalDraft,
  LocalDraftService,
} from '../../../core/draft/local-draft.service';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { DialogFullscreenMarkdownComponent } from '../../../ui/dialog-fullscreen-markdown/dialog-fullscreen-markdown.component';
import { OperationWriteFlushService } from '../../../op-log/sync/operation-write-flush.service';
import { OperationCaptureService } from '../../../op-log/capture/operation-capture.service';

describe('NoteComponent editFullscreen', () => {
  let component: NoteComponent;
  let matDialog: jasmine.SpyObj<MatDialog>;
  let noteService: jasmine.SpyObj<NoteService>;
  let localDraftService: jasmine.SpyObj<LocalDraftService>;
  let contentChanged$: Subject<string>;
  let afterClosed$: Subject<unknown>;
  let confirmResult: boolean | undefined;
  // Whether the operation behind the note update is treated as durably written.
  let isDurable: boolean;
  // Set once the durability gate has actually been entered, so tests asserting
  // that nothing was retired can anchor on a point INSIDE the gate rather than
  // on a guessed number of queue turns.
  let didFlush: boolean;

  const NOTE: Note = {
    id: 'note-1',
    content: 'saved content',
  } as Note;

  const draftOf = (content: string, baseContent: string): LocalDraft => ({
    key: `k:NOTE:${NOTE.id}`,
    entityType: 'NOTE',
    entityId: NOTE.id,
    profileId: 'p',
    content,
    baseContent,
    updatedAt: Date.now(),
  });

  const getFullscreenDialogData = (): any =>
    matDialog.open.calls
      .allArgs()
      .find((args) => args[0] === DialogFullscreenMarkdownComponent)?.[1]?.data;

  beforeEach(() => {
    contentChanged$ = new Subject<string>();
    afterClosed$ = new Subject<unknown>();
    confirmResult = undefined;

    matDialog = jasmine.createSpyObj('MatDialog', ['open']);
    matDialog.open.and.callFake((comp: any): any => {
      if (comp === DialogConfirmComponent) {
        return { afterClosed: () => of(confirmResult) };
      }
      return {
        componentInstance: { contentChanged: contentChanged$, close: () => {} },
        afterClosed: () => afterClosed$,
      };
    });

    isDurable = true;
    didFlush = false;
    noteService = jasmine.createSpyObj('NoteService', ['update', 'remove']);
    localDraftService = jasmine.createSpyObj('LocalDraftService', [
      'loadDraft',
      'saveDraft',
      'clearDraft',
      'markSaved',
      'markDiscarded',
    ]);
    localDraftService.loadDraft.and.resolveTo(undefined);
    localDraftService.saveDraft.and.resolveTo(undefined);
    localDraftService.clearDraft.and.resolveTo(undefined);
    localDraftService.markSaved.and.resolveTo(undefined);
    localDraftService.markDiscarded.and.resolveTo(undefined);

    const clipboardImageService = jasmine.createSpyObj('ClipboardImageService', [
      'resolveMarkdownImages',
    ]);
    clipboardImageService.resolveMarkdownImages.and.callFake((content: string) =>
      Promise.resolve(content),
    );

    TestBed.configureTestingModule({
      providers: [
        { provide: MatDialog, useValue: matDialog },
        { provide: Location, useValue: { subscribe: () => ({ unsubscribe: () => {} }) } },
        { provide: NoteService, useValue: noteService },
        {
          provide: ProjectService,
          useValue: { getProjectsWithoutIdInTreeOrder$: () => EMPTY },
        },
        { provide: WorkContextService, useValue: { activeWorkContextTypeAndId$: EMPTY } },
        { provide: ClipboardImageService, useValue: clipboardImageService },
        { provide: LocalDraftService, useValue: localDraftService },
        // A draft is only marked SAVED once the operation behind the note update
        // is durably acknowledged, so the save path needs both of these. They are
        // driven through the real getPhantomChangeRisk() rather than stubbed
        // wholesale: `isDurable = false` leaves a captured action pending, which
        // is exactly the deferred/failed state the marker must not paper over.
        {
          provide: OperationWriteFlushService,
          useValue: {
            flushThenRunExclusive: async <T>(fn: () => Promise<T>): Promise<T> => {
              didFlush = true;
              return fn();
            },
          },
        },
        {
          provide: OperationCaptureService,
          useValue: {
            getPendingCount: () => (isDurable ? 0 : 1),
            hasUnrecoveredPersistFailure: () => false,
          },
        },
      ],
    });

    runInInjectionContext(TestBed.inject(EnvironmentInjector), () => {
      component = new NoteComponent();
    });
    component.noteSet = NOTE;
  });

  const editFullscreen = (): Promise<void> => component.editFullscreen({} as MouseEvent);

  const turn = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

  // Waits for the close handler's async chain to reach the point the assertion
  // needs, rather than for a fixed number of turns through the queue. Counting
  // hops (`await Promise.resolve()` twice) or turns (one macrotask) both encode
  // the save path's current internal depth into unrelated tests: bounding the
  // drafts DB awaits in Promise.race added a link, and every hop-counting test
  // broke. One macrotask turn is not a guaranteed drain either — it failed
  // intermittently on `markSaved` (late in the chain) in full-suite runs while
  // the earlier `saveDraft`/`update` assertions passed. Waiting on the condition
  // is stable across any future change to the chain's depth.
  const waitFor = async (
    predicate: () => boolean,
    label: string,
    maxTurns = 200,
  ): Promise<void> => {
    for (let i = 0; i < maxTurns; i++) {
      if (predicate()) {
        return;
      }
      await turn();
    }
    throw new Error(`Timed out after ${maxTurns} turns waiting for ${label}`);
  };

  // For assertions that nothing happened, there is no condition to wait for, so
  // this drains several turns instead of one. More turns is strictly safer here:
  // it gives a violation more chances to show up before we assert its absence.
  const settle = async (turns = 5): Promise<void> => {
    for (let i = 0; i < turns; i++) {
      await turn();
    }
  };

  // Asserts on the WHOLE surface that can retire a draft, not just one method.
  // Three tests here used to spy on clearDraft alone while the paths under test
  // only ever called clearDraftIfContent, so they asserted nothing — johannesjo
  // proved it by inserting a call into the catch block and the suite stayed
  // green (#8982 review). A single helper means a new retirement path cannot be
  // added without every one of these tests seeing it.
  const expectNothingRetired = (): void => {
    expect(localDraftService.clearDraft).not.toHaveBeenCalled();
    expect(localDraftService.markSaved).not.toHaveBeenCalled();
    expect(localDraftService.markDiscarded).not.toHaveBeenCalled();
  };

  it('opens the note content and writes NOTHING when the draft matches the note', async () => {
    localDraftService.loadDraft.and.resolveTo(draftOf('saved content', 'anything'));

    await editFullscreen();

    // The open path is read-only now. It used to delete this draft (gated on a
    // durability proof) because the note already held its text; the read-time
    // decision tree reaches the same conclusion without touching the DB, so a
    // misjudged open can no longer destroy anything.
    expectNothingRetired();
    expect(localDraftService.saveDraft).not.toHaveBeenCalled();
    const data = getFullscreenDialogData();
    expect(data.content).toBe('saved content');
    expect(data.originalContent).toBeUndefined();
  });

  it('should seed the dialog with the draft content on crash recovery (baseContent matches note)', async () => {
    localDraftService.loadDraft.and.resolveTo(draftOf('draft content', 'saved content'));

    await editFullscreen();

    expectNothingRetired();
    const data = getFullscreenDialogData();
    expect(data.content).toBe('draft content');
    expect(data.originalContent).toBe('saved content');
  });

  it('does not hand back a durably SAVED draft after the note was edited back to its base', async () => {
    // A SAVED marker now means the operation behind that save was durably
    // acknowledged, so a note sitting at the draft's baseContent means a LATER
    // intentional edit put it back there. Offering the superseded text would let
    // Escape or a navigation save it straight over that later edit.
    localDraftService.loadDraft.and.resolveTo({
      ...draftOf('draft content', 'saved content'),
      resolved: { content: 'draft content', kind: 'SAVED' },
    });

    await editFullscreen();

    expect(getFullscreenDialogData().content).toBe('saved content');
    expect(getFullscreenDialogData().originalContent).toBeUndefined();
    expectNothingRetired();
  });

  it('leaves the draft unresolved when the note update is not durably persisted', async () => {
    // The write side's half of that contract: a dispatch that failed or was
    // deferred in a sync window must NOT be marked, or the read side would treat
    // the only recoverable copy of the text as already-saved and suppress it.
    isDurable = false;

    await editFullscreen();

    afterClosed$.next('final content');
    // Anchor INSIDE the gate: once the flush has run, only microtasks separate
    // us from a markSaved that must not happen. Waiting on the dispatch and a
    // single turn instead would assert the absence before the chain gets there.
    await waitFor(() => didFlush, 'the durability check');
    await settle();

    expect(noteService.update).toHaveBeenCalledWith(NOTE.id, {
      content: 'final content',
    });
    // Failing toward an extra prompt is the point — and nothing is retired by
    // any route, not just the one this branch happens to use today.
    expectNothingRetired();
  });

  it('should open the draft content when the user resolves a conflict with "review draft"', async () => {
    localDraftService.loadDraft.and.resolveTo(draftOf('draft content', 'other base'));
    confirmResult = true;

    await editFullscreen();

    expectNothingRetired();
    expect(getFullscreenDialogData().content).toBe('draft content');
  });

  it('marks the draft discarded (never deletes it) when the user resolves a conflict with "keep saved"', async () => {
    localDraftService.loadDraft.and.resolveTo(draftOf('draft content', 'other base'));
    confirmResult = false;

    await editFullscreen();

    // Scoped to the text the prompt actually showed, so a newer checkpoint that
    // landed under this key while the prompt was open is not what gets retired.
    expect(localDraftService.markDiscarded).toHaveBeenCalledWith(
      'NOTE',
      NOTE.id,
      'draft content',
    );
    // Choosing the saved version is the same instruction as Discard, and like
    // Discard it must not delete: the text stays in the DB, just unoffered.
    expect(localDraftService.clearDraft).not.toHaveBeenCalled();
    expect(getFullscreenDialogData().content).toBe('saved content');
  });

  it('should abort (not open the editor) and keep the draft when the conflict dialog is dismissed without a decision', async () => {
    localDraftService.loadDraft.and.resolveTo(draftOf('draft content', 'other base'));
    confirmResult = undefined; // ESC / backdrop / closeAll

    await editFullscreen();

    // Opening the editor here would let a checkpoint overwrite the still-
    // unresolved draft, so we abort until the user actually chooses.
    expectNothingRetired();
    expect(getFullscreenDialogData()).toBeUndefined();
  });

  it('should remove the note and clear the draft on a DELETE result', async () => {
    await editFullscreen();

    afterClosed$.next({ action: 'DELETE' });

    expect(noteService.remove).toHaveBeenCalledWith(NOTE);
    expect(localDraftService.clearDraft).toHaveBeenCalledWith('NOTE', NOTE.id);
  });

  it('should persist the draft BEFORE dispatching the note update on save (durability ordering)', async () => {
    const callOrder: string[] = [];
    // Push on RESOLUTION, not invocation: the guarantee is that saveDraft has
    // *resolved* before dispatch (the crash-safety window), not merely that it
    // was called first. A fake that pushes synchronously at call time stays green
    // even if the production `await` is deleted — the exact false-positive
    // johannesjo found by mutation-testing this spec (#8982 review).
    localDraftService.saveDraft.and.callFake(async () => {
      await Promise.resolve();
      callOrder.push('saveDraft');
    });
    noteService.update.and.callFake(() => {
      callOrder.push('update');
    });

    await editFullscreen();

    afterClosed$.next('final content');
    // The subscriber awaits saveDraft before dispatching, so wait for the
    // dispatch itself rather than for a guessed number of queue turns.
    await waitFor(() => noteService.update.calls.any(), 'the note update dispatch');

    // The draft (with the about-to-be-saved content, baseContent still the
    // current note) is written durably first; only then is the update dispatched
    // and (after the flush) the draft cleared.
    expect(localDraftService.saveDraft).toHaveBeenCalledWith({
      entityType: 'NOTE',
      entityId: NOTE.id,
      content: 'final content',
      baseContent: 'saved content',
    });
    expect(noteService.update).toHaveBeenCalledWith(NOTE.id, {
      content: 'final content',
    });
    // Ordering is the crash-safety guarantee: draft durable before dispatch.
    // Drop the production `await` and this flips to ['update', 'saveDraft'].
    expect(callOrder).toEqual(['saveDraft', 'update']);
  });

  it('marks the draft saved on the way out, and never deletes it', async () => {
    await editFullscreen();

    afterClosed$.next('final content');
    await waitFor(() => localDraftService.markSaved.calls.any(), 'the saved marker');

    expect(noteService.update).toHaveBeenCalledWith(NOTE.id, {
      content: 'final content',
    });
    // Scoped to the exact text handed to the note: a newer session that
    // checkpointed different content into the same key keeps its draft live.
    expect(localDraftService.markSaved).toHaveBeenCalledWith(
      'NOTE',
      NOTE.id,
      'final content',
    );
    expect(localDraftService.clearDraft).not.toHaveBeenCalled();
  });

  it('writes NO draft at all when a note is only viewed and closed', async () => {
    // No draft on open, nothing typed: there is no row to keep consistent, so the
    // close path must not create one. A row here would hold a full copy of the
    // note for the 14-day retention window, and while durability stays unproven
    // (markSaved skipped) a later remote edit would turn it into a spurious
    // "unsaved draft" prompt offering the note's own stale text (#8982 review).
    await editFullscreen();

    afterClosed$.next('saved content');
    await waitFor(() => localDraftService.markSaved.calls.any(), 'the saved marker');

    expect(localDraftService.saveDraft).not.toHaveBeenCalled();
    expect(localDraftService.clearDraft).not.toHaveBeenCalled();
  });

  it('leaves no live draft behind when a save lands back at the base content', async () => {
    // The bug: type, revert inside the 500ms debounce, then Save/Escape. The
    // close path emits no contentChanged, so without a checkpoint here the row
    // still holds the newer text, the scoped markSaved misses it, and the next
    // open silently RESTOREs it over the note (#8982 review).
    await editFullscreen();

    // The one checkpoint this session emitted, before the user undid it.
    contentChanged$.next('newer draft text');
    afterClosed$.next('saved content');
    await waitFor(() => localDraftService.markSaved.calls.any(), 'the saved marker');

    // Whatever the note was updated with must also be what the draft was last
    // checkpointed with, or markSaved's scope misses the row.
    const lastCheckpoint = localDraftService.saveDraft.calls.mostRecent().args[0];
    const markedText = localDraftService.markSaved.calls.mostRecent().args[2];
    expect(lastCheckpoint.content).toBe('saved content');
    expect(markedText).toBe('saved content');
    expect(lastCheckpoint.content).toBe(markedText);
    expect(noteService.update).toHaveBeenCalledWith(NOTE.id, {
      content: 'saved content',
    });
  });

  it('checkpoints a save back at base when a draft row already existed', async () => {
    // Same hole, reached the other way: the row came from an EARLIER session, so
    // nothing was typed this time. `hasDraftRow` starts true from the loaded
    // draft, so the checkpoint still runs and the marker still matches.
    localDraftService.loadDraft.and.resolveTo(
      draftOf('older session text', 'saved content'),
    );

    await editFullscreen();

    afterClosed$.next('saved content');
    await waitFor(() => localDraftService.markSaved.calls.any(), 'the saved marker');

    expect(localDraftService.saveDraft).toHaveBeenCalledWith({
      entityType: 'NOTE',
      entityId: NOTE.id,
      content: 'saved content',
      baseContent: NOTE.content,
    });
    expect(localDraftService.markSaved).toHaveBeenCalledWith(
      'NOTE',
      NOTE.id,
      'saved content',
    );
  });

  it('writes nothing when a note whose draft is already resolved is only viewed', async () => {
    // A resolved row is inert at read time, so an unmodified close must leave it
    // alone. Rewriting it would drop its marker, reset its 14-day retention, and
    // (whenever durability cannot be proven, so markSaved is skipped) leave it
    // LIVE for a later remote edit to turn into a spurious conflict prompt
    // offering the note's own stale text back (#8982 review).
    localDraftService.loadDraft.and.resolveTo({
      ...draftOf('saved content', 'older base'),
      resolved: { content: 'saved content', kind: 'SAVED' },
    });

    await editFullscreen();

    afterClosed$.next(NOTE.content);
    await waitFor(() => localDraftService.markSaved.calls.any(), 'the saved marker');

    expect(localDraftService.saveDraft).not.toHaveBeenCalled();
  });

  it('does not erase the marker written by the conflict prompt on an unmodified close', async () => {
    // "Keep saved" retires the row. The editor then opens on the note content
    // with nothing typed, so an unmodified close must not checkpoint over the
    // row: that would drop the marker the user's own answer just wrote and let
    // the dismissed conflict prompt come back (#8982 review).
    localDraftService.loadDraft.and.resolveTo(draftOf('draft content', 'other base'));
    confirmResult = false;

    await editFullscreen();

    afterClosed$.next(NOTE.content);
    await waitFor(() => localDraftService.markSaved.calls.any(), 'the saved marker');

    expect(localDraftService.markDiscarded).toHaveBeenCalledWith(
      'NOTE',
      NOTE.id,
      'draft content',
    );
    expect(localDraftService.saveDraft).not.toHaveBeenCalled();
  });

  it('marks the draft discarded (and deletes nothing) on a confirmed DISCARD', async () => {
    // The DISCARD branch had NO test at all — `grep -c DISCARD` on this spec
    // returned 0 — which is how its clear stayed ungated while its sibling was
    // gated (#8982 review). Both are markers now, so the asymmetry is gone by
    // construction, and this pins the branch down.
    await editFullscreen();

    // The dialog stamps its final editor content onto the DISCARD result.
    afterClosed$.next({ action: 'DISCARD', content: 'thrown away' });
    await waitFor(
      () => localDraftService.markDiscarded.calls.any(),
      'the discarded marker',
    );

    // No live row existed (loadDraft resolved undefined and nothing was typed),
    // so there is nothing to retire and no row is created just to hold a marker.
    expect(localDraftService.saveDraft).not.toHaveBeenCalled();
    expect(localDraftService.markDiscarded).toHaveBeenCalledWith(
      'NOTE',
      NOTE.id,
      'thrown away',
    );
    expect(localDraftService.clearDraft).not.toHaveBeenCalled();
    expect(noteService.update).not.toHaveBeenCalled();
    expect(noteService.remove).not.toHaveBeenCalled();
  });

  it('leaves no live draft behind when a discard lands back on the note content', async () => {
    // The undo-then-Discard hole, and the reason the checkpoint here cannot be
    // dropped. Discard is reachable with NO confirmation dialog:
    // _confirmDiscardIfNeeded closes instantly when the editor content equals
    // what it opened with. So typing, pausing past the debounce, undoing, then
    // hitting Discard closes with the ORIGINAL text while the stored row still
    // holds the typed text. Without the checkpoint the scoped marker no-ops, and
    // because the debounced checkpoint already wrote baseContent = note content
    // the row is restore-eligible: the next open silently RESTOREs the discarded
    // text and Escape saves it over the note (#8982 review).
    await editFullscreen();

    contentChanged$.next('typed then undone');
    afterClosed$.next({ action: 'DISCARD', content: NOTE.content });
    await waitFor(
      () => localDraftService.markDiscarded.calls.any(),
      'the discarded marker',
    );

    // Whatever the row was last checkpointed with must be what the marker
    // carries, or the row survives the discard as a live, restorable draft.
    const lastCheckpoint = localDraftService.saveDraft.calls.mostRecent().args[0];
    const markedText = localDraftService.markDiscarded.calls.mostRecent().args[2];
    expect(lastCheckpoint.content).toBe(NOTE.content);
    expect(markedText).toBe(NOTE.content);
    expect(lastCheckpoint.content).toBe(markedText);
  });

  it('marks the text the editor ended with, not the last debounced checkpoint', async () => {
    // The debounced checkpoint stream lags the editor, so the last text it
    // emitted is NOT what the user was looking at when they confirmed the
    // discard. The marker must carry the editor's final text.
    await editFullscreen();

    contentChanged$.next('stale debounced checkpoint');
    afterClosed$.next({ action: 'DISCARD', content: 'what the editor ended with' });
    await waitFor(
      () => localDraftService.markDiscarded.calls.any(),
      'the discarded marker',
    );

    expect(localDraftService.markDiscarded).toHaveBeenCalledWith(
      'NOTE',
      NOTE.id,
      'what the editor ended with',
    );
    // ...and the row was brought to that same text first, so the marker lands.
    expect(localDraftService.saveDraft.calls.mostRecent().args[0].content).toBe(
      'what the editor ended with',
    );
  });

  it('retires nothing when a DISCARD result carries no content', async () => {
    // Synthesizing note.content for a content-less DISCARD would checkpoint the
    // note over the draft row and then successfully mark it, destroying unsaved
    // text on the one path that is meant to be conservative (#8982 review).
    localDraftService.loadDraft.and.resolveTo(
      draftOf('unsaved typed text', 'saved content'),
    );

    await editFullscreen();

    afterClosed$.next({ action: 'DISCARD' });
    await settle();

    expectNothingRetired();
  });

  it('leaves the draft completely alone on a DISCARD when the draft could not be read', async () => {
    localDraftService.loadDraft.and.resolveTo(DRAFT_LOAD_ERROR);

    await editFullscreen();

    afterClosed$.next({ action: 'DISCARD' });
    await settle();

    // An unread draft may be someone else's unsaved recovery copy; a discard of
    // content we never managed to load must not resolve it.
    expectNothingRetired();
  });

  it('checkpoints the editor contents while typing (crash-safety premise)', async () => {
    await editFullscreen();

    // The while-typing checkpoint IS the crash-safety premise (type, crash,
    // recover). Delete the contentChanged -> saveDraft subscription in production
    // and this is the only test that goes red.
    contentChanged$.next('typed so far');

    expect(localDraftService.saveDraft).toHaveBeenCalledWith({
      entityType: 'NOTE',
      entityId: NOTE.id,
      content: 'typed so far',
      baseContent: 'saved content',
    });
  });

  it('should remove the note and clear its draft when deleted from the note menu', () => {
    component.removeNote();

    expect(noteService.remove).toHaveBeenCalledWith(NOTE);
    // The fullscreen DELETE path already clears; this covers menu-deletion, which
    // otherwise left the draft behind to recover onto a note that no longer exists.
    expect(localDraftService.clearDraft).toHaveBeenCalledWith('NOTE', NOTE.id);
  });

  it('should keep the draft fully intact on a force-close (undefined result)', async () => {
    await editFullscreen();

    afterClosed$.next(undefined);
    await settle();

    expect(noteService.update).not.toHaveBeenCalled();
    expect(noteService.remove).not.toHaveBeenCalled();
    // A force-close (MatDialog.closeAll(), a disposed overlay) is not a decision
    // by the user, so the draft stays recoverable — unmarked as well as undeleted.
    expectNothingRetired();
  });

  it('should open the editor but skip all draft handling when the draft load fails', async () => {
    localDraftService.loadDraft.and.resolveTo(DRAFT_LOAD_ERROR);

    await editFullscreen();

    expect(getFullscreenDialogData().content).toBe('saved content');
    // No checkpointing: a transient read failure must not lead to overwriting
    // an unread recovery draft.
    contentChanged$.next('typed content');
    expect(localDraftService.saveDraft).not.toHaveBeenCalled();

    afterClosed$.next('final content');
    await waitFor(() => noteService.update.calls.any(), 'the note update dispatch');
    expect(noteService.update).toHaveBeenCalledWith(NOTE.id, {
      content: 'final content',
    });
    expect(localDraftService.saveDraft).not.toHaveBeenCalled();
    // Nothing may retire a draft we could not read — including the marker, which
    // would suppress recovery of content this session never saw.
    expectNothingRetired();
  });

  it('does not stack a second editor when opened again while the first draft load is still pending', async () => {
    let resolveLoad!: (v: LocalDraft | undefined) => void;
    localDraftService.loadDraft.and.returnValue(new Promise((r) => (resolveLoad = r)));

    const first = editFullscreen();
    const second = editFullscreen(); // clicked again before the first load resolved

    resolveLoad(undefined);
    await first;
    await second;

    // The per-note open guard collapses the second open; without it two editors
    // stack from the same stale snapshot and closing the stale one after the
    // first save reverts it (#8982 review).
    const fullscreenOpens = matDialog.open.calls
      .allArgs()
      .filter((args) => args[0] === DialogFullscreenMarkdownComponent);
    expect(fullscreenOpens.length).toBe(1);
  });

  // A never-settling IndexedDB request is the failure mode these two cover: idb
  // has no timeout, so such a request never rejects either. Drive the clock past
  // the production bound, then hand back to real timers so a regression shows up
  // as a fast, explicit failure instead of a hung spec.
  const openPastTheDraftIoTimeout = async (): Promise<'settled' | 'hung'> => {
    jasmine.clock().install();
    let open: Promise<void>;
    try {
      open = editFullscreen();
      jasmine.clock().tick(60_000); // well past DRAFT_IO_TIMEOUT_MS
    } finally {
      jasmine.clock().uninstall();
    }
    return Promise.race<'settled' | 'hung'>([
      open!.then(() => 'settled' as const),
      new Promise((r) => setTimeout(() => r('hung'), 100)),
    ]);
  };

  it('bounds the draft load so a stalled IndexedDB cannot wedge the note shut', async () => {
    localDraftService.loadDraft.and.returnValue(new Promise(() => {})); // never settles

    const outcome = await openPastTheDraftIoTimeout();

    // Drop the Promise.race in production and this await never returns: the
    // `finally` releasing _openingNoteIds cannot run across a pending await, so
    // the note stays un-openable for the rest of the session.
    expect(outcome).toBe('settled');
    expect(getFullscreenDialogData().content).toBe('saved content');
  });

  it('treats a timed-out draft load as unreadable, not as "no draft"', async () => {
    localDraftService.loadDraft.and.returnValue(new Promise(() => {}));

    await openPastTheDraftIoTimeout();

    // Resolving the race to `undefined` instead of DRAFT_LOAD_ERROR would look
    // like "no draft exists" and re-arm checkpointing over a draft we never
    // managed to read -> this goes red.
    contentChanged$.next('typed so far');
    expect(localDraftService.saveDraft).not.toHaveBeenCalled();
  });

  it('bounds the pre-dispatch draft save so a stalled IndexedDB cannot block the note update', async () => {
    await editFullscreen();
    // Only the pre-dispatch checkpoint stalls; the open path already resolved.
    localDraftService.saveDraft.and.returnValue(new Promise(() => {}));

    jasmine.clock().install();
    try {
      afterClosed$.next('final content');
      jasmine.clock().tick(60_000);
    } finally {
      jasmine.clock().uninstall();
    }
    // Positive assertion, so wait for the dispatch itself. This one sits behind
    // the longest chain in the file (the timeout race has to fire first), which
    // makes it the most exposed to a drain-based barrier.
    await waitFor(() => noteService.update.calls.any(), 'the note update dispatch');

    // Drop the Promise.race and the dispatch never happens: a device-local
    // convenience DB would be sitting on the critical path of the note save.
    expect(noteService.update).toHaveBeenCalledWith(NOTE.id, {
      content: 'final content',
    });
  });

  it('aborts opening when the note content changes under us during the async draft load (stale snapshot)', async () => {
    let resolveLoad!: (v: LocalDraft | undefined) => void;
    localDraftService.loadDraft.and.returnValue(new Promise((r) => (resolveLoad = r)));

    const open = editFullscreen();
    // A remote sync updates the note while we await the draft load.
    component.noteSet = { ...NOTE, content: 'newer remote content' } as Note;
    resolveLoad(undefined);
    await open;

    // Opening the captured (stale) snapshot and dispatching it on close would
    // revert the newer content, so we bail before opening the editor.
    expect(getFullscreenDialogData()).toBeUndefined();
  });
});
