import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  ViewChild,
} from '@angular/core';
import { NoteService } from '../note.service';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { DialogAddNoteComponent } from '../dialog-add-note/dialog-add-note.component';
import { standardListAnimation } from '../../../ui/animations/standard-list.ani';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { Note } from '../note.model';
import { T } from '../../../t.const';
import { WorkContextService } from '../../work-context/work-context.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { moveItemInArray } from '../../../util/move-item-in-array';

@Component({
  selector: 'notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation, fadeAnimation],
  standalone: false,
})
export class NotesComponent {
  T: typeof T = T;
  isElementWasAdded: boolean = false;
  isDragOver: boolean = false;
  dragEnterTarget?: HTMLElement;

  @ViewChild('buttonEl', { static: true }) buttonEl?: MatButton;

  constructor(
    public noteService: NoteService,
    public workContextService: WorkContextService,
    private _matDialog: MatDialog,
  ) {}

  @HostListener('dragenter', ['$event']) onDragEnter(ev: DragEvent): void {
    this.dragEnterTarget = ev.target as HTMLElement;
    ev.preventDefault();
    this.isDragOver = true;
  }

  @HostListener('dragleave', ['$event']) onDragLeave(ev: DragEvent): void {
    if (this.dragEnterTarget === (ev.target as HTMLElement)) {
      ev.preventDefault();
      this.isDragOver = false;
    }
  }

  @HostListener('drop', ['$event']) onDrop(ev: DragEvent): void {
    this.isDragOver = false;
    this.noteService.createFromDrop(ev);
  }

  drop(event: CdkDragDrop<Note[] | null>): void {
    const previousIndex = event.previousIndex;
    const currentIndex = event.currentIndex;
    const notes = event.container.data;

    if (!notes) {
      return;
    }

    // console.log(event);
    // console.log(
    //   previousIndex,
    //   currentIndex,
    //   moveItemInArray(notes, previousIndex, currentIndex).map((note) => note.id),
    // );

    this.noteService.updateOrder(
      moveItemInArray(notes, previousIndex, currentIndex).map((note) => note.id),
    );
  }

  trackById(i: number, note: Note): string {
    return note.id;
  }

  addNote(): void {
    this._matDialog.open(DialogAddNoteComponent, {
      minWidth: '100vw',
      height: '100vh',
      restoreFocus: true,
    });
  }
}
