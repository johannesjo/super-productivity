import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Reminder } from '../../reminder/reminder.model';
import { Note } from '../note.model';
import { NoteService } from '../note.service';
import { Observable } from 'rxjs';
import { ReminderService } from '../../reminder/reminder.service';

@Component({
  selector: 'dialog-view-note-reminder',
  templateUrl: './dialog-view-note-reminder.component.html',
  styleUrls: ['./dialog-view-note-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogViewNoteReminderComponent implements OnInit {
  note$: Observable<Note> = this._noteService.getById(this.data.reminder.relatedId);

  private _reminder: Reminder;

  constructor(
    private _matDialogRef: MatDialogRef<DialogViewNoteReminderComponent>,
    private _noteService: NoteService,
    private _reminderService: ReminderService,
    @Inject(MAT_DIALOG_DATA) public data: { reminder: Reminder },
  ) {
    this._matDialogRef.disableClose = true;
    this._reminder = this.data.reminder;
  }

  ngOnInit() {

  }

  dismiss() {
    this._noteService.update(this._reminder.relatedId, {
      reminderId: null,
    });
    this._reminderService.removeReminder(this._reminder.id);
    this.close();
  }

  snooze() {
    this._reminderService.updateReminder(this._reminder.id, {
      remindAt: Date.now() + (10 * 60 * 1000)
    });
    this.close();
  }

  close() {
    this._matDialogRef.close();
  }
}
