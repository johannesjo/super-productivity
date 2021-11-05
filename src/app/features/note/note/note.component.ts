import { ChangeDetectionStrategy, Component, Input, ViewChild } from '@angular/core';
import { Note } from '../note.model';
import { NoteService } from '../note.service';
import { MatDialog } from '@angular/material/dialog';
import { T } from '../../../t.const';
import { DialogFullscreenMarkdownComponent } from '../../../ui/dialog-fullscreen-markdown/dialog-fullscreen-markdown.component';
import { Tag } from '../../tag/tag.model';

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

  constructor(
    private readonly _matDialog: MatDialog,
    private readonly _noteService: NoteService,
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
