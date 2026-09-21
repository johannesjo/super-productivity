import { inject, Injectable, Injector } from '@angular/core';
import { SyncLog } from '../../core/log';
import { SyncEpochChangedError } from '../core/errors/sync-errors';
import { DownloadOutcome } from '../core/types/sync-results.types';
import { OperationSyncCapable } from '../sync-providers/provider.interface';
import { SyncProviderManager } from '../sync-providers/provider-manager.service';
import { AgentCapturePreparationService } from './agent-capture-preparation.service';
import { OperationLogSyncService } from './operation-log-sync.service';
import { SyncSessionValidationService } from './sync-session-validation.service';

interface CaptureDownloadOptions {
  forceFromSeq0?: boolean;
  isNeverSynced: boolean;
  fenceEpoch: number;
}

interface CaptureDownloadResult {
  outcome: DownloadOutcome;
  localWinOpsCreated: number;
  didDownloadChanges: boolean;
  captureDeliveryDeferred: boolean;
}

// Keep a large offline queue from monopolizing one foreground sync cycle.
const MAX_CAPTURES_PER_SYNC = 10;

/** Runs inside the wrapper's existing sync cycle and validation session. */
@Injectable({ providedIn: 'root' })
export class AgentCaptureDeliveryService {
  private readonly sync = inject(OperationLogSyncService);
  private readonly manager = inject(SyncProviderManager);
  private readonly validation = inject(SyncSessionValidationService);
  private readonly injector = inject(Injector);

  async downloadRemoteOps(
    provider: OperationSyncCapable,
    options: CaptureDownloadOptions,
  ): Promise<CaptureDownloadResult> {
    const result: CaptureDownloadResult = {
      outcome: await this.sync.downloadRemoteOps(provider, options),
      localWinOpsCreated: 0,
      didDownloadChanges: false,
      captureDeliveryDeferred: false,
    };
    this.addDownloadResult(result);
    if (
      provider.providerMode !== 'superSyncOps' ||
      !provider.supportsCaptureDelivery?.() ||
      !provider.readPendingCapture ||
      !provider.publishCapture
    ) {
      return result;
    }

    for (let count = 0; count < MAX_CAPTURES_PER_SYNC; count++) {
      // Empty-server migration must upload its baseline before capture can use it.
      if (
        (result.outcome.kind !== 'no_new_ops' &&
          result.outcome.kind !== 'ops_processed') ||
        this.validation.hasFailed()
      ) {
        return result;
      }
      try {
        this.manager.assertSyncEpochUnchanged(options.fenceEpoch, 'capture queue read');
        const pending = await provider.readPendingCapture();
        this.manager.assertSyncEpochUnchanged(options.fenceEpoch, 'capture queue ready');
        if (!pending) return result;
        if (!pending.encryptionBaseline) break;
        // TaskService is only resolved for a pending capture, keeping ordinary
        // sync startup free of an additional eager feature-service dependency.
        const prepared = await this.injector
          .get(AgentCapturePreparationService)
          .prepare(pending, provider, options.fenceEpoch);
        this.manager.assertSyncEpochUnchanged(options.fenceEpoch, 'capture publication');
        const publication = await provider.publishCapture(prepared);
        this.manager.assertSyncEpochUnchanged(options.fenceEpoch, 'capture published');
        if (publication.status === 'rejected') {
          // Another publisher or replacement may have won. Rebuild next cycle
          // from a fresh queue read; never reuse the stale candidate/cursor pair.
          break;
        }
      } catch (error) {
        if (error instanceof SyncEpochChangedError) throw error;
        this.manager.assertSyncEpochUnchanged(options.fenceEpoch, 'capture deferred');
        // Capture is optional; a failed request leaves its queue item/receipt
        // durable and must not prevent ordinary local operations from uploading.
        // Do not log the error object: transport errors can contain submitted text.
        SyncLog.warn('Capture delivery deferred until the next sync');
        break;
      }

      // The receipt grants no local durability or cursor advancement. Even after
      // competing publication, download every intervening op through normal replay.
      result.outcome = await this.sync.downloadRemoteOps(provider, {
        isNeverSynced: options.isNeverSynced,
        fenceEpoch: options.fenceEpoch,
      });
      this.addDownloadResult(result);
    }
    // A failed attempt or a full batch leaves queue work for another cycle.
    // At the cap, conservatively defer without another queue request.
    result.captureDeliveryDeferred = true;
    return result;
  }

  private addDownloadResult(result: CaptureDownloadResult): void {
    const outcome = result.outcome;
    if (outcome.kind === 'ops_processed') {
      result.localWinOpsCreated += outcome.localWinOpsCreated;
      result.didDownloadChanges ||= outcome.newOpsCount > 0;
    } else if (
      outcome.kind === 'snapshot_hydrated' ||
      outcome.kind === 'server_migration_handled'
    ) {
      result.didDownloadChanges = true;
    }
  }
}
