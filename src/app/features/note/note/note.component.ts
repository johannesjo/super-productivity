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
  DRAFT_IO_TIMEOUT_MS,
  DRAFT_LOAD_ERROR,
  getDraftOpenAction,
  LocalDraftService,
} from '../../../core/draft/local-draft.service';
import { withTimeout } from '../../../util/promise-timeout';
import { isDispatchDurable } from '../../../core/draft/draft-durability.util';
import { OperationWriteFlushService } from '../../../op-log/sync/operation-write-flush.service';
import { OperationCaptureService } from '../../../op-log/capture/operation-capture.service';
import { Log } from '../../../core/log';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { RenderLinksPipe } from '../../../ui/pipes/render-links.pipe';
import { isPathSafeToOpen } from '../../../../../electron/shared-with-frontend/is-external-url-allowed';

/**
 * Bound on the durability proof. Deliberately far larger than the drafts-DB
 * budget ({@link DRAFT_IO_TIMEOUT_MS}): that one races a local get/put, this one
 * waits for the write queue to drain AND for the op-log lock, which sync
 * legitimately holds for seconds at a time. Reusing the 2s budget would report
 * ordinary saves as unproven on a busy or slow device, and every one of those
 * costs a spurious recovery prompt — the exact thing the marker exists to
 * prevent.
 *
 * It still needs a bound: flushThenRunExclusive can take up to five attempts at
 * a 30s drain plus a lock acquisition, and there is no reason to hold this
 * closure (and the note content it captures) alive that long. Timing out means
 * the draft stays recoverable, which is the same safe direction every other
 * failure here takes.
 */
const DURABILITY_PROOF_TIMEOUT_MS = 15000;

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
            // Scoped to the text that was actually shown in the prompt: if a
            // concurrent session checkpointed something newer under this key
            // while the prompt was open, that newer text is not what the user
            // rejected, and it stays live.
            await withDraftIoTimeout(
              this._localDraftService.markDiscarded('NOTE', note.id, draft.content),
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
      // Whether this session may have left a row under this key, which is what
      // decides if the close path has to checkpoint. See the save branch below.
      let hasDraftRow = !!draft;
      // Checkpoint the editor contents locally so they survive a crash.
      const contentChangedSub = isDraftUnreadable
        ? undefined
        : dialogRef.componentInstance.contentChanged.subscribe((content) => {
            hasDraftRow = true;
            this._localDraftService.saveDraft({
              entityType: 'NOTE',
              entityId: note.id,
              content,
              baseContent: note.content,
            });
          });
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
          if (!isDraftUnreadable && (hasDraftRow || res !== note.content)) {
            // Persist the draft (baseContent = the still-current note content) and
            // AWAIT it BEFORE dispatching the note update, so a crash in the window
            // between the two leaves a durable draft the next open restores via the
            // baseContent === note.content branch. Best-effort: saveDraft swallows
            // its own write errors, so this resolves even on failure. Bounded, so a
            // stalled drafts DB cannot hold the note update hostage: on timeout
            // the dispatch proceeds and we simply lose the extra crash-safety of
            // the pre-dispatch checkpoint.
            //
            // Runs even when `res` already equals the note content, as long as a
            // row may exist. Skipping it there looks free — "the note already
            // holds this text" — but the stored row only holds it too if a
            // checkpoint landed AFTER the edit was reverted, and the close path
            // deliberately emits no contentChanged. Revert inside the 500ms
            // debounce and the row still holds the newer text, so the scoped
            // markSaved() below no-ops against it and leaves a live draft that the
            // next open silently RESTOREs over the note (#8982 review).
            //
            // Gated on a row possibly existing so that merely VIEWING a note
            // fullscreen and pressing Escape does not create one. Such a row would
            // hold a full copy of the note for the 14-day retention window, and
            // while durability stays unproven (markSaved skipped) a later remote
            // edit would turn it into a spurious "unsaved draft" prompt offering
            // the note's own stale text back.
            //
            // Where a row can exist, the invariant holds: the stored text is
            // always the text that was dispatched, so the marker's scope matches.
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
        } else if (
          res?.action === 'DISCARD' &&
          !isDraftUnreadable &&
          typeof res.content === 'string'
        ) {
          // Marker only: NEVER checkpoint on the way out here. Writing the
          // editor's final text first would make the scope below always match,
          // but the row it writes carries `baseContent: note.content`, so if the
          // marker then failed to land (crash between the two awaits, a swallowed
          // IDB error, the 2s bound) `getDraftOpenAction` would hit its
          // `baseContent === entityContent` branch and SILENTLY restore the text
          // the user just threw away. Two non-atomic writes cannot be made safe
          // here; one write can (#8982 review).
          //
          // The cost is that a discard confirmed within the 500ms debounce can
          // miss the stored row and leave it live. That is the documented safe
          // direction (a prompt, or a restore of the user's own text from a
          // second earlier), and it is rare because a modified discard goes
          // through a confirmation dialog, which takes longer than the debounce.
          //
          // `content` is required rather than defaulted: synthesizing
          // `note.content` for a result that carries none would checkpoint the
          // note over the draft and then successfully mark it, destroying
          // unsaved text on a path meant to be conservative.
          await withDraftIoTimeout(
            this._localDraftService.markDiscarded('NOTE', note.id, res.content),
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
