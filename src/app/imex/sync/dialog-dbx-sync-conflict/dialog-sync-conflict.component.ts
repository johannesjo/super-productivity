import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { T } from 'src/app/t.const';
import * as moment from 'moment';
import { DialogConflictResolutionResult } from '../sync.model';

@Component({
  selector: 'dialog-sync-conflict',
  templateUrl: './dialog-sync-conflict.component.html',
  styleUrls: ['./dialog-sync-conflict.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogSyncConflictComponent {
  T: typeof T = T;

  remoteDate: string = this._formatDate(this.data.remote);
  localDate: string = this._formatDate(this.data.local);
  lastDate: string = this._formatDate(this.data.lastSync);

  remoteTime: string = this._formatTime(this.data.remote);
  localTime: string = this._formatTime(this.data.local);
  lastTime: string = this._formatTime(this.data.lastSync);

  isHighlightRemote: boolean = this.data.remote >= this.data.local;
  isHighlightLocal: boolean = this.data.local >= this.data.remote;

  constructor(
    private _matDialogRef: MatDialogRef<DialogSyncConflictComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      remote: number;
      local: number;
      lastSync: number;
    },
  ) {
    _matDialogRef.disableClose = true;
  }

  close(res?: DialogConflictResolutionResult) {
    this._matDialogRef.close(res);
  }

  private _formatDate(date: Date | string | number) {
    return moment(date).format('DD-MM-YYYY');
  }

  private _formatTime(date: Date | string | number) {
    return moment(date).format('hh:mm:ss');
  }
}
