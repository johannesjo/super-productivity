import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { NoteService } from '../note.service';
import { SS } from '../../../core/persistence/storage-keys.const';
import { T } from '../../../t.const';
import { WorkContextService } from '../../work-context/work-context.service';

@Component({
  selector: 'dialog-add-note',
  templateUrl: './dialog-add-note.component.html',
  styleUrls: ['./dialog-add-note.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogAddNoteComponent {
  T: typeof T = T;
  noteContent: string;
  isSubmitted: boolean = false;

  constructor(
    private _matDialogRef: MatDialogRef<DialogAddNoteComponent>,
    private _noteService: NoteService,
    private _workContextService: WorkContextService,
  ) {
    this.noteContent = sessionStorage.getItem(SS.NOTE_TMP) || '';
  }

  keydownHandler(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' && ev.ctrlKey) {
      this.submit();
    }
  }

  submit(): void {
    if (!this.isSubmitted && this.noteContent && this.noteContent.trim().length > 0) {
      this._noteService.add({ content: this.noteContent }, true);

      this.isSubmitted = true;
      this._clearSessionStorage();
      this.close();
    }
  }

  close(): void {
    this._matDialogRef.close();
  }

  saveTmp(val: string = this.noteContent || ''): void {
    sessionStorage.setItem(SS.NOTE_TMP, val);
  }

  private _clearSessionStorage(): void {
    sessionStorage.setItem(SS.NOTE_TMP, '');
  }
}
