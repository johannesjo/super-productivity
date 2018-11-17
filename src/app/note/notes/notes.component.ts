import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { NoteService } from '../note.service';

@Component({
  selector: 'notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotesComponent implements OnInit {

  constructor(
    public noteService: NoteService,
  ) {
  }

  ngOnInit() {
    console.log(this.noteService);

  }

  addNote() {
    this.noteService.addNote();
  }
}
