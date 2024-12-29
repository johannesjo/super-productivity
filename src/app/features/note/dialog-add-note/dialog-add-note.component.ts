import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { SS } from '../../../core/persistence/storage-keys.const';
import { T } from '../../../t.const';
import { DialogFullscreenMarkdownComponent } from '../../../ui/dialog-fullscreen-markdown/dialog-fullscreen-markdown.component';
import { NoteService } from '../note.service';

@Component({
  // selector: 'dialog-add-note',
  selector: 'dialog-fullscreen-markdown',
  templateUrl:
    '../../../ui/dialog-fullscreen-markdown/dialog-fullscreen-markdown.component.html',
  styleUrls: [
    '../../../ui/dialog-fullscreen-markdown/dialog-fullscreen-markdown.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DialogAddNoteComponent
  extends DialogFullscreenMarkdownComponent
  implements OnDestroy
{
  override _matDialogRef: MatDialogRef<DialogAddNoteComponent>;
  private _noteService = inject(NoteService);

  override T: typeof T = T;
  override data: { content: string };

  constructor() {
    const _matDialogRef = inject<MatDialogRef<DialogAddNoteComponent>>(MatDialogRef);

    const data = { content: sessionStorage.getItem(SS.NOTE_TMP) || '' };
    super();
    this._matDialogRef = _matDialogRef;

    this.data = data;
  }

  override close(isSkipSave: boolean = false): void {
    if (!isSkipSave && this.data.content && this.data.content.trim().length > 0) {
      this._noteService.add({ content: this.data.content }, true);
      this._clearSessionStorage();
    }
    this._matDialogRef.close();
  }

  override ngModelChange(val: string = this.data.content || ''): void {
    sessionStorage.setItem(SS.NOTE_TMP, val);
  }

  private _clearSessionStorage(): void {
    sessionStorage.setItem(SS.NOTE_TMP, '');
  }
}
