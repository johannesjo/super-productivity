import { TestBed } from '@angular/core/testing';
import type { PendingAgentCapture } from '@sp/sync-providers/provider-types';
import { DownloadOutcome } from '../core/types/sync-results.types';
import { OperationSyncCapable } from '../sync-providers/provider.interface';
import { SyncProviderManager } from '../sync-providers/provider-manager.service';
import { AgentCaptureDeliveryService } from './agent-capture-delivery.service';
import { AgentCapturePreparationService } from './agent-capture-preparation.service';
import { OperationLogSyncService } from './operation-log-sync.service';
import { SyncSessionValidationService } from './sync-session-validation.service';

describe('AgentCaptureDeliveryService', () => {
  const options = { forceFromSeq0: true, isNeverSynced: true, fenceEpoch: 3 };
  const pending: PendingAgentCapture = {
    captureId: 'queued',
    title: 'Capture',
    notes: null,
    publisherClientId: 'agent-capture-1',
    captureCounter: 0,
    dataGeneration: 0,
    encryptionBaseline: { opId: 'baseline', serverSeq: 4 },
  };
  let service: AgentCaptureDeliveryService;
  let sync: jasmine.SpyObj<OperationLogSyncService>;
  let preparation: jasmine.SpyObj<AgentCapturePreparationService>;
  let manager: jasmine.SpyObj<SyncProviderManager>;
  let validation: jasmine.SpyObj<SyncSessionValidationService>;
  let provider: jasmine.SpyObj<Required<OperationSyncCapable>>;

  beforeEach(() => {
    sync = jasmine.createSpyObj('OperationLogSyncService', ['downloadRemoteOps']);
    sync.downloadRemoteOps.and.resolveTo({ kind: 'no_new_ops' });
    preparation = jasmine.createSpyObj('AgentCapturePreparationService', ['prepare']);
    preparation.prepare.and.resolveTo({ captureId: pending.captureId } as Awaited<
      ReturnType<AgentCapturePreparationService['prepare']>
    >);
    manager = jasmine.createSpyObj('SyncProviderManager', ['assertSyncEpochUnchanged']);
    validation = jasmine.createSpyObj('SyncSessionValidationService', ['hasFailed']);
    validation.hasFailed.and.returnValue(false);
    provider = jasmine.createSpyObj(
      'provider',
      ['supportsCaptureDelivery', 'readPendingCapture', 'publishCapture'],
      { providerMode: 'superSyncOps' },
    );
    provider.supportsCaptureDelivery!.and.returnValue(true);
    provider.readPendingCapture!.and.returnValues(
      Promise.resolve(pending),
      Promise.resolve(null),
    );
    provider.publishCapture!.and.resolveTo({
      status: 'published',
      receipt: { captureId: 'queued', opId: 'accepted', serverSeq: 99 },
    });
    TestBed.configureTestingModule({
      providers: [
        AgentCaptureDeliveryService,
        { provide: OperationLogSyncService, useValue: sync },
        { provide: AgentCapturePreparationService, useValue: preparation },
        { provide: SyncProviderManager, useValue: manager },
        { provide: SyncSessionValidationService, useValue: validation },
      ],
    });
    service = TestBed.inject(AgentCaptureDeliveryService);
  });

  it('does not poll older or disabled servers', async () => {
    provider.supportsCaptureDelivery!.and.returnValue(false);
    const result = await service.downloadRemoteOps(provider, options);
    expect(sync.downloadRemoteOps).toHaveBeenCalledOnceWith(provider, options);
    expect(provider.readPendingCapture).not.toHaveBeenCalled();
    expect(result.captureDeliveryDeferred).toBeFalse();
  });

  it('finishes when the queue is empty', async () => {
    provider.readPendingCapture!.and.resolveTo(null);
    const result = await service.downloadRemoteOps(provider, options);
    expect(provider.readPendingCapture).toHaveBeenCalledTimes(1);
    expect(provider.publishCapture).not.toHaveBeenCalled();
    expect(result.captureDeliveryDeferred).toBeFalse();
  });

  it('receives publication through ordered download and retains all local-win counts', async () => {
    sync.downloadRemoteOps.and.returnValues(
      Promise.resolve({ kind: 'ops_processed', newOpsCount: 2, localWinOpsCreated: 1 }),
      Promise.resolve({ kind: 'ops_processed', newOpsCount: 1, localWinOpsCreated: 2 }),
    );
    const result = await service.downloadRemoteOps(provider, options);
    expect(preparation.prepare).toHaveBeenCalledOnceWith(pending, provider, 3);
    expect(sync.downloadRemoteOps.calls.argsFor(1)).toEqual([
      provider,
      { isNeverSynced: true, fenceEpoch: 3 },
    ]);
    expect(provider.publishCapture).toHaveBeenCalledTimes(1);
    expect(result.localWinOpsCreated).toBe(3);
    expect(result.didDownloadChanges).toBeTrue();
    expect(result.captureDeliveryDeferred).toBeFalse();
  });

  it('defers the remaining queue after ten publications', async () => {
    provider.readPendingCapture!.and.resolveTo(pending);
    const result = await service.downloadRemoteOps(provider, options);
    expect(provider.publishCapture).toHaveBeenCalledTimes(10);
    expect(sync.downloadRemoteOps).toHaveBeenCalledTimes(11);
    expect(result.captureDeliveryDeferred).toBeTrue();
  });

  it('defers a capture when no encrypted baseline is available', async () => {
    provider.readPendingCapture!.and.resolveTo({
      ...pending,
      encryptionBaseline: undefined,
    });
    const result = await service.downloadRemoteOps(provider, options);
    expect(preparation.prepare).not.toHaveBeenCalled();
    expect(provider.publishCapture).not.toHaveBeenCalled();
    expect(result.captureDeliveryDeferred).toBeTrue();
  });

  it('defers a rejected candidate for a fresh queue read next cycle', async () => {
    provider.publishCapture!.and.resolveTo({ status: 'rejected', error: 'stale' });
    const result = await service.downloadRemoteOps(provider, options);
    expect(sync.downloadRemoteOps).toHaveBeenCalledTimes(1);
    expect(result.captureDeliveryDeferred).toBeTrue();
  });

  for (const kind of [
    'cancelled',
    'blocked_incompatible',
    'server_migration_skipped',
    'server_migration_handled',
  ] as const) {
    it(`does not publish after ${kind}`, async () => {
      sync.downloadRemoteOps.and.resolveTo({ kind } as DownloadOutcome);
      expect((await service.downloadRemoteOps(provider, options)).outcome.kind).toBe(
        kind,
      );
      expect(provider.readPendingCapture).not.toHaveBeenCalled();
    });
  }

  it('returns a blocked post-publication download to the ordinary wrapper gates', async () => {
    sync.downloadRemoteOps.and.returnValues(
      Promise.resolve({ kind: 'no_new_ops' }),
      Promise.resolve({ kind: 'blocked_incompatible' }),
    );
    expect((await service.downloadRemoteOps(provider, options)).outcome.kind).toBe(
      'blocked_incompatible',
    );
    expect(provider.readPendingCapture).toHaveBeenCalledTimes(1);
  });

  it('defers a lost publication response without blocking ordinary sync', async () => {
    provider.publishCapture!.and.rejectWith(new Error('lost response'));
    const result = await service.downloadRemoteOps(provider, options);
    expect(result.outcome).toEqual({ kind: 'no_new_ops' });
    expect(sync.downloadRemoteOps).toHaveBeenCalledTimes(1);
    expect(provider.publishCapture).toHaveBeenCalledTimes(1);
    expect(result.captureDeliveryDeferred).toBeTrue();
  });

  it('does not consume after session validation fails', async () => {
    validation.hasFailed.and.returnValue(true);
    await service.downloadRemoteOps(provider, options);
    expect(provider.readPendingCapture).not.toHaveBeenCalled();
  });

  it('does not publish a queue response received after the epoch changed', async () => {
    manager.assertSyncEpochUnchanged.and.callFake((_epoch, context) => {
      if (context === 'capture queue ready' || context === 'capture deferred')
        throw new Error('changed epoch');
    });
    await expectAsync(service.downloadRemoteOps(provider, options)).toBeRejectedWithError(
      'changed epoch',
    );
    expect(preparation.prepare).not.toHaveBeenCalled();
    expect(provider.publishCapture).not.toHaveBeenCalled();
  });
});
