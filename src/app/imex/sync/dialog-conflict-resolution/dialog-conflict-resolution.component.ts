import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  ],
})
export class DialogConflictResolutionComponent {
  private _dialogRef = inject(MatDialogRef<DialogConflictResolutionComponent>);
  data = inject<{ conflicts: EntityConflict[] }>(MAT_DIALOG_DATA);

  resolve(conflictIndex: number, resolution: 'local' | 'remote'): void {
    // This is a simplified placeholder.
    // In reality, we might want to resolve all conflicts before closing,
    // or return a map of resolutions.
    this._dialogRef.close({
      resolution,
      conflict: this.data.conflicts[conflictIndex],
    });
  }

  resolveAll(resolution: 'local' | 'remote'): void {
    this._dialogRef.close({
      resolution,
      conflicts: this.data.conflicts,
    });
  }
}
