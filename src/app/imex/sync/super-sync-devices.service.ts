import { Injectable, inject } from '@angular/core';
import { SuperSyncDeviceInfo, SuperSyncProvider } from '@sp/sync-providers/super-sync';
import { SyncProviderId } from '../../op-log/sync-providers/provider.const';
import { SyncProviderManager } from '../../op-log/sync-providers/provider-manager.service';
import { ClientIdService } from '../../core/util/client-id.service';
import {
  PlatformCode,
  getClientIdPlatformCode,
} from '../../core/util/generate-client-id';

export interface SyncDeviceListEntry extends SuperSyncDeviceInfo {
  /** Platform the device minted its clientId on, or null for an unknown prefix. */
  platform: PlatformCode | null;
  isCurrentDevice: boolean;
}

/**
 * The devices syncing this SuperSync account, and the account-wide sign-out.
 *
 * There is deliberately no "remove device" action: a SuperSync JWT is
 * account-wide (single `tokenVersion`, 365-day expiry) and nothing authorises
 * against the device table, so deleting a row would revoke no access while
 * telling the user it had. The server's only revocation primitive is
 * `POST /api/replace-token` (`signOutAllOtherDevices()` here), which
 * invalidates every token at once and hands this client a fresh one —
 * per-device revocation would need per-device tokens first. See issue #9652.
 */
@Injectable({ providedIn: 'root' })
export class SuperSyncDevicesService {
  private _providerManager = inject(SyncProviderManager);
  private _clientIdService = inject(ClientIdService);

  async getDevices(): Promise<SyncDeviceListEntry[]> {
    const provider = this._superSyncProviderOrError();
    const [{ devices }, ownClientId] = await Promise.all([
      provider.getDevices(),
      this._clientIdService.loadClientId(),
    ]);

    return devices.map((device) => ({
      ...device,
      platform: getClientIdPlatformCode(device.clientId),
      isCurrentDevice: device.clientId === ownClientId,
    }));
  }

  /**
   * Signs every other device out of the account; this device stays signed
   * in on a fresh token. Other devices stop syncing on their next request
   * and need a newly issued token to reconnect. Local changes made on them
   * while signed out are kept and upload after re-authenticating.
   */
  async signOutAllOtherDevices(): Promise<void> {
    const provider = this._superSyncProviderOrError();
    // Sent so the server spares this device's WebSocket when it closes the
    // account's sockets (the revoked-close code is terminal client-side).
    const ownClientId = await this._clientIdService.loadClientId();
    await provider.signOutAllOtherDevices(ownClientId ?? undefined);
    // The provider stored the fresh token through its own credential store,
    // bypassing SyncProviderManager — without this, the settings-form seed
    // and the Android credential bridge keep the revoked token until restart.
    await this._providerManager.notifyCredentialsRotated(SyncProviderId.SuperSync);
  }

  private _superSyncProviderOrError(): SuperSyncProvider {
    const provider = this._providerManager.getActiveProvider();
    if (!provider || provider.id !== SyncProviderId.SuperSync) {
      throw new Error('Super Sync is not the active sync provider');
    }
    return provider as SuperSyncProvider;
  }
}
