import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { T } from 'src/app/t.const';
import * as moment from 'moment';
import { DialogConflictResolutionResult } from '../sync.model';

@Component({
  selector: 'dialog-sync-conflict',
  templateUrl: './dialog-sync-conflict.component.html',
  styleUrls: ['./dialog-sync-conflict.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogSyncConflictComponent {
  T: typeof T = T;

  remote: string = this._formatDate(this.data.remote);
  local: string = this._formatDate(this.data.local);
  lastSync: string = this._formatDate(this.data.lastSync);

  constructor(
    private _matDialogRef: MatDialogRef<DialogSyncConflictComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      remote: number;
      local: number;
      lastSync: number;
    }
  ) {
    _matDialogRef.disableClose = true;
  }

  close(res?: DialogConflictResolutionResult) {
    this._matDialogRef.close(res);
  }

  private _formatDate(date: Date | string | number) {
    return moment(date).format('DD-MM-YYYY --- hh:mm:ss');
  }
}
