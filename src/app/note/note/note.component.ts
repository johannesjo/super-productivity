import { ChangeDetectionStrategy, Component, Input, OnInit, ViewChild } from '@angular/core';
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
  @Input() isFocus: boolean;

  @ViewChild('markdownEl') markdownEl: HTMLElement;

  constructor(private _noteService: NoteService) {
  }

  ngOnInit() {
  }

  toggleLock() {
    this._noteService.update(this.note.id, {isLock: !this.note.isLock});
  }

  updateContent(newVal) {
    this._noteService.update(this.note.id, {content: newVal.newVal});
  }

  removeNote() {
    this._noteService.remove(this.note.id);
  }
}
