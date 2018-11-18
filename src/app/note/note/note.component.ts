import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { Note } from '../note.model';
import { NoteService } from '../note.service';

@Component({
  selector: 'note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoteComponent implements OnInit {
  @Input() note: Note;

  constructor(private _noteService: NoteService) {
  }

  ngOnInit() {
  }

  updateContent(newVal) {
    this._noteService.update(this.note.id, {content: newVal.newVal});
  }

}
