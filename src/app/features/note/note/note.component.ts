import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  Input,
  OnChanges,
  signal,
  SimpleChanges,
  viewChild,
} from '@angular/core';
import { Note } from '../note.model';
import { NoteService } from '../note.service';
import { MatDialog } from '@angular/material/dialog';
import { T } from '../../../t.const';
import { openFullscreenMarkdownDialog } from '../../../ui/dialog-fullscreen-markdown/open-fullscreen-markdown-dialog';
import { firstValueFrom, Observable, of, ReplaySubject } from 'rxjs';
import { TagComponent, TagComponentTag } from '../../tag/tag/tag.component';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { WorkContextType } from '../../work-context/work-context.model';
import { WorkContextService } from '../../work-context/work-context.service';
import { ProjectService } from '../../project/project.service';
import { Project } from '../../project/project.model';
import { EnlargeImgDirective } from '../../../ui/enlarge-img/enlarge-img.directive';
import { LongPressDirective } from '../../../ui/longpress/longpress.directive';
import { MarkdownComponent } from 'ngx-markdown';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MatMenu,
  MatMenuContent,
  MatMenuItem,
  MatMenuTrigger,
} from '@angular/material/menu';
import { AsyncPipe, Location } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { DEFAULT_PROJECT_COLOR } from '../../work-context/work-context.const';
import { DEFAULT_PROJECT_ICON } from '../../project/project.const';
import { ClipboardImageService } from '../../../core/clipboard-image/clipboard-image.service';
import {
  DRAFT_LOAD_ERROR,
  getDraftOpenAction,
  LocalDraftService,
} from '../../../core/draft/local-draft.service';
import { isDispatchDurable } from '../../../core/draft/draft-durability.util';
import { OperationWriteFlushService } from '../../../op-log/sync/operation-write-flush.service';
import { OperationCaptureService } from '../../../op-log/capture/operation-capture.service';
import { Log } from '../../../core/log';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { RenderLinksPipe } from '../../../ui/pipes/render-links.pipe';
import { isPathSafeToOpen } from '../../../../../electron/shared-with-frontend/is-external-url-allowed';

/**
 * Bound on the device-local drafts IndexedDB, which both awaits below put on a
 * user-visible critical path: the load holds the per-note open guard (a request
 * that never settles would leave that note un-openable for the rest of the
 * session, since the `finally` releasing it cannot run), and the save sits in
 * front of the note update dispatch itself. IndexedDB has no timeout of its own
 * — a request that never settles never rejects either — so a race is the only
 * bound. (An idb `blocked` handler would not help: DB_VERSION is fixed at 1, so
 * `blocked` cannot fire, and it does not settle the open promise anyway.)
 *
 * 2s: a local get/put against this tiny store settles in single-digit ms, and
 * even a cold DB open plus the one iOS/WebKit reconnect retry (#6643) stays far
 * below it, so a slow-but-working device is not falsely timed out. A genuinely
 * stuck request then degrades to "no drafts this session" — the same fail-safe
 * path an unreadable draft takes — instead of a wedged note or a blocked save.
 */
const DRAFT_IO_TIMEOUT_MS = 2000;

/**
 * Bound on the durability proof. Deliberately far larger than the drafts-DB
 * budget above: that one races a local get/put, this one waits for the write
 * queue to drain AND for the op-log lock, which sync legitimately holds for
 * seconds at a time. Reusing the 2s budget would report ordinary saves as
 * unproven on a busy or slow device, and every one of those costs a spurious
 * recovery prompt — the exact thing the marker exists to prevent.
 *
 * It still needs a bound: flushThenRunExclusive can take up to five attempts at
 * a 30s drain plus a lock acquisition, and there is no reason to hold this
 * closure (and the note content it captures) alive that long. Timing out means
 * the draft stays recoverable, which is the same safe direction every other
 * failure here takes.
 */
const DURABILITY_PROOF_TIMEOUT_MS = 15000;

/**
 * Resolves to `onTimeout` if `promise` has not settled within `ms`. The timer is
 * cleared as soon as the promise settles, so the fast path leaves nothing
 * pending. Rejections are deliberately not swallowed — every caller below
 * already handles its own errors internally.
 */
const withTimeout = <T>(promise: Promise<T>, onTimeout: T, ms: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    new Promise<T>((resolve) => {
      timeoutId = setTimeout(() => resolve(onTimeout), ms);
    }),
  ]);
};

