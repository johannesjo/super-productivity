import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { T } from 'src/app/t.const';
import { DialogConflictResolutionResult } from '../sync.model';

@Component({
  selector: 'dialog-sync-conflict',
  templateUrl: './dialog-sync-conflict.component.html',
  styleUrls: ['./dialog-sync-conflict.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DialogSyncConflictComponent {
  T: typeof T = T;

  remoteDate: number = this.data.remote;
  localDate: number = this.data.local;
  lastDate: number = this.data.lastSync;

  remoteTime: number = this.data.remote;
  localTime: number = this.data.local;
  lastTime: number = this.data.lastSync;

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

  close(res?: DialogConflictResolutionResult): void {
    this._matDialogRef.close(res);
  }
}
