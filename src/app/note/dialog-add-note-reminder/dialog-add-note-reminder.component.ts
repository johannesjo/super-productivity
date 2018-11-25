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
    } else {
      this.date = this._convertDate(new Date());
    }
  }

  // TODO check why we're off by one hour
  private _convertDate(date: Date): string {
    const isoStr = date.toISOString();
    return isoStr.substring(0, isoStr.length - 1);
  }

  save() {
    if (this.isEdit) {
      this._reminderService.updateReminder(this.reminder);
      this._snackService.open({
        type: 'SUCCESS',
        message: `Updated reminder for note`,
        icon: 'schedule',
      });
      this.close();
    } else {
      const reminderId = this._reminderService.addReminder(
        'NOTE',
        this.note.id,
        new Date(this.date).getTime()
      );
      this._noteService.update(this.note.id, {reminderId});
      this._snackService.open({
        type: 'SUCCESS',
        message: `Added reminder ${this.reminder.id} for note`,
        icon: 'schedule',
      });
      this.close();
    }
  }

  remove() {
    this._reminderService.removeReminder(this.reminder.id);
    this._noteService.update(this.note.id, {reminderId: null});
    this._snackService.open({
      type: 'SUCCESS',
      message: `Deleted reminder ${this.reminder.id} for note`,
      icon: 'schedule',
    });
    this.close();
  }

  close() {
    this._matDialogRef.close();
  }
}
