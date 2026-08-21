import { TestBed } from '@angular/core/testing';
import { SuperSyncDevicesService } from './super-sync-devices.service';
import { SyncProviderManager } from '../../op-log/sync-providers/provider-manager.service';
import { ClientIdService } from '../../core/util/client-id.service';
import { SyncProviderId } from '../../op-log/sync-providers/provider.const';

describe('SuperSyncDevicesService', () => {
  let service: SuperSyncDevicesService;
  let providerManager: jasmine.SpyObj<SyncProviderManager>;
  let getDevices: jasmine.Spy;
  let signOutAllOtherDevices: jasmine.Spy;

  const setUpProvider = (id: SyncProviderId | null): void => {
    providerManager.getActiveProvider.and.returnValue(
      id === null ? null : ({ id, getDevices, signOutAllOtherDevices } as never),
    );
  };

  beforeEach(() => {
    getDevices = jasmine.createSpy('getDevices');
    signOutAllOtherDevices = jasmine.createSpy('signOutAllOtherDevices');
    providerManager = jasmine.createSpyObj('SyncProviderManager', [
      'getActiveProvider',
      'notifyCredentialsRotated',
    ]);
    providerManager.notifyCredentialsRotated.and.resolveTo(undefined);
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

  it('should delegate the sign-out to the provider with the own clientId', async () => {
    signOutAllOtherDevices.and.resolveTo(undefined);

    await service.signOutAllOtherDevices();

    // The clientId lets the server spare this device's WebSocket.
    expect(signOutAllOtherDevices).toHaveBeenCalledOnceWith('E_mine11');
  });

  it('should refresh the provider manager state after a successful sign-out', async () => {
    signOutAllOtherDevices.and.resolveTo(undefined);

    await service.signOutAllOtherDevices();

    // The provider stored the fresh token bypassing the manager — without
    // this, currentProviderPrivateCfg$ consumers keep the revoked token.
    expect(providerManager.notifyCredentialsRotated).toHaveBeenCalledOnceWith(
      SyncProviderId.SuperSync,
    );
  });

  it('should not refresh the manager state when the sign-out failed', async () => {
    signOutAllOtherDevices.and.rejectWith(new Error('boom'));

    await expectAsync(service.signOutAllOtherDevices()).toBeRejected();

    expect(providerManager.notifyCredentialsRotated).not.toHaveBeenCalled();
  });

  it('should reject the sign-out when Super Sync is not the active provider', async () => {
    setUpProvider(SyncProviderId.Dropbox);
    await expectAsync(service.signOutAllOtherDevices()).toBeRejected();
    expect(signOutAllOtherDevices).not.toHaveBeenCalled();
  });
});
