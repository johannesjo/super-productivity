import { SyncProviderId } from '../../../pfapi.const';
import { WebdavBaseProvider } from '../webdav/webdav-base-provider';
import { WebdavPrivateCfg } from '../webdav/webdav.model';
import {
  OperationSyncCapable,
  SyncOperation,
  OpUploadResponse,
  OpDownloadResponse,
} from '../../sync-provider.interface';
import { SyncLog } from '../../../../../core/log';

const LAST_SERVER_SEQ_KEY = 'super_sync_last_server_seq';

/**
 * SuperSync provider - a WebDAV-based sync provider with enhanced capabilities.
 *
 * Features:
 * - Standard WebDAV synchronization for file-based sync
 * - Operation-based sync via REST API (OperationSyncCapable)
 *
 * @see docs/sync/SYNC-PLAN.md for full roadmap
 */
export class SuperSyncProvider
  extends WebdavBaseProvider<SyncProviderId.SuperSync>
  implements OperationSyncCapable
{
  readonly id = SyncProviderId.SuperSync;
  readonly supportsOperationSync = true;

  protected override get logLabel(): string {
    return 'SuperSyncProvider';
  }

  override async isReady(): Promise<boolean> {
    const privateCfg = await this.privateCfg.load();
    return !!(privateCfg && privateCfg.baseUrl && privateCfg.accessToken);
  }

  protected override _getFilePath(targetPath: string, cfg: WebdavPrivateCfg): string {
    const parts: string[] = [];
    if (this._extraPath) {
      parts.push(this._extraPath);
    }
    parts.push(targetPath);
    return parts.join('/').replace(/\/+/g, '/');
  }

  // === Operation Sync Implementation ===

  async uploadOps(
    ops: SyncOperation[],
    clientId: string,
    lastKnownServerSeq?: number,
  ): Promise<OpUploadResponse> {
    SyncLog.debug(this.logLabel, 'uploadOps', { opsCount: ops.length, clientId });
    const cfg = await this._cfgOrError();

    const response = await this._fetchApi<OpUploadResponse>(cfg, '/api/sync/ops', {
      method: 'POST',
      body: JSON.stringify({
        ops,
        clientId,
        lastKnownServerSeq,
      }),
    });

    return response;
  }

  async downloadOps(
    sinceSeq: number,
    excludeClient?: string,
    limit?: number,
  ): Promise<OpDownloadResponse> {
    SyncLog.debug(this.logLabel, 'downloadOps', { sinceSeq, excludeClient, limit });
    const cfg = await this._cfgOrError();

    const params = new URLSearchParams({ sinceSeq: String(sinceSeq) });
    if (excludeClient) {
      params.set('excludeClient', excludeClient);
    }
    if (limit !== undefined) {
      params.set('limit', String(limit));
    }

    const response = await this._fetchApi<OpDownloadResponse>(
      cfg,
      `/api/sync/ops?${params.toString()}`,
      { method: 'GET' },
    );

    return response;
  }

  async getLastServerSeq(): Promise<number> {
    const stored = localStorage.getItem(LAST_SERVER_SEQ_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  async setLastServerSeq(seq: number): Promise<void> {
    localStorage.setItem(LAST_SERVER_SEQ_KEY, String(seq));
  }

  async acknowledgeOps(clientId: string, lastSeq: number): Promise<void> {
    SyncLog.debug(this.logLabel, 'acknowledgeOps', { clientId, lastSeq });
    const cfg = await this._cfgOrError();

    await this._fetchApi<{ acknowledged: boolean }>(
      cfg,
      `/api/sync/devices/${encodeURIComponent(clientId)}/ack`,
      {
        method: 'POST',
        body: JSON.stringify({ lastSeq }),
      },
    );
  }

  // === Helper Methods ===

  private async _fetchApi<T>(
    cfg: WebdavPrivateCfg,
    path: string,
    options: RequestInit,
  ): Promise<T> {
    const baseUrl = cfg.baseUrl.replace(/\/$/, '');
    const url = `${baseUrl}${path}`;

    const headers = new Headers(options.headers as HeadersInit);
    headers.set('Content-Type', 'application/json');
    if (cfg.accessToken) {
      headers.set('Authorization', `Bearer ${cfg.accessToken}`);
    } else if (cfg.userName && cfg.password) {
      // Create Basic auth token from username/password
      const authToken = btoa(`${cfg.userName}:${cfg.password}`);
      headers.set('Authorization', `Basic ${authToken}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `SuperSync API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return response.json() as Promise<T>;
  }
}
