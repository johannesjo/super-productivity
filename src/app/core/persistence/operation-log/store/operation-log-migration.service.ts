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
    const lastSeq = await this.opLogStore.getLastSeq();
    if (lastSeq > 0) {
      // Already migrated or in use
      return;
    }

    OpLog.normal('OperationLogMigrationService: Checking for legacy data to migrate...');

    // Load all legacy data
    // We skip validity check here because we want to migrate whatever is there.
    // NOTE: This call automatically runs legacy `CROSS_MODEL_MIGRATIONS` if the data
    // is from an older version. This ensures we import already-migrated data.
    const legacyState = await this.pfapiService.pf.getAllSyncModelData(true);

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
