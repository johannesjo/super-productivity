import { inject, Injectable } from '@angular/core';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { Operation, OpType } from '../operation.types';
import {
  compareVectorClocks,
  VectorClockComparison,
} from '../../../../pfapi/api/util/vector-clock';
import { OpLog } from '../../../log';

/**
 * Service responsible for filtering operations invalidated by SYNC_IMPORT, BACKUP_IMPORT, or REPAIR operations.
 *
 * ## The Problem
 * ```
 * Timeline:
 *   Client A creates ops → Client B does SYNC_IMPORT → Client A syncs
 *
 * Result:
 *   - Client A's ops have higher serverSeq than SYNC_IMPORT
 *   - But they reference entities that were WIPED by the import
 *   - Applying them causes "Task not found" errors
 * ```
 *
 * ## The Solution
 * Use VECTOR CLOCK comparison to determine if ops were created with knowledge
 * of the import. This is more reliable than UUIDv7 timestamps because vector
 * clocks track CAUSALITY (did the client know about the import?) rather than
 * wall-clock time (which can be affected by clock drift).
 */
@Injectable({
  providedIn: 'root',
})
export class SyncImportFilterService {
  private opLogStore = inject(OperationLogStoreService);

  /**
   * Filters out operations invalidated by a SYNC_IMPORT, BACKUP_IMPORT, or REPAIR.
   *
   * ## Vector Clock Comparison Results
   * | Comparison     | Meaning                              | Action  |
   * |----------------|--------------------------------------|---------|
   * | GREATER_THAN   | Op created after seeing import       | ✅ Keep |
   * | EQUAL          | Same causal history as import        | ✅ Keep |
   * | LESS_THAN      | Op dominated by import               | ❌ Filter|
   * | CONCURRENT     | Op created without knowledge of import| ❌ Filter|
   *
   * Note: CONCURRENT ops are filtered because they reference pre-import state,
   * even if they were created "after" the import in wall-clock time.
   *
   * The import can be in the current batch OR in the local store from a
   * previous sync cycle. We check both to handle the case where old ops from
   * another client arrive after we already downloaded the import.
   *
   * @param ops - Operations to filter (already migrated)
   * @returns Object with `validOps` and `invalidatedOps` arrays
   */
  async filterOpsInvalidatedBySyncImport(ops: Operation[]): Promise<{
    validOps: Operation[];
    invalidatedOps: Operation[];
  }> {
    // Find full state import operations (SYNC_IMPORT, BACKUP_IMPORT, or REPAIR) in current batch
    const fullStateImportsInBatch = ops.filter(
      (op) =>
        op.opType === OpType.SyncImport ||
        op.opType === OpType.BackupImport ||
        op.opType === OpType.Repair,
    );

    // Check local store for previously downloaded import
    const storedImport = await this.opLogStore.getLatestFullStateOp();

    // Determine the latest import (from batch or store)
    let latestImport: Operation | undefined;

    if (fullStateImportsInBatch.length > 0) {
      // Find the latest in the current batch
      const latestInBatch = fullStateImportsInBatch.reduce((latest, op) =>
        op.id > latest.id ? op : latest,
      );
      // Compare with stored import (if any)
      if (storedImport && storedImport.id > latestInBatch.id) {
        latestImport = storedImport;
      } else {
        latestImport = latestInBatch;
      }
    } else if (storedImport) {
      // No import in batch, but we have one from a previous sync
      latestImport = storedImport;
    }

    // No imports found anywhere = no filtering needed
    if (!latestImport) {
      return { validOps: ops, invalidatedOps: [] };
    }

    OpLog.normal(
      `SyncImportFilterService: Filtering ops against SYNC_IMPORT from client ${latestImport.clientId} (op: ${latestImport.id})`,
    );

    const validOps: Operation[] = [];
    const invalidatedOps: Operation[] = [];

    for (const op of ops) {
      // Full state import operations themselves are always valid
      if (
        op.opType === OpType.SyncImport ||
        op.opType === OpType.BackupImport ||
        op.opType === OpType.Repair
      ) {
        validOps.push(op);
        continue;
      }

      // Use VECTOR CLOCK comparison instead of UUIDv7 timestamps.
      // Vector clocks track CAUSALITY ("did this client know about the import?")
      // rather than wall-clock time, making them immune to client clock drift.
      //
      // Comparison results:
      // - GREATER_THAN: Op was created by a client that SAW the import → KEEP
      // - EQUAL: Same causal history as import → KEEP
      // - LESS_THAN: Op is dominated by import (created before with less history) → FILTER
      // - CONCURRENT: Op created WITHOUT knowledge of import → handled below
      //
      // SPECIAL CASE for CONCURRENT ops:
      // If the op's client is NOT in the SYNC_IMPORT's clock, this means the
      // SYNC_IMPORT was created without knowledge of that client. In this case,
      // the op is NOT "pre-import state" - it's from a client that the import
      // didn't know about. These ops should be KEPT and applied.
      const comparison = compareVectorClocks(op.vectorClock, latestImport.vectorClock);

      if (
        comparison === VectorClockComparison.GREATER_THAN ||
        comparison === VectorClockComparison.EQUAL
      ) {
        // Op was created by a client that had knowledge of the import
        validOps.push(op);
      } else if (comparison === VectorClockComparison.CONCURRENT) {
        // Check if the op's client was unknown when the SYNC_IMPORT was created
        const opClientValue = op.vectorClock[op.clientId] ?? 0;
        const importClientValue = latestImport.vectorClock[op.clientId] ?? 0;

        if (importClientValue === 0) {
          // The SYNC_IMPORT didn't know about this client at all
          // This op is NOT "pre-import state" - it's from a parallel branch
          // that the import didn't include. Keep it and apply.
          OpLog.verbose(
            `SyncImportFilterService: Keeping CONCURRENT op ${op.id} - ` +
              `client ${op.clientId} was unknown to SYNC_IMPORT`,
          );
          validOps.push(op);
        } else if (opClientValue > importClientValue) {
          // The op's client counter is higher than what the import knew about
          // This means the op was created AFTER the import's knowledge of this client
          OpLog.verbose(
            `SyncImportFilterService: Keeping CONCURRENT op ${op.id} - ` +
              `client counter ${opClientValue} > import's ${importClientValue}`,
          );
          validOps.push(op);
        } else {
          // The op was created before or at the import's knowledge level for this client
          // AND the import has entries the op doesn't know about
          // This is truly pre-import state - filter it
          invalidatedOps.push(op);
        }
      } else {
        // LESS_THAN: Op is dominated by import - definitely pre-import state
        invalidatedOps.push(op);
      }
    }

    return { validOps, invalidatedOps };
  }
}
