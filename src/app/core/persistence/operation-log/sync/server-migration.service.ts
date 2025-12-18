import { inject, Injectable, Injector } from '@angular/core';
import { Store } from '@ngrx/store';
import { SyncProviderServiceInterface } from '../../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../../pfapi/api/pfapi.const';
import { isOperationSyncCapable } from './operation-sync.util';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { VectorClockService } from './vector-clock.service';
import { incrementVectorClock } from '../../../../pfapi/api/util/vector-clock';
import { PfapiStoreDelegateService } from '../../../../pfapi/pfapi-store-delegate.service';
import { ValidateStateService } from '../processing/validate-state.service';
import { AppDataCompleteNew } from '../../../../pfapi/pfapi-config';
import { SnackService } from '../../../snack/snack.service';
import { T } from '../../../../t.const';
import { loadAllData } from '../../../../root-store/meta/load-all-data.action';
import { CURRENT_SCHEMA_VERSION } from '../store/schema-migration.service';
import { Operation, OpType } from '../operation.types';
import { uuidv7 } from '../../../../util/uuid-v7';
import { OpLog } from '../../../log';
import { SYSTEM_TAG_IDS } from '../../../../features/tag/tag.const';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { lazyInject } from '../../../../util/lazy-inject';

/**
 * Service responsible for handling server migration scenarios.
 *
 * ## What is Server Migration?
 * Server migration occurs when a client with existing synced data connects to
 * a new/empty sync server. This can happen when:
 * 1. User switches to a new sync provider
 * 2. Sync server is reset/cleared
 * 3. User restores from a backup on a fresh server
 *
 * ## Why is it needed?
 * Without server migration handling, incremental operations uploaded to the new
 * server would reference entities (tasks, projects, tags) that don't exist on
 * the server, causing sync failures for other clients.
 *
 * ## The Solution
 * When migration is detected, this service creates a SYNC_IMPORT operation
 * containing the full current state. This ensures all entities exist on the
 * server before incremental operations are applied.
 */
@Injectable({
  providedIn: 'root',
})
export class ServerMigrationService {
  private store = inject(Store);
  private opLogStore = inject(OperationLogStoreService);
  private vectorClockService = inject(VectorClockService);
  private validateStateService = inject(ValidateStateService);
  private storeDelegateService = inject(PfapiStoreDelegateService);
  private snackService = inject(SnackService);

  // Lazy injection to break circular dependency:
  // PfapiService -> Pfapi -> OperationLogSyncService -> ServerMigrationService -> PfapiService
  private _injector = inject(Injector);
  private _getPfapiService = lazyInject(this._injector, PfapiService);

