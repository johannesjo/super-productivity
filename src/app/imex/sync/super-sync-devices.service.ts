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
 * Read-only view of the devices syncing this SuperSync account.
 *
 * There is deliberately no "remove device" counterpart: a SuperSync JWT is
 * account-wide (single `tokenVersion`, 365-day expiry) and nothing authorises
 * against the device table, so deleting a row would revoke no access while
 * telling the user it had. The server's only revocation primitive is
 * `POST /api/replace-token`, which invalidates every device's token at once
 * and has no client UI yet — per-device revocation needs per-device tokens
 * first. See issue #9652.
 */
@Injectable({ providedIn: 'root' })
export class SuperSyncDevicesService {
  private _providerManager = inject(SyncProviderManager);
  private _clientIdService = inject(ClientIdService);

  async getDevices(): Promise<SyncDeviceListEntry[]> {
    const provider = this._providerManager.getActiveProvider();
    if (!provider || provider.id !== SyncProviderId.SuperSync) {
      throw new Error('Super Sync is not the active sync provider');
    }

    const [{ devices }, ownClientId] = await Promise.all([
      (provider as SuperSyncProvider).getDevices(),
      this._clientIdService.loadClientId(),
    ]);

    return devices.map((device) => ({
      ...device,
      platform: getClientIdPlatformCode(device.clientId),
      isCurrentDevice: device.clientId === ownClientId,
    }));
  }
}
