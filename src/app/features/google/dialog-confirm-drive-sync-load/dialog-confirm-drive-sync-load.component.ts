import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'dialog-confirm-drive-sync-load',
  templateUrl: './dialog-confirm-drive-sync-load.component.html',
  styleUrls: ['./dialog-confirm-drive-sync-load.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogConfirmDriveSyncLoadComponent {

  constructor(
    private _matDialogRef: MatDialogRef<DialogConfirmDriveSyncLoadComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
  }

  close() {
    this._matDialogRef.close();
  }
}
