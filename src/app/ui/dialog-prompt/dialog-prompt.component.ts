import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { T } from '../../t.const';

@Component({
  selector: 'dialog-prompt',
  templateUrl: './dialog-prompt.component.html',
  styleUrls: ['./dialog-prompt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DialogPromptComponent {
  private _matDialogRef = inject<MatDialogRef<DialogPromptComponent>>(MatDialogRef);
  data = inject(MAT_DIALOG_DATA);

  T: typeof T = T;
  txtVal: string = '';

  close(isSave: boolean): void {
    if (isSave) {
      this._matDialogRef.close(this.txtVal);
    } else {
      this._matDialogRef.close(undefined);
    }
  }
}
