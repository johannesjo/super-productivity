import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { T } from '../../t.const';

@Component({
  selector: 'dialog-prompt',
  templateUrl: './dialog-prompt.component.html',
  styleUrls: ['./dialog-prompt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogPromptComponent {
  T: typeof T = T;
  txtVal: string = '';

  constructor(
    private _matDialogRef: MatDialogRef<DialogPromptComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
  }

  close(isSave: boolean) {
    if (isSave) {
      this._matDialogRef.close(this.txtVal);
    } else {
      this._matDialogRef.close(null);
    }
  }
}
