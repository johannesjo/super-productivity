import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import {NoteService} from '../note.service';
import {DragulaService} from 'ng2-dragula';
import {Subscription} from 'rxjs';
import {MatButton} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {DialogAddNoteComponent} from '../dialog-add-note/dialog-add-note.component';
import {standardListAnimation} from '../../../ui/animations/standard-list.ani';
import {fadeAnimation} from '../../../ui/animations/fade.ani';
import {Note} from '../note.model';
import {T} from '../../../t.const';

@Component({
  selector: 'notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation, fadeAnimation],

})
export class NotesComponent implements OnInit, OnDestroy {
  @Output() scrollToSidenav = new EventEmitter<void>();

  T = T;
  isElementWasAdded = false;
  isDragOver = false;
  dragEnterTarget: HTMLElement;

  @ViewChild('buttonEl', {static: true}) buttonEl: MatButton;
  private _subs = new Subscription();

  constructor(
    public noteService: NoteService,
    private _dragulaService: DragulaService,
    private _matDialog: MatDialog,
  ) {
  }

  @HostListener('dragenter', ['$event']) onDragEnter(ev: Event) {
    this.dragEnterTarget = ev.target as HTMLElement;
    ev.preventDefault();
    this.isDragOver = true;
  }

  @HostListener('dragleave', ['$event']) onDragLeave(ev: Event) {
    if (this.dragEnterTarget === (ev.target as HTMLElement)) {
      ev.preventDefault();
      this.isDragOver = false;
    }
  }

  @HostListener('drop', ['$event']) onDrop(ev: Event) {
    this.isDragOver = false;
    this.noteService.createFromDrop(ev);
  }

  ngOnInit() {
    this._subs.add(this._dragulaService.dropModel('NOTES')
      .subscribe((params: any) => {
        const {target, source, targetModel, item} = params;
        const targetNewIds = targetModel.map((task) => task.id);
        this.noteService.updateOrder(targetNewIds);
      })
    );

    this._dragulaService.createGroup('NOTES', {
      direction: 'vertical',
      moves: (el, container, handle) => {
        return handle.className.indexOf && handle.className.indexOf('handle-drag') > -1;
      }
    });
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
    this._dragulaService.destroy('NOTES');
  }

  trackById(i: number, note: Note): string {
    return note.id;
  }

  addNote() {
    this._matDialog.open(DialogAddNoteComponent);
  }

  onScrollToSidenavClick() {
    this.scrollToSidenav.emit();
  }
}
