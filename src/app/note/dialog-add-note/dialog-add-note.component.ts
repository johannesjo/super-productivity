import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { NoteService } from '../note.service';
import { Reminder } from '../../reminder/reminder.model';

const NOTE_TMP_STORAGE_KEY = 'SP_NOTE_TMP_EDIT';

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
    this.noteContent = sessionStorage.getItem(NOTE_TMP_STORAGE_KEY);
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
    this._clearSessionStorage();
    this.close();
  }

  saveTmp() {
    sessionStorage.setItem(NOTE_TMP_STORAGE_KEY, this.noteContent);
  }

  close() {
    this._matDialogRef.close();
  }

  private _clearSessionStorage() {
    sessionStorage.setItem(NOTE_TMP_STORAGE_KEY, '');
  }
}
