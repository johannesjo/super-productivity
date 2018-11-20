import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { NoteService } from '../note.service';
import { DragulaService } from 'ng2-dragula';
import { Subscription } from 'rxjs';
import { NoteComponent } from '../note/note.component';

@Component({
  selector: 'notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotesComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();
  isElementWasAdded = false;
  @ViewChildren(NoteComponent) noteEls: QueryList<NoteComponent>;

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
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  addNote() {
    this.noteService.add();
  }
}
