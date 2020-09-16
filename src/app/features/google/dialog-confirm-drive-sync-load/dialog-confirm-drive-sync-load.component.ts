import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { T } from '../../../t.const';

@Component({
  selector: 'dialog-confirm-drive-sync-load',
  templateUrl: './dialog-confirm-drive-sync-load.component.html',
  styleUrls: ['./dialog-confirm-drive-sync-load.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogConfirmDriveSyncLoadComponent {
  T: typeof T = T;

  constructor(
    private _matDialogRef: MatDialogRef<DialogConfirmDriveSyncLoadComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    _matDialogRef.disableClose = true;
  }

  close() {
    this._matDialogRef.close(true);
  }
}
