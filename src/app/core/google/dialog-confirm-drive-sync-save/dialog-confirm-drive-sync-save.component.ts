import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

@Component({
  selector: 'dialog-confirm-drive-sync-save',
  templateUrl: './dialog-confirm-drive-sync-save.component.html',
  styleUrls: ['./dialog-confirm-drive-sync-save.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogConfirmDriveSyncSaveComponent {

  constructor(
    private _matDialogRef: MatDialogRef<DialogConfirmDriveSyncSaveComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
  }

  cancel() {
    this._matDialogRef.close();
  }
}
