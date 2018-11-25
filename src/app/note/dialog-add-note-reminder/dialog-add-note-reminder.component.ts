import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Note } from '../note.model';

@Component({
  selector: 'dialog-add-note-reminder',
  templateUrl: './dialog-add-note-reminder.component.html',
  styleUrls: ['./dialog-add-note-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogAddNoteReminderComponent {
  constructor(
    private _matDialogRef: MatDialogRef<DialogAddNoteReminderComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { note: Note },
  ) {
  }

  close(isConfirm: boolean) {
    this._matDialogRef.close(isConfirm);
  }
}
