import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Reminder } from '../../reminder/reminder.model';
import { ReminderService } from '../../reminder/reminder.service';
import { Note } from '../note.model';
import { NoteService } from '../note.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'dialog-view-note-reminder',
  templateUrl: './dialog-view-note-reminder.component.html',
  styleUrls: ['./dialog-view-note-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogViewNoteReminderComponent implements OnInit {
  note$: Observable<Note> = this._noteService.getById(this.data.reminder.relatedId);

  constructor(
    private _matDialogRef: MatDialogRef<DialogViewNoteReminderComponent>,
    private _reminderService: ReminderService,
    private _noteService: NoteService,
    @Inject(MAT_DIALOG_DATA) public data: { reminder: Reminder },
  ) {
    this._matDialogRef.disableClose = true;
  }

  ngOnInit() {
  }
}
