import { inject, Injectable } from '@angular/core';
import { OperationLogStoreService } from './operation-log-store.service';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { Operation, OpType } from './operation.types';
import { uuidv7 } from '../../../util/uuid-v7';
import { PFLog } from '../../log';
import { PersistenceLocalService } from '../persistence-local.service';

const CURRENT_SCHEMA_VERSION = 1;

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

    PFLog.normal('OperationLogMigrationService: Checking for legacy data to migrate...');

    // Load all legacy data
    // We skip validity check here because we want to migrate whatever is there
    const legacyState = await this.pfapiService.pf.getAllSyncModelData(true);

    // Check if there is any actual data to migrate
    const hasData = Object.keys(legacyState).some((key) => {
      const model = legacyState[key as keyof typeof legacyState];
      return model && Object.keys(model).length > 0;
    });

    if (!hasData) {
      PFLog.normal('OperationLogMigrationService: No legacy data found. Starting fresh.');
      return;
    }

    PFLog.normal(
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

    PFLog.normal(
      'OperationLogMigrationService: Migration complete. Genesis Operation created.',
    );
  }
}
