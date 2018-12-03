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
  isSubmitted = false;

  constructor(
    private _matDialogRef: MatDialogRef<DialogAddNoteComponent>,
    private _noteService: NoteService,
    @Inject(MAT_DIALOG_DATA) public data: { reminder: Reminder },
  ) {
    this.noteContent = sessionStorage.getItem(NOTE_TMP_STORAGE_KEY) || '';
  }

  keydownHandler(ev: KeyboardEvent) {
    if (ev.key === 'Enter' && ev.ctrlKey) {
      this.submit();
    }
  }

  submit() {
    const remindAt = this.reminderDate && new Date(this.reminderDate).getTime();

    if (!this.isSubmitted
      && (this.noteContent && this.noteContent.trim().length > 0
        || remindAt)) {
      this._noteService.add(
        {content: this.noteContent},
        remindAt,
        true,
      );

      this.isSubmitted = true;
      this._clearSessionStorage();
      this.close();
    }
  }


  close() {
    this._matDialogRef.close();
  }

  saveTmp(val = this.noteContent || '') {
    sessionStorage.setItem(NOTE_TMP_STORAGE_KEY, val);
  }

  private _clearSessionStorage() {
    sessionStorage.setItem(NOTE_TMP_STORAGE_KEY, '');
  }
}
