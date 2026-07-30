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
import { LocalDraftService } from '../../../core/draft/local-draft.service';
import { UserProfileService } from '../../user-profile/user-profile.service';
import { UserProfileStorageService } from '../../user-profile/user-profile-storage.service';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { DialogFullscreenMarkdownComponent } from '../../../ui/dialog-fullscreen-markdown/dialog-fullscreen-markdown.component';
import { OperationWriteFlushService } from '../../../op-log/sync/operation-write-flush.service';
import { OperationCaptureService } from '../../../op-log/capture/operation-capture.service';

/**
 * Exhaustive state-matrix cover for the crash-safe draft lifecycle.
 *
 * WHY THIS EXISTS. Every defect this feature produced across its review rounds
 * was a reachable point in one small state space that had only ever been
 * explored by hand, one prose case at a time: a save landing back on the note
 * content, a discard whose marker missed the stored row, a resolved row being
 * rewritten by a read-only close, a marker erased by the close that followed the
 * prompt that wrote it. Each was found by a human reading code and imagining a
 * sequence, which is exactly the method that had already missed it.
 *
 * So this spec does not test a case. It enumerates the whole reachable
 * cross-product and asserts two safety properties over every point of it.
 *
 * TWO THINGS MAKE IT A REAL ORACLE, not a restatement of the implementation:
 *
 * 1. It drives the REAL LocalDraftService (on the fake-indexeddb the suite
 *    installs) rather than a spy. The sibling spec asserts which methods the
 *    component CALLED, which cannot see this class of bug at all: the damage is
 *    in what the store ends up HOLDING and what the next open then does with it.
 * 2. The properties are phrased in terms of user intent and the user-visible
 *    outcome (what the editor is silently seeded with, and what the note ends up
 *    containing), never in terms of rows, markers or method calls. A change that
 *    reorganises the internals cannot make these pass vacuously.
 *
 * VALIDATED BY REPLAY. Every defect this feature shipped was re-introduced one
 * at a time and this spec goes red for each: the save-back-at-base checkpoint
 * made conditional again, the discard-path checkpoint removed, a resolved row
 * counted as live, and the conflict prompt's answer not clearing the row flag.
 * A property suite that has never been shown to fail is decoration.
 *
 * WHAT IT DOES NOT COVER, so nobody reads it as more than it is:
 * - CONCURRENCY. One editor at a time. The marker-scoping rules exist for a
 *   second tab and for a write landing after its 2s bound, and those are covered
 *   directly in local-draft.service.spec.ts, not here. Un-scoping markDiscarded
 *   does NOT turn this suite red.
 * - The real engine. This runs on the fake-indexeddb the suite installs, so
 *   transaction ordering and eviction under Blink are out of scope.
 * - The 500ms debounce itself is modelled, not run: `flushed` is what the
 *   debounce emitted and `finalText` is what the editor held at close, which is
 *   how a lagging checkpoint is expressed.
 */
