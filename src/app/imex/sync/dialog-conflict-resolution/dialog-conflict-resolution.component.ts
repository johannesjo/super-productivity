import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import {
  EntityConflict,
  Operation,
  OpType,
} from '../../../core/persistence/operation-log/operation.types';
import { MatButton } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';

export type ConflictResolution = 'local' | 'remote';

export interface ConflictResolutionResult {
  resolutions: Map<number, ConflictResolution>; // Keyed by conflict index
  conflicts: EntityConflict[];
}

@Component({
  selector: 'dialog-conflict-resolution',
  templateUrl: './dialog-conflict-resolution.component.html',
  styleUrls: ['./dialog-conflict-resolution.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    TranslateModule,
    DatePipe,
    MatIcon,
  ],
})
export class DialogConflictResolutionComponent {
  private _dialogRef = inject(MatDialogRef<DialogConflictResolutionComponent>);
  data = inject<{ conflicts: EntityConflict[] }>(MAT_DIALOG_DATA);

  // Track resolution for each conflict by index (entityId may not be unique)
  resolutions = signal<Map<number, ConflictResolution>>(new Map());

  allResolved = computed(() => this.resolutions().size === this.data.conflicts.length);

  getResolution(index: number): ConflictResolution | undefined {
    return this.resolutions().get(index);
  }

  resolve(conflictIndex: number, resolution: ConflictResolution): void {
    const newMap = new Map(this.resolutions());
    newMap.set(conflictIndex, resolution);
    this.resolutions.set(newMap);
  }

  resolveAll(resolution: ConflictResolution): void {
    const newMap = new Map<number, ConflictResolution>();
    this.data.conflicts.forEach((_, index) => {
      newMap.set(index, resolution);
    });
    this.resolutions.set(newMap);
  }

  submitResolutions(): void {
    this._dialogRef.close({
      resolutions: this.resolutions(),
      conflicts: this.data.conflicts,
    } as ConflictResolutionResult);
  }

  cancel(): void {
    this._dialogRef.close(undefined);
  }

  getEntityLabel(conflict: EntityConflict): string {
    if (!conflict.entityId || conflict.entityId === '*') {
      return '';
    }
    // Try to extract a title from the most recent operation's payload
    const ops = [...conflict.localOps, ...conflict.remoteOps];
    const mostRecent = ops.sort((a, b) => b.timestamp - a.timestamp)[0];
    if (mostRecent?.payload && typeof mostRecent.payload === 'object') {
      const payload = mostRecent.payload as Record<string, unknown>;
      if (typeof payload['title'] === 'string') {
        return (
          payload['title'].substring(0, 40) + (payload['title'].length > 40 ? '...' : '')
        );
      }
      if (typeof payload['name'] === 'string') {
        return (
          payload['name'].substring(0, 40) + (payload['name'].length > 40 ? '...' : '')
        );
      }
    }
    // Fallback to truncated ID
    return conflict.entityId.substring(0, 8) + '...';
  }

  getOpTypesSummary(ops: Operation[]): string {
    const counts = new Map<OpType, number>();
    for (const op of ops) {
      counts.set(op.opType, (counts.get(op.opType) || 0) + 1);
    }

    const parts: string[] = [];
    const typeLabels: Record<OpType, string> = {
      [OpType.Create]: '+',
      [OpType.Update]: '~',
      [OpType.Delete]: '-',
      [OpType.Move]: '↔',
      [OpType.Batch]: 'B',
      [OpType.SyncImport]: 'S',
      [OpType.BackupImport]: 'I',
      [OpType.Repair]: 'R',
    };

    for (const [type, count] of counts) {
      parts.push(`${typeLabels[type] || type}${count > 1 ? count : ''}`);
    }
    return parts.join(' ');
  }

  getActionLabel(op: Operation): string {
    // Extract the action name from "[Entity] Action Name" format
    const match = op.actionType.match(/\[.*?\]\s*(.+)/);
    if (match) {
      return match[1];
    }
    return op.actionType;
  }
}
