import { TestBed } from '@angular/core/testing';
import { SuperSyncDevicesService } from './super-sync-devices.service';
import { SyncProviderManager } from '../../op-log/sync-providers/provider-manager.service';
import { ClientIdService } from '../../core/util/client-id.service';
import { SyncProviderId } from '../../op-log/sync-providers/provider.const';

describe('SuperSyncDevicesService', () => {
  let service: SuperSyncDevicesService;
  let providerManager: jasmine.SpyObj<SyncProviderManager>;
  let getDevices: jasmine.Spy;

  const setUpProvider = (id: SyncProviderId | null): void => {
    providerManager.getActiveProvider.and.returnValue(
      id === null ? null : ({ id, getDevices } as never),
    );
  };

  beforeEach(() => {
    getDevices = jasmine.createSpy('getDevices');
    providerManager = jasmine.createSpyObj('SyncProviderManager', ['getActiveProvider']);
    TestBed.configureTestingModule({
      providers: [
        SuperSyncDevicesService,
        { provide: SyncProviderManager, useValue: providerManager },
        {
          provide: ClientIdService,
          useValue: { loadClientId: () => Promise.resolve('E_mine11') },
        },
      ],
    });
    service = TestBed.inject(SuperSyncDevicesService);
    setUpProvider(SyncProviderId.SuperSync);
  });

  it('should decode the platform prefix and flag the current device', async () => {
    getDevices.and.resolveTo({
      devices: [
        { clientId: 'E_mine11', lastSeenAt: 3 },
        { clientId: 'A_other1', lastSeenAt: 2 },
        { clientId: 'I_other2', lastSeenAt: 1 },
        { clientId: 'B_other3', lastSeenAt: 0 },
      ],
    });

    const result = await service.getDevices();

    expect(result.map((d) => d.platform)).toEqual(['E', 'A', 'I', 'B']);
    expect(result.map((d) => d.isCurrentDevice)).toEqual([true, false, false, false]);
  });

  it('should keep legacy PFAPI ids, which share the prefix format', async () => {
    getDevices.and.resolveTo({
      devices: [{ clientId: 'E_1699999999999', lastSeenAt: 1 }],
    });

    expect((await service.getDevices())[0].platform).toBe('E');
  });

  it('should report an unrecognised prefix as null rather than guessing', async () => {
    getDevices.and.resolveTo({ devices: [{ clientId: 'Z_weird1', lastSeenAt: 1 }] });

    expect((await service.getDevices())[0].platform).toBeNull();
  });

  it('should throw when Super Sync is not the active provider', async () => {
    setUpProvider(SyncProviderId.Dropbox);
    await expectAsync(service.getDevices()).toBeRejected();

    setUpProvider(null);
    await expectAsync(service.getDevices()).toBeRejected();
  });
});
