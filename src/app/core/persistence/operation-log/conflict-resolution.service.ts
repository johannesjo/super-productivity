import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EntityConflict } from './operation.types';
import { OperationApplierService } from './operation-applier.service';
import { OperationLogStoreService } from './operation-log-store.service';
import { PFLog } from '../../log';

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

  // TODO: Add actual dialog component
  // private _dialogRef?: MatDialogRef<DialogConflictResolutionComponent>;

  async presentConflicts(conflicts: EntityConflict[]): Promise<void> {
    PFLog.warn('ConflictResolutionService: Presenting conflicts', conflicts);

    // TODO: For now, we're just logging and choosing remote for all.
    // This needs to be replaced with an actual UI.
    for (const conflict of conflicts) {
      PFLog.warn(
        `Conflict for ${conflict.entityType}:${conflict.entityId}. Choosing remote.`,
      );

      // Simulate applying remote (user choice)
      // This would typically involve user input via a dialog
      for (const op of conflict.remoteOps) {
        if (!(await this.opLogStore.hasOp(op.id))) {
          await this.opLogStore.append(op, 'remote');
        }
        await this.operationApplier.applyOperations([op]);
        await this.opLogStore.markApplied(op.id);
      }
    }
  }
}