  /**
   * Checks if we're connecting to a new/empty server and handles migration if needed.
   *
   * ## Detection Logic
   * Server migration is detected when ALL of these conditions are true:
   * 1. This is a sync-capable provider (supports operation-based sync)
   * 2. lastServerSeq is 0 (first time connecting to this server)
   * 3. Server is empty (no operations to download)
   * 4. Client has PREVIOUSLY synced operations (not a fresh client)
   *
   * ## Why "previously synced" matters
   * A fresh client with only local (unsynced) ops is NOT a migration scenario.
   * Fresh clients should just upload their ops normally without creating a SYNC_IMPORT.
   *
   * @param syncProvider - The sync provider to check against
   */
  async checkAndHandleMigration(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<void> {
    // Only check for operation-sync capable providers
    if (!isOperationSyncCapable(syncProvider)) {
      return;
    }

    // Check if lastServerSeq is 0 (first time connecting to this server)
    const lastServerSeq = await syncProvider.getLastServerSeq();
    if (lastServerSeq !== 0) {
      // We've synced with this server before, no migration needed
      return;
    }

    // Check if server is empty by doing a minimal download request
    const response = await syncProvider.downloadOps(0, undefined, 1);
    if (response.latestSeq !== 0) {
      // Server has data, this is not a migration scenario
      // (might be joining an existing sync group)
      return;
    }

    // CRITICAL: Check if this client has PREVIOUSLY synced operations.
    // A client that has never synced (only local ops) is NOT a migration case.
    // It's just a fresh client that should upload its ops normally.
    const hasSyncedOps = await this.opLogStore.hasSyncedOps();
    if (!hasSyncedOps) {
      OpLog.normal(
        'ServerMigrationService: Empty server detected, but no previously synced ops. ' +
          'This is a fresh client, not a server migration. Proceeding with normal upload.',
      );
      return;
    }

    // Server is empty AND we have PREVIOUSLY SYNCED ops AND lastServerSeq is 0
    // This is a server migration - create SYNC_IMPORT with full state
    OpLog.warn(
      'ServerMigrationService: Server migration detected during upload check. ' +
        'Empty server with previously synced ops. Creating full state SYNC_IMPORT.',
    );
    await this.handleServerMigration();
  }

  /**
   * Handles server migration by creating a SYNC_IMPORT operation with full current state.
   *
   * ## Process
   * 1. Get current state from NgRx store
   * 2. Skip if state is empty (nothing to migrate)
   * 3. Validate and repair state (prevent propagating corruption)
   * 4. Create SYNC_IMPORT operation with full state
   * 5. Append to operation log for upload
   *
   * ## State Validation
   * Before creating SYNC_IMPORT, the state is validated and repaired if needed.
   * This prevents corrupted state (e.g., orphaned references) from propagating
   * to other clients via the full state import.
   */
  async handleServerMigration(): Promise<void> {
    OpLog.warn(
      'ServerMigrationService: Server migration detected. Creating full state SYNC_IMPORT.',
    );

    // Get current full state from NgRx store
    let currentState = await this.storeDelegateService.getAllSyncModelDataFromStore();

    // Skip if local state is effectively empty
    if (this._isEmptyState(currentState)) {
      OpLog.warn('ServerMigrationService: Skipping SYNC_IMPORT - local state is empty.');
      return;
    }

    // Validate and repair state before creating SYNC_IMPORT
    // This prevents corrupted state (e.g., orphaned menuTree references) from
    // propagating to other clients via the full state import.
    const validationResult = this.validateStateService.validateAndRepair(
      currentState as AppDataCompleteNew,
    );

    // If state is invalid and couldn't be repaired, abort - don't propagate corruption
    if (!validationResult.isValid) {
      OpLog.err(
        'ServerMigrationService: Cannot create SYNC_IMPORT - state validation failed.',
        validationResult.error || validationResult.crossModelError,
      );
      this.snackService.open({
        type: 'ERROR',
        msg: T.F.SYNC.S.SERVER_MIGRATION_VALIDATION_FAILED,
      });
      return;
    }

    // If state was repaired, use the repaired version
    if (validationResult.repairedState) {
      OpLog.warn(
        'ServerMigrationService: State repaired before creating SYNC_IMPORT',
        validationResult.repairSummary,
      );
      currentState = validationResult.repairedState;

      // Also update NgRx store with repaired state so local client is consistent
      this.store.dispatch(
        loadAllData({ appDataComplete: validationResult.repairedState }),
      );
    }

    // Get client ID and vector clock
    const clientId = await this._getPfapiService().pf.metaModel.loadClientId();
    if (!clientId) {
      OpLog.err(
        'ServerMigrationService: Cannot create SYNC_IMPORT - no client ID available.',
      );
      return;
    }

    const currentClock = await this.vectorClockService.getCurrentVectorClock();
    const newClock = incrementVectorClock(currentClock, clientId);

    // Create SYNC_IMPORT operation with full state
    // NOTE: Use raw state directly (not wrapped in appDataComplete).
    // The snapshot endpoint expects raw state, and the hydrator handles
    // both formats on extraction.
    const op: Operation = {
      id: uuidv7(),
      actionType: '[SP_ALL] Load(import) all data',
      opType: OpType.SyncImport,
      entityType: 'ALL',
      payload: currentState,
      clientId,
      vectorClock: newClock,
      timestamp: Date.now(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };

    // Append to operation log - will be uploaded via snapshot endpoint
    await this.opLogStore.append(op, 'local');

    OpLog.normal(
      'ServerMigrationService: Created SYNC_IMPORT operation for server migration. ' +
        'Will be uploaded immediately via follow-up upload.',
    );
  }

  /**
   * Checks if the state is effectively empty (no meaningful data to sync).
   * An empty state has no tasks, projects, or user-created tags.
   */
  private _isEmptyState(state: unknown): boolean {
    if (!state || typeof state !== 'object') {
      return true;
    }

    const s = state as Record<string, unknown>;

    // Check for meaningful data in key entity collections
    const taskState = s['task'] as { ids?: unknown[] } | undefined;
    const projectState = s['project'] as { ids?: unknown[] } | undefined;
    const tagState = s['tag'] as { ids?: (string | unknown)[] } | undefined;

    const hasNoTasks = !taskState?.ids || taskState.ids.length === 0;
    const hasNoProjects = !projectState?.ids || projectState.ids.length === 0;
    const hasNoUserTags = this._hasNoUserCreatedTags(tagState?.ids);

    // Consider empty if there are no tasks, projects, or user-defined tags
    return hasNoTasks && hasNoProjects && hasNoUserTags;
  }

  /**
   * Checks if there are no user-created tags.
   * System tags (TODAY, URGENT, IMPORTANT, IN_PROGRESS) are excluded from the count.
   */
  private _hasNoUserCreatedTags(tagIds: (string | unknown)[] | undefined): boolean {
    if (!tagIds || tagIds.length === 0) {
      return true;
    }
    const userTagCount = tagIds.filter(
      (id) => typeof id === 'string' && !SYSTEM_TAG_IDS.has(id),
    ).length;
    return userTagCount === 0;
  }
}
