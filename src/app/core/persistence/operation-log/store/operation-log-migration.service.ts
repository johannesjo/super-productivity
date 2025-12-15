import { inject, Injectable } from '@angular/core';
import { OperationLogStoreService } from './operation-log-store.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { Operation, OpType } from '../operation.types';
import { uuidv7 } from '../../../../util/uuid-v7';
import { OpLog } from '../../../log';
import { PersistenceLocalService } from '../../persistence-local.service';
import { CURRENT_SCHEMA_VERSION } from './schema-migration.service';

@Injectable({ providedIn: 'root' })
export class OperationLogMigrationService {
  private opLogStore = inject(OperationLogStoreService);
  private pfapiService = inject(PfapiService);
  private persistenceLocalService = inject(PersistenceLocalService);

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
    // We only check entity models (tasks, projects, tags, etc.) because config models
    // like globalConfig always return non-empty defaults even on a fresh database.
    const entityModelsToCheck = [
      'task',
      'project',
      'tag',
      'note',
      'taskRepeatCfg',
      'simpleCounter',
      'metric',
    ];
    const hasUserData = entityModelsToCheck.some((key) => {
      const model = legacyState[key as keyof typeof legacyState] as
        | { ids?: string[] }
        | undefined;
      return model?.ids && model.ids.length > 0;
    });

    if (!hasUserData) {
      OpLog.normal('OperationLogMigrationService: No legacy data found. Starting fresh.');
      return;
    }

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
}
