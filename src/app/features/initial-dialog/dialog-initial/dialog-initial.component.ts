import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { InitialDialogResponse } from '../initial-dialog.model';
import { T } from 'src/app/t.const';
import { version } from '../../../../../package.json';

@Component({
  selector: 'dialog-initial',
  templateUrl: './dialog-initial.component.html',
  styleUrls: ['./dialog-initial.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogInitialComponent {
  T: typeof T = T;
  version: string = version;

  constructor(
    private _matDialogRef: MatDialogRef<DialogInitialComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InitialDialogResponse,
  ) {
  }

  close() {
    this._matDialogRef.close();
  }
}
