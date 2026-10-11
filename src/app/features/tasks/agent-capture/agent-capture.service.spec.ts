import { signal } from '@angular/core';
import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject } from 'rxjs';
import { SyncWrapperService } from '../../../imex/sync/sync-wrapper.service';
import { SyncEpochChangedError } from '../../../op-log/core/errors/sync-errors';
import { SyncProviderId } from '../../../op-log/sync-providers/provider.const';
import { SyncProviderManager } from '../../../op-log/sync-providers/provider-manager.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { CaptureKeyConfig, SyncConfig } from '../../config/global-config.model';
import {
  NativeCaptureImporter,
  NativeCaptureImportResult,
} from '../native-capture/native-capture-importer.service';
import { AgentCaptureService } from './agent-capture.service';

describe('AgentCaptureService', () => {
  const KEY: CaptureKeyConfig = { v: 1, privateKeyPkcs8: 'priv', publicKeySpki: 'pub' };
  let service: AgentCaptureService;
  let syncing$: BehaviorSubject<boolean>;
  let syncCfg: ReturnType<typeof signal<Partial<SyncConfig> | undefined>>;
  let provider: {
    id: SyncProviderId;
    registerCaptureKey: jasmine.Spy;
    disableCaptureKey: jasmine.Spy;
  };
  let importer: jasmine.SpyObj<NativeCaptureImporter>;
  let calls: string[];

  const syncOnce = (): void => {
    syncing$.next(true);
    syncing$.next(false);
  };

  beforeEach(() => {
    calls = [];
    const record = (name: string) => async (): Promise<void> => {
      calls.push(name);
    };
    syncing$ = new BehaviorSubject(false);
    syncCfg = signal<Partial<SyncConfig> | undefined>({ captureKey: KEY });
    provider = {
      id: SyncProviderId.SuperSync,
      registerCaptureKey: jasmine.createSpy().and.resolveTo('registered'),
      disableCaptureKey: jasmine.createSpy().and.callFake(record('disable')),
    };
    importer = jasmine.createSpyObj<NativeCaptureImporter>('Importer', ['importPending']);
    importer.importPending.and.resolveTo({ created: 0, invalid: 0 });

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: NativeCaptureImporter, useValue: importer },
        {
          provide: GlobalConfigService,
          useValue: {
            sync: syncCfg,
            updateSection: jasmine
              .createSpy('updateSection')
              .and.callFake((_: string, cfg: Partial<SyncConfig>) => {
                calls.push(`update:${cfg.captureKey === null ? 'null' : 'key'}`);
              }),
          },
        },
        {
          provide: SyncProviderManager,
          useValue: {
            getActiveProvider: () => provider,
            syncEpoch: 1,
            assertSyncEpochUnchanged: () => undefined,
          },
        },
        {
          provide: SyncWrapperService,
          useValue: { isSyncInProgress$: syncing$ },
        },
      ],
    });
    service = TestBed.inject(AgentCaptureService);
  });

  it('imports after a sync, at most once a minute with one trailing run', fakeAsync(() => {
    service.start();
    syncOnce();
    flushMicrotasks();
    expect(importer.importPending).toHaveBeenCalledTimes(1);

    syncOnce();
    syncOnce();
    flushMicrotasks();
    expect(importer.importPending).toHaveBeenCalledTimes(1);

    tick(60_000);
    expect(importer.importPending).toHaveBeenCalledTimes(2);
    tick(60_000);
  }));

  it('does not import while capture is off or another provider is active', fakeAsync(() => {
    service.start();
    syncCfg.set({ captureKey: null });
    syncOnce();
    tick(60_000);
    syncCfg.set({ captureKey: KEY });
    provider.id = SyncProviderId.WebDAV;
    syncOnce();
    tick(60_000);
    expect(importer.importPending).not.toHaveBeenCalled();
  }));

  it('keeps importing after a failed or fenced run', fakeAsync(() => {
    // Created lazily: an eager Promise.reject is an unhandled rejection.
    const outcomes: Array<() => Promise<NativeCaptureImportResult>> = [
      () => Promise.reject(new SyncEpochChangedError(1, 2, 'createTask')),
      () => Promise.reject(new Error('offline')),
      () => Promise.resolve({ created: 1, invalid: 0 }),
    ];
    importer.importPending.and.callFake(() =>
      (outcomes.shift() as (typeof outcomes)[0])(),
    );
    service.start();
    for (let i = 0; i < 3; i++) {
      syncOnce();
      tick(60_000);
    }
    expect(importer.importPending).toHaveBeenCalledTimes(3);
  }));

  it('switches on with a fresh key synced first, then registered', async () => {
    await service.switchOn();
    expect(calls).toEqual(['update:key']);
    const [, cfg] = (
      TestBed.inject(GlobalConfigService).updateSection as jasmine.Spy
    ).calls.mostRecent().args;
    expect(provider.registerCaptureKey).toHaveBeenCalledWith(
      cfg.captureKey.publicKeySpki,
    );
  });

  it('switches off: disables the server key, then clears the synced key', async () => {
    await service.switchOff();
    expect(calls).toEqual(['disable', 'update:null']);
  });

  it('keeps the synced key when the server could not be told', async () => {
    provider.disableCaptureKey.and.rejectWith(new Error('offline'));
    await expectAsync(service.switchOff()).toBeRejected();
    expect(calls).toEqual([]);
  });
});
