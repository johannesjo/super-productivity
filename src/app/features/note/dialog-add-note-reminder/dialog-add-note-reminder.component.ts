import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Note } from '../note.model';
import { NoteService } from '../note.service';
import { ReminderCopy } from '../../reminder/reminder.model';
import { ReminderService } from '../../reminder/reminder.service';
import { T } from '../../../t.const';
import { throttle } from 'helpful-decorators';

@Component({
  selector: 'dialog-add-note-reminder',
  templateUrl: './dialog-add-note-reminder.component.html',
  styleUrls: ['./dialog-add-note-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogAddNoteReminderComponent {
  T: typeof T = T;
  dateTime?: number;
  title: string;
  isEdit: boolean;
  reminder?: ReminderCopy | null;
  note: Note;

  constructor(
    private _noteService: NoteService,
    private _reminderService: ReminderService,
    private _matDialogRef: MatDialogRef<DialogAddNoteReminderComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { note: Note },
  ) {
    this.note = this.data.note;
    this.reminder = this.note.reminderId
      ? this._reminderService.getById(this.data.note.reminderId as string)
      : null;
    this.isEdit = !!(this.reminder && this.reminder.id);
    if (this.isEdit && this.reminder) {
      this.dateTime = this.reminder.remindAt;
      this.title = this.reminder.title;
    } else {
      this.title = this.note.content.substr(0, 40);
    }
  }

  // NOTE: throttle is used as quick way to prevent multiple submits
  @throttle(2000, {leading: true, trailing: false})
  save() {
    const timestamp = this.dateTime;

    if (!timestamp || !this.title) {
      return;
    }

    if (this.isEdit && this.reminder) {
      this._noteService.updateReminder(
        this.note.id,
        this.reminder.id,
        timestamp,
        this.title,
      );
      this.close();
    } else {
      this._noteService.addReminder(
        this.note.id,
        timestamp,
        this.title,
      );
      this.close();
    }
  }

  // NOTE: throttle is used as quick way to prevent multiple submits
  @throttle(2000, {leading: true, trailing: false})
  remove() {
    if (!this.reminder) {
      throw new Error('No reminder');
    }
    this._noteService.removeReminder(this.note.id, this.reminder.id);
    this.close();
  }

  close() {
    this._matDialogRef.close();
  }
}
