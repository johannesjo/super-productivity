import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { OperationLogStoreService } from './operation-log-store.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { Operation, OpType } from '../operation.types';
import { uuidv7 } from '../../../../util/uuid-v7';
import { OpLog } from '../../../log';
import { CURRENT_SCHEMA_VERSION } from './schema-migration.service';
import { DialogConfirmComponent } from '../../../../ui/dialog-confirm/dialog-confirm.component';
import { download } from '../../../../util/download';
import { T } from '../../../../t.const';

@Injectable({ providedIn: 'root' })
export class OperationLogMigrationService {
  private opLogStore = inject(OperationLogStoreService);
  private pfapiService = inject(PfapiService);
  private matDialog = inject(MatDialog);

  async checkAndMigrate(): Promise<void> {
    // Check if there's a state cache (snapshot) - this indicates a proper migration happened
    const snapshot = await this.opLogStore.loadStateCache();
    if (snapshot) {
      // Already migrated - snapshot exists
      return;
    }

    // No snapshot exists. Check if there are any operations in the log.
    const allOps = await this.opLogStore.getOpsAfterSeq(0);

    if (allOps.length > 0) {
      // Operations exist but no snapshot. Check if the first op is a Genesis/Migration op.
      const firstOp = allOps[0].op;
      if (firstOp.entityType === 'MIGRATION' || firstOp.entityType === 'RECOVERY') {
        // Valid Genesis exists - migration already happened but snapshot might have been lost
        OpLog.normal(
          'OperationLogMigrationService: Genesis operation found. Skipping migration.',
        );
        return;
      }

      // Orphan operations exist (captured before migration ran).
      // This happens when effects dispatch actions during app init before hydration completes.
      // We need to clear these orphan ops and proceed with proper migration.
      OpLog.warn(
        `OperationLogMigrationService: Found ${allOps.length} orphan operations without Genesis. ` +
          `Clearing them and proceeding with migration.`,
      );
      await this.opLogStore.deleteOpsWhere(() => true);
    }

    OpLog.normal('OperationLogMigrationService: Checking for legacy data to migrate...');

    // Load all legacy data directly from ModelCtrl caches ('pf' database).
    // We must use getAllSyncModelDataFromModelCtrls() instead of getAllSyncModelData()
    // because the NgRx store delegate is set early in initialization, and NgRx store
    // is empty at migration time. Reading from 'pf' database gets the actual legacy data.
    const legacyState = await this.pfapiService.pf.getAllSyncModelDataFromModelCtrls();

    // Check if there is any actual user data to migrate.
    // We only check for TASKS because:
    // - Config models like globalConfig always have non-empty defaults
    // - Project model has default INBOX_PROJECT on fresh databases
    // - Tag model might have default tags
    // - Without tasks, there's no meaningful user data to migrate
    const taskModel = legacyState['task' as keyof typeof legacyState] as
      | { ids?: string[] }
      | undefined;
    const hasUserData = taskModel?.ids && taskModel.ids.length > 0;

    if (!hasUserData) {
      OpLog.normal('OperationLogMigrationService: No legacy data found. Starting fresh.');
      return;
    }

    // Show dialog and download backup before migration
    await this._showMigrationDialogAndCreateBackup(legacyState);

    OpLog.normal(
      'OperationLogMigrationService: Legacy data found. Creating Genesis Operation.',
    );

    const clientId = await this.pfapiService.pf.metaModel.loadClientId();

    // Create Genesis Operation
    const genesisOp: Operation = {
      id: uuidv7(),
      actionType: '[Migration] Genesis Import',
      opType: OpType.Batch,
      entityType: 'MIGRATION',
      entityId: '*',
      payload: legacyState,
      clientId: clientId,
      vectorClock: { [clientId]: 1 },
      timestamp: Date.now(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };

    // Write Genesis Operation
    await this.opLogStore.append(genesisOp);

    // Create initial state cache
    await this.opLogStore.saveStateCache({
      state: legacyState,
      lastAppliedOpSeq: 1, // The genesis op will be seq 1
      vectorClock: genesisOp.vectorClock,
      compactedAt: Date.now(),
    });

    OpLog.normal(
      'OperationLogMigrationService: Migration complete. Genesis Operation created.',
    );
  }

  /**
   * Shows a dialog informing the user about the system update and downloads a backup.
   */
  private async _showMigrationDialogAndCreateBackup(legacyState: unknown): Promise<void> {
    // Show informational dialog (Continue button only, no cancel)
    await firstValueFrom(
      this.matDialog
        .open(DialogConfirmComponent, {
          disableClose: true,
          data: {
            title: T.PRE_MIGRATION.DIALOG_TITLE,
            message: T.PRE_MIGRATION.DIALOG_MESSAGE,
            okTxt: T.G.CONTINUE,
            hideCancelButton: true,
          },
        })
        .afterClosed(),
    );

    // Download backup file
    const filename = `super-productivity-pre-migration-backup-${Date.now()}.json`;
    await download(filename, JSON.stringify(legacyState));

    OpLog.normal('OperationLogMigrationService: Pre-migration backup downloaded.');
  }
}
