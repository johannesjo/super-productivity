import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NoteService } from '../note.service';
import { DragulaService } from 'ng2-dragula';
import { Subscription } from 'rxjs';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { DialogAddNoteComponent } from '../dialog-add-note/dialog-add-note.component';
import { standardListAnimation } from '../../../ui/animations/standard-list.ani';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { Note } from '../note.model';
import { T } from '../../../t.const';
import { Task } from '../../tasks/task.model';
import { WorkContextService } from '../../work-context/work-context.service';

@Component({
  selector: 'notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation, fadeAnimation],
})
export class NotesComponent implements OnInit, OnDestroy {
  T: typeof T = T;
  isElementWasAdded: boolean = false;
  isDragOver: boolean = false;
  dragEnterTarget?: HTMLElement;

  @ViewChild('buttonEl', { static: true }) buttonEl?: MatButton;
  private _subs: Subscription = new Subscription();

  constructor(
    public noteService: NoteService,
    public workContextService: WorkContextService,
    private _dragulaService: DragulaService,
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

  ngOnInit(): void {
    this._subs.add(
      this._dragulaService.dropModel('NOTES').subscribe(({ targetModel }: any) => {
        // const {target, source, targetModel, item} = params;
        const targetNewIds = targetModel.map((task: Task) => task.id);
        this.noteService.updateOrder(targetNewIds);
      }),
    );

    this._dragulaService.createGroup('NOTES', {
      direction: 'vertical',
      moves: (el, container, handle) => {
        return (
          !!handle &&
          handle.className.indexOf &&
          handle.className.indexOf('handle-drag') > -1
        );
      },
    });
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
    this._dragulaService.destroy('NOTES');
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
  saveNote(): void {
    this._matDialog.open(DialogAddNoteComponent, {
      minWidth: '100vw',
      height: '100vh',
      restoreFocus: true,
    });
  }
}
