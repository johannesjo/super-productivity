import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { NoteService } from '../note.service';
import { SS_NOTE_TMP } from '../../../core/persistence/ls-keys.const';
import { T } from '../../../t.const';
import { WorkContextService } from '../../work-context/work-context.service';
import { Observable } from 'rxjs';
import { WorkContextType } from '../../work-context/work-context.model';
import { map } from 'rxjs/operators';

@Component({
  selector: 'dialog-add-note',
  templateUrl: './dialog-add-note.component.html',
  styleUrls: ['./dialog-add-note.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogAddNoteComponent {
  T: typeof T = T;
  noteContent: string;
  isSubmitted: boolean = false;
  isInProjectContext$: Observable<boolean> = this._workContextService.activeWorkContextTypeAndId$.pipe(
    map(({activeType}) => activeType === WorkContextType.PROJECT)
  );

  constructor(
    private _matDialogRef: MatDialogRef<DialogAddNoteComponent>,
    private _noteService: NoteService,
    private _workContextService: WorkContextService,
  ) {
    this.noteContent = sessionStorage.getItem(SS_NOTE_TMP) || '';
  }

  keydownHandler(ev: KeyboardEvent) {
    if (ev.key === 'Enter' && ev.ctrlKey) {
      this.submit();
    }
  }

  submit() {
    if (!this.isSubmitted
      && (this.noteContent && this.noteContent.trim().length > 0)) {
      this._noteService.add(
        {content: this.noteContent},
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

  saveTmp(val: string = this.noteContent || '') {
    sessionStorage.setItem(SS_NOTE_TMP, val);
  }

  private _clearSessionStorage() {
    sessionStorage.setItem(SS_NOTE_TMP, '');
  }
}