/** {@link withTimeout} at the drafts-DB budget, which most callers here want. */
const withDraftIoTimeout = <T>(promise: Promise<T>, onTimeout: T): Promise<T> =>
  withTimeout(promise, onTimeout, DRAFT_IO_TIMEOUT_MS);

@Component({
  selector: 'note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    EnlargeImgDirective,
    LongPressDirective,
    MarkdownComponent,
    MatIconButton,
    MatIcon,
    TagComponent,
    MatMenuTrigger,
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    AsyncPipe,
    TranslatePipe,
    RenderLinksPipe,
  ],
})
export class NoteComponent implements OnChanges {
  private readonly _matDialog = inject(MatDialog);
  private readonly _location = inject(Location);
  private readonly _noteService = inject(NoteService);
  private readonly _projectService = inject(ProjectService);
  private readonly _workContextService = inject(WorkContextService);
  private readonly _clipboardImageService = inject(ClipboardImageService);
  private readonly _localDraftService = inject(LocalDraftService);
  private readonly _operationWriteFlushService = inject(OperationWriteFlushService);
  private readonly _operationCaptureService = inject(OperationCaptureService);

  // Note ids whose fullscreen-open lifecycle is currently in flight. Serializes
  // opens per note so a second click during the async draft/conflict prelude
  // cannot stack a second editor loaded from the same stale snapshot (#8982).
  private readonly _openingNoteIds = new Set<string>();

  note!: Note;

  // The <img> src auto-loads on render (no click), so a synced remote file:// /
  // UNC imgUrl would silently leak the user's NTLM hash. Only a safe URL reaches
  // the [src]/[enlargeImg] bindings. See GHSA-hr87-735w-hfq3.
  safeImgUrl?: string;

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input('note') set noteSet(v: Note) {
    this.note = v;
    this.safeImgUrl = isPathSafeToOpen(v?.imgUrl) ? v.imgUrl : undefined;
    this._note$.next(v);
    this._updateNoteTxt();
  }

  readonly isFocus = input<boolean>();

  readonly markdownEl = viewChild<HTMLElement>('markdownEl');

  isLongNote?: boolean;
  shortenedNote?: string;
  resolvedContent = signal<string>('');
  resolvedShortenedContent = signal<string>('');

  T: typeof T = T;
  readonly DEFAULT_PROJECT_ICON = DEFAULT_PROJECT_ICON;

  projectTag$: Observable<TagComponentTag | null> =
    this._workContextService.activeWorkContextTypeAndId$.pipe(
      switchMap(({ activeType }) => {
        return activeType === WorkContextType.TAG
          ? this._note$.pipe(
              map((n) => n.projectId),
              distinctUntilChanged(),
              switchMap((pId) =>
                pId
                  ? this._projectService.getByIdOnceCatchError$(pId).pipe(
                      map((project) =>
                        project
                          ? {
                              ...project,
                              color: project.theme?.primary || DEFAULT_PROJECT_COLOR,
                              icon: project.icon || DEFAULT_PROJECT_ICON,
                              theme: {
                                primary: project.theme?.primary || DEFAULT_PROJECT_COLOR,
                              },
                            }
                          : null,
                      ),
                    )
                  : of(null),
              ),
            )
          : of(null);
      }),
    );

  _note$: ReplaySubject<Note> = new ReplaySubject(1);

