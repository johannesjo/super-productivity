import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { Note } from '../note.model';

@Component({
  selector: 'note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoteComponent implements OnInit {
  @Input() note: Note;

  constructor() {
  }

  ngOnInit() {
  }

}
