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
import { ConflictData, VectorClock } from '../../../pfapi/api';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import {
  compareVectorClocks,
  VectorClockComparison,
  vectorClockToString,
} from '../../../pfapi/api/util/vector-clock';
import { CollapsibleComponent } from '../../../ui/collapsible/collapsible.component';

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
    MatTooltip,
    CollapsibleComponent,
  ],
})
export class DialogSyncConflictComponent {
  private _matDialogRef = inject<MatDialogRef<DialogSyncConflictComponent>>(MatDialogRef);
  data = inject<ConflictData>(MAT_DIALOG_DATA);

  T: typeof T = T;

  remoteDate: number = this.data.remote.lastUpdate;
  localDate: number = this.data.local.lastUpdate;
  lastDate: number | null = this.data.local.lastSyncedUpdate;

  remoteTime: number = this.data.remote.lastUpdate;
  localTime: number = this.data.local.lastUpdate;
  lastTime: number | null = this.data.local.lastSyncedUpdate;

  remoteLamport: number = this.data.remote.localLamport;
  localLamport: number = this.data.local.localLamport;
  lastSyncedLamport: number | null = this.data.local.lastSyncedLamport;

  // Vector clock data
  remoteVectorClock: VectorClock | undefined = this.data.remote.vectorClock;
  localVectorClock: VectorClock | undefined = this.data.local.vectorClock;
  lastSyncedVectorClock: VectorClock | null | undefined =
    this.data.local.lastSyncedVectorClock;

  // Vector clock comparison
  vectorClockComparison: VectorClockComparison | null = this.getVectorClockComparison();

  remoteLastUpdateAction: string | undefined = this.data.remote.lastUpdateAction;
  localLastUpdateAction: string | undefined = this.data.local.lastUpdateAction;
  lastSyncedAction: string | undefined = this.data.local.lastSyncedAction;

  localMetaRev: string | null = this.data.local.metaRev;

  isHighlightRemote: boolean = this.data.remote.lastUpdate >= this.data.local.lastUpdate;
  isHighlightLocal: boolean = this.data.local.lastUpdate >= this.data.remote.lastUpdate;

  constructor() {
    const _matDialogRef = this._matDialogRef;

    _matDialogRef.disableClose = true;
  }

  close(res?: DialogConflictResolutionResult): void {
    this._matDialogRef.close(res);
  }

  shortenLamport(lamport?: number | null): string {
    if (!lamport) return '-';
    return lamport.toString().slice(-5);
  }

  shortenAction(actionStr?: string | null): string {
    if (!actionStr) return '?';
    return actionStr.trim().split(/\s+/)[0];
  }

  getVectorClockComparison(): VectorClockComparison | null {
    if (!this.localVectorClock || !this.remoteVectorClock) {
      return null;
    }
    return compareVectorClocks(this.localVectorClock, this.remoteVectorClock);
  }

  getVectorClockString(clock?: VectorClock | null): string {
    if (!clock) return '-';
    return vectorClockToString(clock);
  }

  getVectorClockComparisonLabel(): string {
    if (!this.vectorClockComparison) return '-';
    switch (this.vectorClockComparison) {
      case VectorClockComparison.EQUAL:
        return this.T.F.SYNC.D_CONFLICT.VECTOR_COMPARISON_EQUAL;
      case VectorClockComparison.LESS_THAN:
        return this.T.F.SYNC.D_CONFLICT.VECTOR_COMPARISON_LOCAL_LESS;
      case VectorClockComparison.GREATER_THAN:
        return this.T.F.SYNC.D_CONFLICT.VECTOR_COMPARISON_LOCAL_GREATER;
      case VectorClockComparison.CONCURRENT:
        return this.T.F.SYNC.D_CONFLICT.VECTOR_COMPARISON_CONCURRENT;
      default:
        return '-';
    }
  }
}
