import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

@Component({
  selector: 'dialog-migrate',
  templateUrl: './dialog-migrate.component.html',
  styleUrls: ['./dialog-migrate.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogMigrateComponent {
  constructor(
    private _matDialogRef: MatDialogRef<DialogMigrateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
  }

  close(selection?: any) {
    this._matDialogRef.close(selection);
  }
}