  moveToProjectList$: Observable<Project[]> = this._note$.pipe(
    map((note) => note.projectId),
    distinctUntilChanged(),
    switchMap((pid) => this._projectService.getProjectsWithoutIdInTreeOrder$(pid)),
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.note) {
      this._updateNoteTxt();
    }
  }

  toggleLock(): void {
    if (!this.note) {
      throw new Error('No note');
    }
    this._noteService.update(this.note.id, { isLock: !this.note.isLock });
  }

  updateContent(newVal: any): void {
    if (!this.note) {
      throw new Error('No note');
    }
    this._noteService.update(this.note.id, { content: newVal });
  }

  removeNote(): void {
    if (!this.note) {
      throw new Error('No note');
    }
    const noteId = this.note.id;
    this._noteService.remove(this.note);
    // Entity deletion is the ONLY thing in the editing lifecycle that still
    // deletes a draft, and it needs no proof about durability or ownership: the
    // note itself is gone, so no text under this key can ever be recovered onto
    // anything again, and leaving full note content behind after the user
    // deleted the note would be worse than dropping it. Every other former clear
    // is now a resolution marker (see getDraftOpenAction). Best-effort; the
    // fullscreen DELETE path does the same for deletion from inside the editor.
    this._localDraftService.clearDraft('NOTE', noteId);
  }

  togglePinToToday(): void {
    if (!this.note) {
      throw new Error('No note');
    }
    this._noteService.update(this.note.id, {
      isPinnedToToday: !this.note.isPinnedToToday,
    });
  }

  async editFullscreen(event: MouseEvent): Promise<void> {
    if ((event as any)?.target?.tagName?.toUpperCase() === 'A') {
      return;
    }
    if (!this.note) {
      throw new Error('No note');
    }
    const note = this.note;
    // Guard the whole per-note open lifecycle. Opening is async (draft load plus
    // an optional conflict prompt), and a second click during that window would
    // stack a second editor loaded from the same stale snapshot — closing the
    // stale one after the first save then reverts it (#8982 review). Allow one
    // open per note id at a time; released in `finally` once the editor is up or
    // we bail out.
    if (this._openingNoteIds.has(note.id)) {
      return;
    }
    this._openingNoteIds.add(note.id);
    try {
      let contentToOpen = note.content;
      // Timed out reads resolve to DRAFT_LOAD_ERROR, so a stalled DB takes the
      // same conservative path as an unreadable one (draft handling off for this
      // session) rather than being mistaken for "no draft exists".
      const draftOrError = await withDraftIoTimeout(
        this._localDraftService.loadDraft('NOTE', note.id),
        DRAFT_LOAD_ERROR,
      );
      // A failed read is not the same as "no draft": an unread recovery draft may
      // exist, so all draft handling (including writes) is skipped for this
      // session rather than risking to overwrite it.
      const isDraftUnreadable = draftOrError === DRAFT_LOAD_ERROR;
      const draft = isDraftUnreadable ? undefined : draftOrError;
      if (isDraftUnreadable) {
        Log.err('NoteComponent: Failed to load draft; draft handling disabled', note.id);
      } else if (draft) {
        // The open path only READS. Everything the old code cleared here (a draft
        // the note already contains, or one the user rejected) is now expressed by
        // the decision below plus a resolution marker written on close, so opening
        // a note can no longer destroy a draft it misjudged.
        const action = getDraftOpenAction(draft, note.content);
        if (action === 'RESTORE') {
          contentToOpen = draft.content;
        } else if (action === 'PROMPT') {
          // The note changed since the draft was created (e.g. through sync).
          // Never auto-overwrite; let the user decide.
          const isReviewDraft = await firstValueFrom(
            this._matDialog
              .open(DialogConfirmComponent, {
                restoreFocus: true,
                data: {
                  message: T.F.NOTE.D_DRAFT_CONFLICT.MSG,
                  okTxt: T.F.NOTE.D_DRAFT_CONFLICT.REVIEW_DRAFT,
                  cancelTxt: T.F.NOTE.D_DRAFT_CONFLICT.KEEP_SAVED,
                },
              })
              .afterClosed(),
          );
          if (isReviewDraft === true) {
            contentToOpen = draft.content;
          } else if (isReviewDraft === false) {
            // The user explicitly chose the saved version over the draft: same
            // instruction as hitting Discard in the editor, so it is recorded the
            // same way — the text stays in the DB, it is just no longer offered.
            await withDraftIoTimeout(
              this._localDraftService.markDiscarded('NOTE', note.id),
              undefined,
            );
          } else {
            // No decision (undefined from ESC / backdrop / closeAll). Abort opening
            // the editor entirely: proceeding would let a checkpoint overwrite the
            // still-unresolved draft. Leave it intact so the conflict prompt
            // reappears on the next open.
            return;
          }
        }
      }

      // Revalidate the captured snapshot after the async draft/conflict waits,
      // before opening. If the note was deleted or its content changed under us
      // (e.g. through sync) while we awaited, the captured `note` is stale;
      // opening it and dispatching its content on close would revert the newer
      // content (#8982 review).
      const current = this.note;
      if (!current || current.id !== note.id || current.content !== note.content) {
        return;
      }

      // Saves-and-closes on a navigation (resize across the mobile breakpoint,
      // Android back) instead of dropping the edit — see openFullscreenMarkdownDialog
      // (#8434).
      const dialogRef = openFullscreenMarkdownDialog(this._matDialog, this._location, {
        content: contentToOpen,
        ...(contentToOpen !== note.content ? { originalContent: note.content } : {}),
      });
      // Checkpoint the editor contents locally so they survive a crash.
      const contentChangedSub = isDraftUnreadable
        ? undefined
        : dialogRef.componentInstance.contentChanged.subscribe((content) =>
            this._localDraftService.saveDraft({
              entityType: 'NOTE',
              entityId: note.id,
              content,
              baseContent: note.content,
            }),
          );
      dialogRef.afterClosed().subscribe(async (res) => {
        contentChangedSub?.unsubscribe();
        if (!this.note) {
          throw new Error('No note');
        }
        // This removes the project note if the note is made empty and saved by the user.
        if (res?.action === 'DELETE') {
          this._noteService.remove(this.note);
          if (!isDraftUnreadable) {
            // The entity is gone — see removeNote() for why this is the one
            // delete the lifecycle keeps.
            this._localDraftService.clearDraft('NOTE', note.id);
          }
        } else if (typeof res === 'string') {
          if (!isDraftUnreadable && res !== note.content) {
            // Persist the draft (baseContent = the still-current note content) and
            // AWAIT it BEFORE dispatching the note update, so a crash in the window
            // between the two leaves a durable draft the next open restores via the
            // baseContent === note.content branch. Best-effort: saveDraft swallows
            // its own write errors, so this resolves even on failure. Bounded, so a
            // stalled drafts DB cannot hold the note update hostage: on timeout
            // the dispatch proceeds and we simply lose the extra crash-safety of
            // the pre-dispatch checkpoint.
            await withDraftIoTimeout(
              this._localDraftService.saveDraft({
                entityType: 'NOTE',
                entityId: note.id,
                content: res,
                baseContent: note.content,
              }),
              undefined,
            );
          }
          // Uses the captured `note`, not `this.note`: the guard above ran before
          // the await, so re-reading the instance field here would be reading it
          // across the suspension point.
          this._noteService.update(note.id, { content: res });
          if (!isDraftUnreadable) {
            // Record that this text was handed to the note, so a later remote
            // change cannot turn it into a spurious "unsaved draft" prompt —
            // but ONLY once the operation behind that update is durably written.
            // The marker is what makes the record inert at read time, so marking
            // a save that was deferred or failed would suppress the only copy of
            // the edit. Unproven durability leaves the draft fully recoverable;
            // nothing is deleted on either path.
            if (
              await withTimeout(
                isDispatchDurable(
                  this._operationWriteFlushService,
                  this._operationCaptureService,
                ),
                false,
                DURABILITY_PROOF_TIMEOUT_MS,
              )
            ) {
              await withDraftIoTimeout(
                this._localDraftService.markSaved('NOTE', note.id, res),
                undefined,
              );
            }
          }
          // Discard — confirmed by the user in the dialog, so the draft is recorded
          // as thrown away (not deleted). Any other result (undefined from a
          // force-close) leaves it untouched and fully recoverable.
        } else if (res?.action === 'DISCARD' && !isDraftUnreadable) {
          await withDraftIoTimeout(
            this._localDraftService.markDiscarded('NOTE', note.id),
            undefined,
          );
        }
      });
    } finally {
      this._openingNoteIds.delete(note.id);
    }
  }

  trackByProjectId(i: number, project: Project): string {
    return project.id;
  }

  moveNoteToProject(projectId: string): void {
    if (projectId === this.note.projectId) {
      return;
    } else {
      this._noteService.moveToOtherProject(this.note, projectId);
    }
  }

  private _updateNoteTxt(): void {
    const LIMIT = 320;
    this.isLongNote = this.note.content.length > LIMIT;
    this.shortenedNote = this.note.content.slice(0, 160) + '\n\n (...)';
    this._updateResolvedContent();
  }

  private async _updateResolvedContent(): Promise<void> {
    const resolved = await this._clipboardImageService.resolveMarkdownImages(
      this.note.content,
    );
    this.resolvedContent.set(resolved);

    if (this.isLongNote && this.shortenedNote) {
      const resolvedShort = await this._clipboardImageService.resolveMarkdownImages(
        this.shortenedNote,
      );
      this.resolvedShortenedContent.set(resolvedShort);
    }
  }
}
