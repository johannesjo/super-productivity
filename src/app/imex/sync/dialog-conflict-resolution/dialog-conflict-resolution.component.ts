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
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { EntityConflict } from '../../../core/persistence/operation-log/operation.types';
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
    MatDialogClose,
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
}
