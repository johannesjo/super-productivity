import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { NoteService } from '../note.service';
import { DragulaService } from 'ng2-dragula';
import { Subscription } from 'rxjs';

@Component({
  selector: 'notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotesComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

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
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  addNote() {
    this.noteService.add();
  }
}
