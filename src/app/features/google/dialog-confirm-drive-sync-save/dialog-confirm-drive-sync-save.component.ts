import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { T } from '../../../t.const';

@Component({
  selector: 'dialog-confirm-drive-sync-save',
  templateUrl: './dialog-confirm-drive-sync-save.component.html',
  styleUrls: ['./dialog-confirm-drive-sync-save.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogConfirmDriveSyncSaveComponent {
  T: typeof T = T;

  constructor(
    private _matDialogRef: MatDialogRef<DialogConfirmDriveSyncSaveComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    _matDialogRef.disableClose = true;
  }

  close() {
    this._matDialogRef.close();
  }
}
