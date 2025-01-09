import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { T } from 'src/app/t.const';
import { DialogConflictResolutionResult } from '../sync.model';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'dialog-sync-conflict',
  templateUrl: './dialog-sync-conflict.component.html',
  styleUrls: ['./dialog-sync-conflict.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatIcon,
    TranslatePipe,
    DatePipe,
  ],
})
export class DialogSyncConflictComponent {
  private _matDialogRef = inject<MatDialogRef<DialogSyncConflictComponent>>(MatDialogRef);
  data = inject<{
    remote: number;
    local: number;
    lastSync: number;
  }>(MAT_DIALOG_DATA);

  T: typeof T = T;

  remoteDate: number = this.data.remote;
  localDate: number = this.data.local;
  lastDate: number = this.data.lastSync;

  remoteTime: number = this.data.remote;
  localTime: number = this.data.local;
  lastTime: number = this.data.lastSync;

  isHighlightRemote: boolean = this.data.remote >= this.data.local;
  isHighlightLocal: boolean = this.data.local >= this.data.remote;

  constructor() {
    const _matDialogRef = this._matDialogRef;

    _matDialogRef.disableClose = true;
  }

  close(res?: DialogConflictResolutionResult): void {
    this._matDialogRef.close(res);
  }
}
