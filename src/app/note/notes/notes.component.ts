import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NoteService } from '../note.service';
import { DragulaService } from 'ng2-dragula';
import { Subscription } from 'rxjs';
import { MatButton } from '@angular/material';

@Component({
  selector: 'notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotesComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();
  isElementWasAdded = false;
  @ViewChild('buttonEl') buttonEl: MatButton;

  constructor(
    public noteService: NoteService,
    private _dragulaService: DragulaService,
  ) {
  }

  ngOnInit() {
    this._subs.add(this._dragulaService.dropModel('NOTES')
      .subscribe((params: any) => {
        const {target, source, targetModel, item} = params;
        const targetNewIds = targetModel.map((task) => task.id);
        this.noteService.updateOrder(targetNewIds);
      })
    );

    // Hacky but probably more performant
    this._subs.add(this.noteService.onNoteAdd$.subscribe((val) => {
      this.isElementWasAdded = true;
    }));

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
    this.noteService.add();
  }
}
