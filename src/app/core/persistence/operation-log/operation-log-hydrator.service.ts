import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { OperationLogStoreService } from './operation-log-store.service';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { convertOpToAction } from './operation-converter.util';

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

  async hydrateStore(): Promise<void> {
    // 1. Load snapshot
    const snapshot = await this.opLogStore.loadStateCache();

    if (snapshot) {
      // 2. Hydrate NgRx with snapshot
      // We cast state to any because AllSyncModels type is complex and we trust the cache
      this.store.dispatch(loadAllData({ appDataComplete: snapshot.state as any }));

      // 3. Replay tail operations
      const tailOps = await this.opLogStore.getOpsAfterSeq(snapshot.lastAppliedOpSeq);

      for (const entry of tailOps) {
        const action = convertOpToAction(entry.op);
        this.store.dispatch(action);
      }
    } else {
      // Fresh install or migration - no snapshot exists
      // Handled by legacy system or future migration step
    }
  }
}
