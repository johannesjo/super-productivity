import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { OperationLogStoreService } from '../persistence/operation-log-store.service';
import { StateSnapshotService } from '../backup/state-snapshot.service';
import { OpLog } from '../../core/log';
import { T } from '../../t.const';
import { confirmDialog } from '../../util/native-dialogs';
import { hasMeaningfulStateData } from '../validation/has-meaningful-state-data.util';
import { isExampleTaskCreateOp } from '../validation/is-example-task-op.util';
import { isFullStateOpType, Operation, OperationLogEntry } from '../core/operation.types';

/**
 * Legacy-migration and crash-recovery genesis ops carry this client's entire
 * state as an ordinary Batch op. They upload like any other op but replay as a
 * no-op on every other client, so the state they carry never reaches the server
 * in a form another device can apply. Only this client's own genesis counts: a
 * raw rebuild from server history can start with another device's genesis op.
 */
const isOwnGenesisOp = (entry: OperationLogEntry): boolean =>
  entry.source === 'local' &&
  (entry.op.entityType === 'MIGRATION' || entry.op.entityType === 'RECOVERY');

@Injectable({
  providedIn: 'root',
})
export class SyncLocalStateService {
  private opLogStore = inject(OperationLogStoreService);
  private stateSnapshotService = inject(StateSnapshotService);
  private translateService = inject(TranslateService);

  async isWhollyFreshClient(): Promise<boolean> {
    const snapshot = await this.opLogStore.loadStateCache();
    const lastSeq = await this.opLogStore.getLastSeq();

    return !snapshot && lastSeq === 0;
  }

  /**
   * A client whose op-log history starts with a MIGRATION or RECOVERY genesis op
   * and that has never completed a real sync (#9863).
   *
   * Such a client is NOT wholly fresh (the genesis wrote a state cache and one
   * op), so the fresh-client protections skip it, and server migration never
   * fires for it either (`hasSyncedOps()` ignores genesis ops). Yet its
   * pre-migration data exists only inside the genesis payload, which no other
   * client can replay. Callers must treat it like a fresh client that holds
   * local data: on a non-empty server the user has to choose a side, on an empty
   * server the state has to be seeded as a SYNC_IMPORT.
   *
   * Returns false once any full-state op exists locally: that op already ships
   * (or shipped) the state, and the caller's SYNC_IMPORT creation must not loop.
   */
  async isNeverSyncedGenesisClient(): Promise<boolean> {
    if (await this.opLogStore.hasSyncedOps()) {
      return false;
    }
    if (await this.opLogStore.getLatestFullStateOpEntry()) {
      return false;
    }
    const [firstEntry] = await this.opLogStore.getOpsAfterSeq(0);
    return !!firstEntry && isOwnGenesisOp(firstEntry);
  }

  /**
   * Download-side "needs a full-state decision" check. Deliberately NOT folded
   * into isWhollyFreshClient(): that one also gates the upload phase, and a
   * genesis client must still upload the SYNC_IMPORT the empty-server branch
   * creates for it.
   *
   * When the download carries a full-state op, the incoming-import gate already
   * prompts a genesis client (its pending genesis op counts as meaningful work),
   * so the genesis case defers to that gate and keeps the established dialog.
   * Only the previously silent path — ordinary remote ops, no full-state op —
   * is widened here.
   */
  async isFreshOrNeverSyncedGenesisClient(incomingOps: Operation[]): Promise<boolean> {
    if (await this.isWhollyFreshClient()) {
      return true;
    }
    if (incomingOps.some((op) => isFullStateOpType(op.opType))) {
      return false;
    }
    return this.isNeverSyncedGenesisClient();
  }

  /**
   * @param ignoreTaskIds Optional task ids to exclude from the "has a task?" check.
   *   The file-based conflict gate passes the ids of pending onboarding example tasks so
   *   an example-only store is not treated as meaningful (#7985). Omitting it preserves
   *   the original behavior for every other caller.
   */
  hasMeaningfulStoreData(ignoreTaskIds?: ReadonlySet<string>): boolean {
    const snapshot = this.stateSnapshotService.getStateSnapshot();

    if (!snapshot) {
      OpLog.warn(
        'SyncLocalStateService.hasMeaningfulStoreData: Unable to get state snapshot',
      );
      return false;
    }

    return hasMeaningfulStateData(snapshot, ignoreTaskIds);
  }

  /**
   * True when this device has nothing of its own to put on the server (#9256).
   *
   * The destructive recovery actions ("Overwrite Server & Other Devices",
   * "Use Local Data") replace the remote copy with this device's state via a
   * clean-slate SYNC_IMPORT, which makes the server DELETE its stored
   * operations rather than supersede them. Running one from a device that
   * holds nothing therefore destroys the user's only copy, irreversibly — the
   * exact trap a client stuck on a failed initial download is offered.
   *
   * Two signals, both required:
   * - never completed a sync, so this device cannot be holding anything it
   *   received. A device that HAS synced may legitimately hold real data, so
   *   this keeps deliberate resets (Settings -> Sync) working.
   * - no user data beyond the onboarding example tasks. Those are generated
   *   locally on first run and are not the user's work, so they must not make
   *   an empty device look non-empty — `afterInitialSyncDoneStrict$` fails open
   *   on a timer, so they are created even when the initial sync failed.
   */
  async hasNothingWorthUploading(): Promise<boolean> {
    if (await this.opLogStore.hasSyncedOps()) {
      return false;
    }

    const pendingOps = await this.opLogStore.getUnsynced();
    const exampleTaskIds = new Set(
      pendingOps
        .filter(isExampleTaskCreateOp)
        .map((entry) => entry.op.entityId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    );

    return !this.hasMeaningfulStoreData(exampleTaskIds);
  }

  confirmFreshClientSync(opCount: number): boolean {
    const title = this.translateService.instant(T.F.SYNC.D_FRESH_CLIENT_CONFIRM.TITLE);
    const message = this.translateService.instant(
      T.F.SYNC.D_FRESH_CLIENT_CONFIRM.MESSAGE,
      {
        count: opCount,
      },
    );
    return confirmDialog(`${title}\n\n${message}`);
  }
}
