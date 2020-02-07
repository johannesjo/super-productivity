import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {T} from '../../t.const';

@Component({
  selector: 'dialog-fullscreen-markdown',
  templateUrl: './dialog-fullscreen-markdown.component.html',
  styleUrls: ['./dialog-fullscreen-markdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogFullscreenMarkdownComponent {
  T = T;

  constructor(
    private _matDialogRef: MatDialogRef<DialogFullscreenMarkdownComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
  }

  close(isSave: boolean) {
    this._matDialogRef.close(isSave && this.data.content);
  }
}
