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

  remote = this.data.remote;
  local = this.data.local;

  isHighlightRemote = this.remote.lastUpdate >= this.local.lastUpdate;
  // isHighlightLocal = this.local.lastUpdate >= this.remote.lastUpdate;
  isHighlightLocal = !this.isHighlightRemote;

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
    if (!this.local.vectorClock || !this.remote.vectorClock) {
      return null;
    }
    return compareVectorClocks(this.local.vectorClock, this.remote.vectorClock);
  }

  getVectorClockString(clock?: VectorClock | null): string {
    if (!clock) return '-';
    return vectorClockToString(clock);
  }

  getVectorClockComparisonLabel(): string {
    const comparison = this.getVectorClockComparison();
    if (!comparison) return '-';
    switch (comparison) {
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
