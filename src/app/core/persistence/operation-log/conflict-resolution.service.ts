import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { EntityConflict } from './operation.types';
import { OperationApplierService } from './operation-applier.service';
import { OperationLogStoreService } from './operation-log-store.service';
import { PFLog } from '../../log';
import { DialogConflictResolutionComponent } from '../../../imex/sync/dialog-conflict-resolution/dialog-conflict-resolution.component';
import { firstValueFrom } from 'rxjs';

/**
 * Service to manage conflict resolution, typically presenting a UI to the user.
 * It takes detected conflicts, presents them, and applies the chosen resolutions.
 */
@Injectable({
  providedIn: 'root',
})
export class ConflictResolutionService {
  private dialog = inject(MatDialog);
  private operationApplier = inject(OperationApplierService);
  private opLogStore = inject(OperationLogStoreService);

  private _dialogRef?: MatDialogRef<DialogConflictResolutionComponent>;

  async presentConflicts(conflicts: EntityConflict[]): Promise<void> {
    PFLog.warn('ConflictResolutionService: Presenting conflicts', conflicts);

    this._dialogRef = this.dialog.open(DialogConflictResolutionComponent, {
      data: { conflicts },
      disableClose: true,
    });

    const result = await firstValueFrom(this._dialogRef.afterClosed());

    if (result) {
      // Simplified handling: apply resolution to all conflicts for now
      // In a real scenario, we would iterate over resolved conflicts
      const resolution = result.resolution; // 'local' | 'remote'

      PFLog.normal(`ConflictResolutionService: Resolved with ${resolution}`);

      for (const conflict of conflicts) {
        if (resolution === 'remote') {
          // Apply remote ops
          for (const op of conflict.remoteOps) {
            if (!(await this.opLogStore.hasOp(op.id))) {
              await this.opLogStore.append(op, 'remote');
            }
            await this.operationApplier.applyOperations([op]);
            await this.opLogStore.markApplied(op.id);
          }
          // TODO: Revert/Remove local ops?
          // Since local ops are pending, they haven't been "applied" in the log sense?
          // No, they are in the log as "local". We might need to mark them as rejected or similar.
          // For now, we assume remote application overwrites state.
        } else {
          // Keep local ops.
          // We assume they are already applied to state.
          // We just need to ensure they are kept in the log for sync later.
          // But we might need to re-apply them if remote was partially applied?
          // In this simple model, local ops are already in the log.
          // We essentially "ignore" the remote ops (don't apply them).
          PFLog.normal('ConflictResolutionService: Keeping local ops, ignoring remote.');
        }
      }
    }
  }
}
