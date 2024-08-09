import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Note } from '../note.model';
import { NoteService } from '../note.service';
import { MatDialog } from '@angular/material/dialog';
import { T } from '../../../t.const';
import { DialogFullscreenMarkdownComponent } from '../../../ui/dialog-fullscreen-markdown/dialog-fullscreen-markdown.component';
import { Observable, of, ReplaySubject } from 'rxjs';
import { TagComponentTag } from '../../tag/tag/tag.component';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { WorkContextType } from '../../work-context/work-context.model';
import { WorkContextService } from '../../work-context/work-context.service';
import { ProjectService } from '../../project/project.service';
import { Project } from '../../project/project.model';

@Component({
  selector: 'note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteComponent implements OnChanges {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  note!: Note;

  @Input('note') set noteSet(v: Note) {
    this.note = v;
    this._note$.next(v);
  }

  @Input() isFocus?: boolean;

  @ViewChild('markdownEl') markdownEl?: HTMLElement;

  isLongNote?: boolean;
  shortenedNote?: string;

  T: typeof T = T;

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
                      map(
                        (project) =>
                          project && {
                            ...project,
                            icon: 'list',
                          },
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
    switchMap((pid) => this._projectService.getProjectsWithoutId$(pid)),
  );

  constructor(
    private readonly _matDialog: MatDialog,
    private readonly _noteService: NoteService,
    private readonly _projectService: ProjectService,
    private readonly _workContextService: WorkContextService,
  ) {}

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
    this._noteService.remove(this.note);
  }

  togglePinToToday(): void {
    if (!this.note) {
      throw new Error('No note');
    }
    this._noteService.update(this.note.id, {
      isPinnedToToday: !this.note.isPinnedToToday,
    });
  }

  editFullscreen(event: MouseEvent): void {
    if ((event as any)?.target?.tagName?.toUpperCase() === 'A') {
      return;
    }
    if (!this.note) {
      throw new Error('No note');
    }
    this._matDialog
      .open(DialogFullscreenMarkdownComponent, {
        minWidth: '100vw',
        height: '100vh',
        restoreFocus: true,
        data: {
          content: this.note.content,
        },
      })
      .afterClosed()
      .subscribe((content) => {
        if (!this.note) {
          throw new Error('No note');
        }
        if (typeof content === 'string') {
          this._noteService.update(this.note.id, { content });
        }
      });
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
    this.shortenedNote = this.note.content.substr(0, 160) + '\n\n (...)';
  }
}
