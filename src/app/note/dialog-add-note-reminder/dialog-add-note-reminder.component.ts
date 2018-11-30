import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Note } from '../note.model';
import { NoteService } from '../note.service';
import { ReminderCopy } from '../../reminder/reminder.model';
import { ReminderService } from '../../reminder/reminder.service';
import { SnackService } from '../../core/snack/snack.service';

@Component({
  selector: 'dialog-add-note-reminder',
  templateUrl: './dialog-add-note-reminder.component.html',
  styleUrls: ['./dialog-add-note-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogAddNoteReminderComponent {
  public date: string;
  public title: string;
  public isEdit: boolean;
  public reminder: ReminderCopy;
  public note: Note;

  constructor(
    private _noteService: NoteService,
    private _snackService: SnackService,
    private _reminderService: ReminderService,
    private _matDialogRef: MatDialogRef<DialogAddNoteReminderComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { note: Note },
  ) {
    this.note = this.data.note;
    this.reminder = this.note.reminderId && {
      ...this._reminderService.getById(this.data.note.reminderId)
    };
    this.isEdit = !!(this.reminder && this.reminder.id);
    if (this.isEdit) {
      this.date = this._convertDate(new Date(this.reminder.remindAt));
      this.title = this.reminder.title;
    } else {
      const offset = new Date().getTimezoneOffset();
      const date = new Date(Date.now() - (offset * 1000 * 60));
      date.setSeconds(0, 0);
      this.date = this._convertDate(date);
      this.title = this.note.content.substr(0, 40);
    }
  }

  // TODO check why we're off by one hour
  private _convertDate(date: Date): string {
    const isoStr = date.toISOString();
    return isoStr.substring(0, isoStr.length - 1);
  }


  save() {
    if (this.isEdit) {
      this._noteService.updateReminder(
        this.note.id,
        this.reminder.id,
        new Date(this.date).getTime(),
        this.title,
      );
      this.close();
    } else {
      this._noteService.addReminder(
        this.note.id,
        new Date(this.date).getTime(),
        this.title,
      );
      this.close();
    }
  }

  remove() {
    this._noteService.removeReminder(this.note.id, this.reminder.id);
    this.close();
  }

  close() {
    this._matDialogRef.close();
  }
}
