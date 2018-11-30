import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { NoteService } from '../note.service';
import { Reminder } from '../../reminder/reminder.model';

@Component({
  selector: 'dialog-add-note',
  templateUrl: './dialog-add-note.component.html',
  styleUrls: ['./dialog-add-note.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogAddNoteComponent {
  noteContent: string;
  reminderDate: string;

  constructor(
    private _matDialogRef: MatDialogRef<DialogAddNoteComponent>,
    private _noteService: NoteService,
    @Inject(MAT_DIALOG_DATA) public data: { reminder: Reminder },
  ) {
    this._matDialogRef.disableClose = true;
  }

  submit() {
    console.log(this.reminderDate);
    // TODO not working yet
    const remindAt = this.reminderDate && new Date(this.reminderDate).getTime();

    this._noteService.add(
      {content: this.noteContent},
      remindAt,
      true,
    );
    this.close();
  }

  close() {
    this._matDialogRef.close();
  }

}
