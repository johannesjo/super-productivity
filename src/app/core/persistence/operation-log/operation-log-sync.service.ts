import { inject, Injectable } from '@angular/core';
import { OperationLogStoreService } from './operation-log-store.service';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { LockService } from './lock.service';
import {
  ConflictResult,
  EntityConflict,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  EntityType,
  Operation,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  OperationLogEntry,
  VectorClock,
} from './operation.types';
import {
  compareVectorClocks,
  mergeVectorClocks,
  VectorClockComparison,
} from '../../../pfapi/api/util/vector-clock';
import { DependencyResolverService } from './dependency-resolver.service';
import { PFLog } from '../../log';
import { chunkArray } from '../../../util/chunk-array';
import { convertOpToAction } from './operation-converter.util';

/**
 * Manages the synchronization of the Operation Log with remote storage.
 * This service handles uploading local pending operations, downloading remote operations,
 * and detecting conflicts between local and remote changes based on vector clocks.
 */
@Injectable({
  providedIn: 'root',
})
export class OperationLogSyncService {
  private opLogStore = inject(OperationLogStoreService);
  private pfapiService = inject(PfapiService);
  private lockService = inject(LockService);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private dependencyResolver = inject(DependencyResolverService);

  async uploadPendingOps(): Promise<void> {
    PFLog.normal('OperationLogSyncService: Uploading pending operations...');
    await this.lockService.request('sp_op_log_upload', async () => {
      const pendingOps = await this.opLogStore.getUnsynced();

      if (pendingOps.length === 0) {
        PFLog.normal('OperationLogSyncService: No pending operations to upload.');
        return;
      }

      // Batch into chunks (e.g., 100 ops per file for WebDAV)
      // Max file size for some providers is limited, also too many files slow down directory listing
      const MAX_OPS_PER_FILE = 100;
      const chunks = chunkArray(pendingOps, MAX_OPS_PER_FILE);
      const syncProvider = this.pfapiService.pf.getActiveSyncProvider();

      if (!syncProvider) {
        PFLog.warn('OperationLogSyncService: No active sync provider for upload.');
        return;
      }

      for (const chunk of chunks) {
        // Filename format: ops_CLIENTID_TIMESTAMP.json
        const filename = `ops_${chunk[0].op.clientId}_${chunk[0].op.timestamp}.json`;
        PFLog.normal(
          `OperationLogSyncService: Uploading ${chunk.length} ops to ${filename}`,
        );
        await syncProvider.uploadFile(filename, JSON.stringify(chunk), null);

        // Mark as synced
        await this.opLogStore.markSynced(chunk.map((e) => e.seq));
      }

      // TODO: Update remote manifest (as per plan Section 4.3.1)
      // This will be part of the actual sync provider integration later.
      PFLog.normal(
        `OperationLogSyncService: Successfully uploaded ${pendingOps.length} operations.`,
      );
    });
  }

