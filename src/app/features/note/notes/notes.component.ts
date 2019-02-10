import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NoteService } from '../note.service';
import { DragulaService } from 'ng2-dragula';
import { Subscription } from 'rxjs';
import { MatButton, MatDialog } from '@angular/material';
import { DialogAddNoteComponent } from '../dialog-add-note/dialog-add-note.component';
import { standardListAnimation } from '../../../ui/animations/standard-list.ani';
import { fadeAnimation } from '../../../ui/animations/fade.ani';

@Component({
  selector: 'notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation, fadeAnimation],

})
export class NotesComponent implements OnInit, OnDestroy {
  isElementWasAdded = false;
  isDragOver = false;
  dragEnterTarget: HTMLElement;

  @ViewChild('buttonEl') buttonEl: MatButton;
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
    if (this.dragEnterTarget === (event.target as HTMLElement)) {
      event.preventDefault();
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
      moves: function (el, container, handle) {
        // console.log('moves sub', handle.className, handle.className.indexOf('handle-sub') > -1);
        return handle.className.indexOf && handle.className.indexOf('handle-drag') > -1;
      }
    });

    let isFirst = true;
    this._subs.add(this.noteService.isShowNotes$.subscribe((isShow) => {
      if (isShow && !isFirst) {
        // timeout needs to be longer than animation
        setTimeout(() => {
          this.buttonEl._elementRef.nativeElement.focus();
        }, 200);
      }
      isFirst = false;
    }));
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  addNote() {
    this._matDialog.open(DialogAddNoteComponent);
  }
}
