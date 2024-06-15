import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import {
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
  MatLegacyDialogRef as MatDialogRef,
} from '@angular/material/legacy-dialog';
import { T } from '../../t.const';

@Component({
  selector: 'dialog-prompt',
  templateUrl: './dialog-prompt.component.html',
  styleUrls: ['./dialog-prompt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogPromptComponent {
  T: typeof T = T;
  txtVal: string = '';

  constructor(
    private _matDialogRef: MatDialogRef<DialogPromptComponent>,
    // TODO rename data.placeholder to data.label
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  close(isSave: boolean): void {
    if (isSave) {
      this._matDialogRef.close(this.txtVal);
    } else {
      this._matDialogRef.close(undefined);
    }
  }
}