  async downloadRemoteOps(): Promise<void> {
    PFLog.normal('OperationLogSyncService: Downloading remote operations...');
    await this.lockService.request('sp_op_log_download', async () => {
      const syncProvider = this.pfapiService.pf.getActiveSyncProvider();

      if (!syncProvider) {
        PFLog.warn('OperationLogSyncService: No active sync provider for download.');
        return;
      }

      // Check if syncProvider supports listFiles
      if (!syncProvider.listFiles) {
        PFLog.warn(
          'OperationLogSyncService: Active sync provider does not support listFiles. Skipping OL download.',
        );
        return;
      }

      const OPS_DIR = 'ops/';
      let remoteOpFileNames: string[] = [];
      try {
        remoteOpFileNames = await syncProvider.listFiles(OPS_DIR);
        // Filter only relevant op files
        remoteOpFileNames = remoteOpFileNames.filter(
          (name) => name.startsWith('ops_') && name.endsWith('.json'),
        );
      } catch (e) {
        PFLog.error('OperationLogSyncService: Failed to list remote operation files', e);
        return;
      }

      if (remoteOpFileNames.length === 0) {
        PFLog.normal('OperationLogSyncService: No remote operation files found.');
        return;
      }

      const appliedOpIds = await this.opLogStore.getAppliedOpIds();
      const appliedFrontierByEntity = await this.opLogStore.getEntityFrontier();

      const allRemoteOps: Operation[] = [];
      for (const filename of remoteOpFileNames) {
        try {
          const fileContent = await syncProvider.downloadFile(OPS_DIR + filename);
          const chunk = JSON.parse(fileContent.dataStr) as OperationLogEntry[];
          // Filter already applied ops from this chunk before adding to allRemoteOps
          const newOpsInChunk = chunk.filter((entry) => !appliedOpIds.has(entry.op.id));
          allRemoteOps.push(...newOpsInChunk.map((entry) => entry.op));
        } catch (e) {
          PFLog.error(
            `OperationLogSyncService: Failed to download or parse remote op file ${filename}`,
            e,
          );
          // Continue with next file
        }
      }

      if (allRemoteOps.length === 0) {
        PFLog.normal(
          'OperationLogSyncService: No new remote operations to download after filtering.',
        );
        return;
      }

      const { nonConflicting, conflicts } = await this.detectConflicts(
        allRemoteOps,
        appliedFrontierByEntity,
      );

      // Apply non-conflicting ops
      for (const op of nonConflicting) {
        if (!(await this.opLogStore.hasOp(op.id))) {
          await this.opLogStore.append(op, 'remote');
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const action = convertOpToAction(op);
        // TODO: Dispatching action will be handled by a dedicated apply service in Phase 3/4
        // For now, just logging
        PFLog.verbose(
          `OperationLogSyncService: Dispatching non-conflicting remote op: ${op.id}`,
        );
        // this.store.dispatch(action); // Actual dispatch happens here in a dedicated service
        await this.opLogStore.markApplied(op.id);
      }

      // Handle conflicts
      if (conflicts.length > 0) {
        PFLog.warn(
          `OperationLogSyncService: Detected ${conflicts.length} conflicts.`,
          conflicts,
        );
        // TODO: Conflict resolution UI (as per plan Section 4.3.2)
      }

      PFLog.normal(
        `OperationLogSyncService: Downloaded and processed remote operations.`,
      );
    });
  }

  async detectConflicts(
    remoteOps: Operation[],
    appliedFrontierByEntity: Map<string, VectorClock>,
  ): Promise<ConflictResult> {
    const localPendingOpsByEntity = await this.opLogStore.getUnsyncedByEntity();
    const conflicts: EntityConflict[] = [];
    const nonConflicting: Operation[] = [];

    for (const remoteOp of remoteOps) {
      const entityIdsToCheck =
        remoteOp.entityIds || (remoteOp.entityId ? [remoteOp.entityId] : []);
      let isConflicting = false;

      for (const entityId of entityIdsToCheck) {
        const entityKey = `${remoteOp.entityType}:${entityId}`;
        const localOpsForEntity = localPendingOpsByEntity.get(entityKey) || [];
        const appliedFrontier = appliedFrontierByEntity.get(entityKey); // latest applied vector per entity

        // Build the frontier from everything we know locally (applied + pending)
        const allClocks = [
          ...(appliedFrontier ? [appliedFrontier] : []),
          ...localOpsForEntity.map((op) => op.vectorClock),
        ];
        const localFrontier = allClocks.reduce(
          (acc, clock) => mergeVectorClocks(acc, clock),
          {},
        );

        const vcComparison = compareVectorClocks(localFrontier, remoteOp.vectorClock);

        if (vcComparison === VectorClockComparison.CONCURRENT) {
          // True conflict - same entity modified independently
          conflicts.push({
            entityType: remoteOp.entityType,
            entityId: entityId, // Conflicting entity ID
            localOps: localOpsForEntity,
            remoteOps: [remoteOp],
            suggestedResolution: 'manual', // Default to manual for now
            // TODO: implement suggestResolution
          });
          isConflicting = true;
          break; // Conflict for this remoteOp, move to next remoteOp
        }
      }

      if (!isConflicting) {
        // One happened before the other - can be auto-resolved
        nonConflicting.push(remoteOp);
      }
    }
    return { nonConflicting, conflicts };
  }
}