describe('NoteComponent draft lifecycle (state matrix)', () => {
  let component: NoteComponent;
  let draftService: LocalDraftService;
  let matDialog: jasmine.SpyObj<MatDialog>;
  // Fresh per dialog open. A single shared Subject would re-fire EVERY previous
  // open's afterClosed handler on each next(), because afterClosed() hands out a
  // Subject that never completes and the component keeps its subscription. That
  // is invisible in a spec that opens one dialog per test and silently corrupts
  // one that opens many.
  let contentChanged$: Subject<string>;
  let afterClosed$: Subject<unknown>;
  let fullscreenOpenCount: number;
  let confirmResult: boolean | undefined;
  let isDurable: boolean;
  let didPrompt: boolean;
  let noteContent: string;

  const NOTE_ID = 'matrix-note';
  /** The note's own text. */
  const A = 'A-note-text';
  /** Text the user types and the debounce flushes. */
  const B = 'B-typed-text';
  /** Text the user types that the debounce has NOT flushed at close time. */
  const C = 'C-unflushed-text';

  const setNote = (content: string): void => {
    noteContent = content;
    component.noteSet = { id: NOTE_ID, content } as Note;
  };

  beforeEach(() => {
    contentChanged$ = new Subject<string>();
    afterClosed$ = new Subject<unknown>();
    fullscreenOpenCount = 0;
    confirmResult = undefined;
    isDurable = true;
    didPrompt = false;

    matDialog = jasmine.createSpyObj('MatDialog', ['open']);
    matDialog.open.and.callFake((comp: any): any => {
      if (comp === DialogConfirmComponent) {
        didPrompt = true;
        return { afterClosed: () => of(confirmResult) };
      }
      fullscreenOpenCount++;
      contentChanged$ = new Subject<string>();
      afterClosed$ = new Subject<unknown>();
      const contentChanged = contentChanged$;
      const afterClosed = afterClosed$;
      return {
        componentInstance: { contentChanged, close: () => {} },
        afterClosed: () => afterClosed,
      };
    });

    const noteService = jasmine.createSpyObj('NoteService', ['update', 'remove']);
    // The note really is updated, so a later open sees what a save left behind.
    noteService.update.and.callFake((_id: string, changes: Partial<Note>) => {
      if (typeof changes.content === 'string') {
        setNote(changes.content);
      }
    });

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
        // The REAL draft service. Its two dependencies are the only things stubbed.
        {
          provide: UserProfileService,
          useValue: { activeProfile: () => ({ id: 'matrix-profile' }) },
        },
        {
          provide: UserProfileStorageService,
          useValue: { loadProfileMetadata: () => Promise.resolve(null) },
        },
        {
          provide: OperationWriteFlushService,
          useValue: {
            flushThenRunExclusive: async <T>(fn: () => Promise<T>): Promise<T> => fn(),
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

    draftService = TestBed.inject(LocalDraftService);
    runInInjectionContext(TestBed.inject(EnvironmentInjector), () => {
      component = new NoteComponent();
    });
    setNote(A);
  });

  // One shared IndexedDB across the whole suite, and specs run in random order,
  // so wipe between scenarios rather than trusting each to tidy up.
  afterEach(async () => {
    try {
      await (draftService as any)._withRetryOnClose((db: any) => db.clear('drafts'));
    } catch {
      // A scenario that broke IndexedDB has nothing to clean up.
    }
  });

  const turn = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

  const settle = async (turns = 12): Promise<void> => {
    for (let i = 0; i < turns; i++) {
      await turn();
    }
  };

  type ClosePath = 'save' | 'discard' | 'force';

  interface Session {
    /** Editor contents the 500ms debounce actually flushed, in order. */
    flushed: string[];
    /** What the editor holds when it closes (may differ: the debounce lags). */
    finalText: string;
    close: ClosePath;
    isDurable: boolean;
  }

  /** Opens the editor, replays the session, and closes it. */
  const runSession = async (session: Session): Promise<void> => {
    isDurable = session.isDurable;
    // Answering "review draft" keeps any offered text in play, which is the
    // choice that can still do damage later; "keep saved" is covered separately.
    confirmResult = true;
    await component.editFullscreen({} as MouseEvent);
    for (const content of session.flushed) {
      contentChanged$.next(content);
      await turn();
    }
    if (session.close === 'save') {
      afterClosed$.next(session.finalText);
    } else if (session.close === 'discard') {
      afterClosed$.next({ action: 'DISCARD', content: session.finalText });
    } else {
      afterClosed$.next(undefined);
    }
    await settle();
  };

  /**
   * Reopens the note and reports what the user would see, WITHOUT letting the
   * reopen mutate anything: a prompt is dismissed (which aborts the open), and
   * the editor is force-closed.
   */
  const reopen = async (): Promise<{ seeded: string; wasPrompted: boolean }> => {
    didPrompt = false;
    confirmResult = undefined; // dismiss any conflict prompt -> open aborts
    const before = fullscreenOpenCount;
    await component.editFullscreen({} as MouseEvent);
    await settle(4);
    const wasPrompted = didPrompt;
    // An aborted open leaves the previous scenario's call as the last one, so
    // reading it blindly would attribute stale data to this open.
    const didOpen = fullscreenOpenCount > before;
    const lastOpen = matDialog.open.calls
      .allArgs()
      .filter((args) => args[0] === DialogFullscreenMarkdownComponent)
      .pop();
    const data = didOpen
      ? (lastOpen?.[1]?.data as { content?: string } | undefined)
      : undefined;
    if (didOpen) {
      afterClosed$.next(undefined); // force-close: changes nothing
      await settle(4);
    }
    return { seeded: data?.content ?? '', wasPrompted };
  };

  const describeScenario = (s: Session, prior: string): string =>
    `prior=${prior} flushed=[${s.flushed.join('|')}] final=${s.finalText} ` +
    `close=${s.close} durable=${s.isDurable}`;

  /** Seeds the store with a row that a previous editing session would have left. */
  const seedPrior = async (prior: 'none' | 'live' | 'resolved'): Promise<void> => {
    if (prior === 'none') {
      return;
    }
    await draftService.saveDraft({
      entityType: 'NOTE',
      entityId: NOTE_ID,
      content: 'PRIOR-session-text',
      baseContent: A,
    });
    if (prior === 'resolved') {
      await draftService.markSaved('NOTE', NOTE_ID, 'PRIOR-session-text');
    }
  };

  const PRIORS: Array<'none' | 'live' | 'resolved'> = ['none', 'live', 'resolved'];
  const FLUSHED: string[][] = [[], [B], [B, A]];
  const FINALS: string[] = [A, B, C];
  const CLOSES: ClosePath[] = ['save', 'discard', 'force'];

  /**
   * PROPERTY 1 — after the user has SAVED or DISCARDED, a later open must never
   * SILENTLY seed the editor with anything other than the note's own content.
   *
   * Silent seeding is the whole danger: the editor's close path saves what it
   * holds (Escape IS save), so text seeded without asking is text that overwrites
   * the note. Offering it through the conflict PROMPT is fine, because the user
   * decides. This is the property that both the save-back-at-base bug and the
   * undo-then-discard bug violate.
   */
  it('never silently seeds abandoned text after a save or a discard', async () => {
    const violations: string[] = [];
    for (const prior of PRIORS) {
      for (const flushed of FLUSHED) {
        for (const finalText of FINALS) {
          for (const close of ['save', 'discard'] as ClosePath[]) {
            for (const durable of [true, false]) {
              setNote(A);
              await (draftService as any)._withRetryOnClose((db: any) =>
                db.clear('drafts'),
              );
              await seedPrior(prior);
              await runSession({ flushed, finalText, close, isDurable: durable });
              const noteAfterClose = noteContent;
              const { seeded, wasPrompted } = await reopen();
              if (!wasPrompted && seeded !== noteAfterClose) {
                violations.push(
                  `${describeScenario({ flushed, finalText, close, isDurable: durable }, prior)}` +
                    ` -> note=${noteAfterClose} but editor silently seeded with ${seeded}`,
                );
              }
            }
          }
        }
      }
    }
    expect(violations).toEqual([]);
  }, 120000);

  /**
   * PROPERTY 2 — text the user typed and neither saved nor discarded must stay
   * recoverable.
   *
   * The mirror of property 1, and the reason none of this may be "fixed" by
   * retiring drafts more eagerly. After a force-close (crash, closeAll, an
   * overlay disposed by navigation) the newest flushed text must still be
   * offered on the next open, either seeded for recovery or via the prompt.
   */
  it('never silently drops text from a force-closed session', async () => {
    const violations: string[] = [];
    for (const prior of PRIORS) {
      for (const flushed of FLUSHED) {
        for (const durable of [true, false]) {
          // Only the user's LAST state is theirs to recover. Typing B and then
          // reverting to the note content leaves nothing unsaved: the revert
          // superseded B, so B must NOT be offered back. (This spec asserted the
          // opposite at first, and the implementation was right.)
          const lastFlushed = flushed[flushed.length - 1];
          const recoverable = lastFlushed !== A ? lastFlushed : undefined;
          if (!recoverable) {
            continue;
          }
          setNote(A);
          await (draftService as any)._withRetryOnClose((db: any) => db.clear('drafts'));
          await seedPrior(prior);
          await runSession({
            flushed,
            finalText: flushed[flushed.length - 1] ?? A,
            close: 'force',
            isDurable: durable,
          });
          const { seeded, wasPrompted } = await reopen();
          if (!wasPrompted && seeded !== recoverable) {
            violations.push(
              `${describeScenario({ flushed, finalText: recoverable, close: 'force', isDurable: durable }, prior)}` +
                ` -> typed ${recoverable} was not offered back (editor got ${seeded})`,
            );
          }
        }
      }
    }
    expect(violations).toEqual([]);
  }, 120000);

  /**
   * PROPERTY 3 — answering the conflict prompt with "keep saved" must stick.
   *
   * The user has explicitly rejected the stored draft. No close of the editor
   * that opens straight afterwards may revive it, which is what an unmodified
   * close did while the row flag counted any row rather than a live one.
   */
  it('does not revive a draft the user rejected at the conflict prompt', async () => {
    const violations: string[] = [];
    for (const durable of [true, false]) {
      for (const close of CLOSES) {
        setNote(A);
        await (draftService as any)._withRetryOnClose((db: any) => db.clear('drafts'));
        // A row whose base differs from the note forces the PROMPT on open.
        await draftService.saveDraft({
          entityType: 'NOTE',
          entityId: NOTE_ID,
          content: 'REJECTED-draft-text',
          baseContent: 'a-different-base',
        });
        isDurable = durable;
        confirmResult = false; // "keep saved"
        await component.editFullscreen({} as MouseEvent);
        await settle(4);
        if (close === 'save') {
          afterClosed$.next(A);
        } else if (close === 'discard') {
          afterClosed$.next({ action: 'DISCARD', content: A });
        } else {
          afterClosed$.next(undefined);
        }
        await settle();

        const { seeded, wasPrompted } = await reopen();
        if (wasPrompted || seeded === 'REJECTED-draft-text') {
          violations.push(
            `durable=${durable} close=${close} -> rejected draft came back ` +
              `(prompted=${wasPrompted}, seeded=${seeded})`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  }, 120000);
  /** The whole stored row, so a property can assert that nothing was touched. */
  const readRow = async (): Promise<unknown> => {
    const row = await draftService.loadDraft('NOTE', NOTE_ID);
    return row && typeof row === 'object' ? JSON.parse(JSON.stringify(row)) : row;
  };

  /** A sync landing someone else's edit while the note was not open. */
  const REMOTE = 'R-remote-edit';

  /**
   * PROPERTY 4 — merely VIEWING a note must not touch the store.
   *
   * Opening a note fullscreen and closing it without typing is a read. If it
   * writes, three things follow, and all three were live bugs: a full copy of
   * the note is parked in a device-local store for another 14 days, an existing
   * resolution marker is dropped, and whenever durability cannot be proven the
   * row is left LIVE so the next remote edit turns it into a conflict prompt
   * offering the note's own stale text back.
   *
   * Asserted on the row itself AND on the user-visible consequence after a
   * remote edit, because the first is precise and the second is what hurts.
   */
  it('leaves the store untouched when a note is only viewed', async () => {
    const violations: string[] = [];
    for (const prior of PRIORS) {
      // A LIVE row is RESTOREd into the editor on open, so closing on the note's
      // own content means the user deleted the restored text. That is an edit,
      // not a view, and the row MUST be rewritten so the marker's scope matches
      // what was dispatched. Only a note that opens on its own content is a read.
      if (prior === 'live') {
        continue;
      }
      for (const close of ['save', 'force'] as ClosePath[]) {
        for (const durable of [true, false]) {
          setNote(A);
          await (draftService as any)._withRetryOnClose((db: any) => db.clear('drafts'));
          await seedPrior(prior);
          const before = await readRow();

          // Opened, nothing typed, closed on the note's own content.
          await runSession({ flushed: [], finalText: A, close, isDurable: durable });

          const after = await readRow();
          const label = `prior=${prior} close=${close} durable=${durable}`;
          if (JSON.stringify(before) !== JSON.stringify(after)) {
            violations.push(`${label} -> a read-only open rewrote the stored row`);
          }
          // ...and the consequence: a remote edit must not raise a prompt for a
          // note the user never edited.
          setNote(REMOTE);
          const { seeded, wasPrompted } = await reopen();
          if (wasPrompted || seeded !== REMOTE) {
            violations.push(
              `${label} -> after a remote edit: prompted=${wasPrompted}, seeded=${seeded}`,
            );
          }
        }
      }
    }
    expect(violations).toEqual([]);
  }, 120000);

  /**
   * PROPERTY 5 — rejecting a draft at the conflict prompt must survive a remote
   * edit.
   *
   * "Keep saved" is an explicit answer about this note. The close that follows
   * must not undo it, and no later sync may resurface the same question. This is
   * the variant that only appears once the note changes again, which is why
   * asserting on the immediate reopen was not enough to catch it.
   */
  it('does not re-raise a conflict the user already dismissed', async () => {
    const violations: string[] = [];
    for (const durable of [true, false]) {
      for (const close of CLOSES) {
        setNote(A);
        await (draftService as any)._withRetryOnClose((db: any) => db.clear('drafts'));
        await draftService.saveDraft({
          entityType: 'NOTE',
          entityId: NOTE_ID,
          content: 'REJECTED-draft-text',
          baseContent: 'a-different-base',
        });
        isDurable = durable;
        confirmResult = false; // "keep saved"
        await component.editFullscreen({} as MouseEvent);
        await settle(4);
        if (close === 'save') {
          afterClosed$.next(A);
        } else if (close === 'discard') {
          afterClosed$.next({ action: 'DISCARD', content: A });
        } else {
          afterClosed$.next(undefined);
        }
        await settle();

        setNote(REMOTE);
        const { seeded, wasPrompted } = await reopen();
        if (wasPrompted || seeded !== REMOTE) {
          violations.push(
            `durable=${durable} close=${close} -> after a remote edit the dismissed ` +
              `conflict returned (prompted=${wasPrompted}, seeded=${seeded})`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  }, 120000);
});
