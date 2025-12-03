import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { EntityConflict } from './operation.types';
import { OperationApplierService } from './operation-applier.service';
import { OperationLogStoreService } from './operation-log-store.service';
import { PFLog } from '../../log';
import {
  ConflictResolutionResult,
  DialogConflictResolutionComponent,
} from '../../../imex/sync/dialog-conflict-resolution/dialog-conflict-resolution.component';
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

    const result: ConflictResolutionResult | undefined = await firstValueFrom(
      this._dialogRef.afterClosed(),
    );

    if (result && result.resolutions) {
      PFLog.normal(
        'ConflictResolutionService: Processing resolutions',
        result.resolutions,
      );

      for (const conflict of conflicts) {
        const resolution = result.resolutions.get(conflict.entityId);

        if (!resolution) {
          PFLog.warn(
            `ConflictResolutionService: No resolution for ${conflict.entityId}, skipping`,
          );
          continue;
        }

        if (resolution === 'remote') {
          // Apply remote ops
          for (const op of conflict.remoteOps) {
            if (!(await this.opLogStore.hasOp(op.id))) {
              await this.opLogStore.append(op, 'remote');
            }
            await this.operationApplier.applyOperations([op]);
            await this.opLogStore.markApplied(op.id);
          }
          // Mark local ops as rejected so they won't be re-synced
          const localOpIds = conflict.localOps.map((op) => op.id);
          await this.opLogStore.markRejected(localOpIds);
          PFLog.normal(
            `ConflictResolutionService: Applied remote ops for ${conflict.entityId}`,
          );
        } else {
          // Keep local ops.
          // We assume they are already applied to state.
          // We just need to ensure they are kept in the log for sync later.
          // We essentially "ignore" the remote ops (don't apply them).
          PFLog.normal(
            `ConflictResolutionService: Keeping local ops for ${conflict.entityId}`,
          );
        }
      }
    }
  }
}
