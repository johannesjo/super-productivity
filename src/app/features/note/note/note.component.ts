import { ChangeDetectionStrategy, Component, Input, ViewChild } from '@angular/core';
import { Note } from '../note.model';
import { NoteService } from '../note.service';
import { MatDialog } from '@angular/material/dialog';
import { T } from '../../../t.const';
import { DialogFullscreenMarkdownComponent } from '../../../ui/dialog-fullscreen-markdown/dialog-fullscreen-markdown.component';
import { Tag } from '../../tag/tag.model';
import { Observable, of } from 'rxjs';
import { TagComponentTag } from '../../tag/tag/tag.component';
import { map, switchMap } from 'rxjs/operators';
import { WorkContextType } from '../../work-context/work-context.model';
import { WorkContextService } from '../../work-context/work-context.service';
import { ProjectService } from '../../project/project.service';

@Component({
  selector: 'note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteComponent {
  @Input() note?: Note;
  @Input() isFocus?: boolean;

  @ViewChild('markdownEl') markdownEl?: HTMLElement;
  fakeTag: Partial<Tag> = {
    id: 'fa',
    color: '#ff00dd',
    title: 'Super Productivity',
  };
  T: typeof T = T;

  projectTag$: Observable<TagComponentTag | null> =
    this._workContextService.activeWorkContextTypeAndId$.pipe(
      switchMap(({ activeType }) =>
        activeType === WorkContextType.TAG && this.note!.projectId
          ? this._projectService.getByIdOnce$(this.note!.projectId).pipe(
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
    );

  constructor(
    private readonly _matDialog: MatDialog,
    private readonly _noteService: NoteService,
    private readonly _projectService: ProjectService,
    private readonly _workContextService: WorkContextService,
  ) {}

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

  editFullscreen(): void {
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
}
