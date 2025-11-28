import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { OperationLogStoreService } from './operation-log-store.service';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { convertOpToAction } from './operation-converter.util';
import { OperationLogMigrationService } from './operation-log-migration.service';
import { PFLog } from '../../log';

/**
 * Handles the hydration (loading) of the application state from the operation log
 * during application startup. It first attempts to load a saved state snapshot,
 * and then replays any subsequent operations from the log to bring the application
 * state up to date. This approach optimizes startup performance by avoiding a full
 * replay of all historical operations.
 */
@Injectable({ providedIn: 'root' })
export class OperationLogHydratorService {
  private store = inject(Store);
  private opLogStore = inject(OperationLogStoreService);
  private migrationService = inject(OperationLogMigrationService);

  async hydrateStore(): Promise<void> {
    PFLog.normal('OperationLogHydratorService: Starting hydration...');
    // 1. Load snapshot
    let snapshot = await this.opLogStore.loadStateCache();

    if (!snapshot) {
      PFLog.normal(
        'OperationLogHydratorService: No snapshot found. Checking for migration...',
      );
      // Fresh install or migration - no snapshot exists
      await this.migrationService.checkAndMigrate();
      // Try loading again after potential migration
      snapshot = await this.opLogStore.loadStateCache();
    }

    if (snapshot) {
      PFLog.normal('OperationLogHydratorService: Snapshot found. Hydrating state...', {
        lastAppliedOpSeq: snapshot.lastAppliedOpSeq,
      });
      // 2. Hydrate NgRx with snapshot
      // We cast state to any because AllSyncModels type is complex and we trust the cache
      this.store.dispatch(loadAllData({ appDataComplete: snapshot.state as any }));

      // 3. Replay tail operations
      const tailOps = await this.opLogStore.getOpsAfterSeq(snapshot.lastAppliedOpSeq);
      PFLog.normal(
        `OperationLogHydratorService: Replaying ${tailOps.length} tail operations.`,
      );

      for (const entry of tailOps) {
        const action = convertOpToAction(entry.op);
        this.store.dispatch(action);
      }
      PFLog.normal('OperationLogHydratorService: Hydration complete.');
    } else {
      PFLog.warn(
        'OperationLogHydratorService: No snapshot found. Replaying all operations from start.',
      );
      // No snapshot means we might be in a fresh install state or post-migration-check with no legacy data.
      // We must replay ALL operations from the beginning of the log.
      const allOps = await this.opLogStore.getOpsAfterSeq(0);
      PFLog.normal(
        `OperationLogHydratorService: Replaying all ${allOps.length} operations.`,
      );

      for (const entry of allOps) {
        const action = convertOpToAction(entry.op);
        this.store.dispatch(action);
      }
      PFLog.normal('OperationLogHydratorService: Full replay complete.');
    }
  }
}
