import { SyncProviderId } from '../../../pfapi.const';
import {
  SyncProviderServiceInterface,
  FileRevResponse,
  FileDownloadResponse,
  OperationSyncCapable,
  SyncOperation,
  OpUploadResponse,
  OpDownloadResponse,
} from '../../sync-provider.interface';
import { SyncProviderPrivateCfgStore } from '../../sync-provider-private-cfg-store';
import { SuperSyncPrivateCfg } from './super-sync.model';
import { MissingCredentialsSPError } from '../../../errors/errors';
import { SyncLog } from '../../../../../core/log';

const LAST_SERVER_SEQ_KEY_PREFIX = 'super_sync_last_server_seq_';

/**
 * SuperSync provider - operation-based sync provider.
 *
 * This provider uses operation-based sync exclusively (no file-based sync).
 * All data is synchronized through the operations API.
 *
 * @see docs/sync/SYNC-PLAN.md for full roadmap
 */
export class SuperSyncProvider
  implements SyncProviderServiceInterface<SyncProviderId.SuperSync>, OperationSyncCapable
{
  readonly id = SyncProviderId.SuperSync;
  readonly isUploadForcePossible = false;
  readonly maxConcurrentRequests = 10;
  readonly supportsOperationSync = true;

  public privateCfg!: SyncProviderPrivateCfgStore<SyncProviderId.SuperSync>;

  constructor(_basePath?: string) {
    // basePath is ignored - SuperSync uses operation-based sync only
  }

  private get logLabel(): string {
    return 'SuperSyncProvider';
  }

  async isReady(): Promise<boolean> {
    const cfg = await this.privateCfg.load();
    return !!(cfg && cfg.baseUrl && cfg.accessToken);
  }

  async setPrivateCfg(cfg: SuperSyncPrivateCfg): Promise<void> {
    await this.privateCfg.setComplete(cfg);
  }

  // === File Operations (Not supported - use operation sync instead) ===

  async getFileRev(
    _targetPath: string,
    _localRev: string | null,
  ): Promise<FileRevResponse> {
    throw new Error(
      'SuperSync uses operation-based sync only. File operations not supported.',
    );
  }

  async downloadFile(_targetPath: string): Promise<FileDownloadResponse> {
    throw new Error(
      'SuperSync uses operation-based sync only. File operations not supported.',
    );
  }

  async uploadFile(
    _targetPath: string,
    _dataStr: string,
    _localRev: string | null,
    _isForceOverwrite?: boolean,
  ): Promise<FileRevResponse> {
    throw new Error(
      'SuperSync uses operation-based sync only. File operations not supported.',
    );
  }

  async removeFile(_targetPath: string): Promise<void> {
    throw new Error(
      'SuperSync uses operation-based sync only. File operations not supported.',
    );
  }

  async listFiles(_dirPath: string): Promise<string[]> {
    throw new Error(
      'SuperSync uses operation-based sync only. File operations not supported.',
    );
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
    const key = await this._getServerSeqKey();
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : 0;
  }

  async setLastServerSeq(seq: number): Promise<void> {
    const key = await this._getServerSeqKey();
    localStorage.setItem(key, String(seq));
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

  // === Private Helper Methods ===

  private async _cfgOrError(): Promise<SuperSyncPrivateCfg> {
    const cfg = await this.privateCfg.load();
    if (!cfg) {
      throw new MissingCredentialsSPError();
    }
    return cfg;
  }

  /**
   * Generates a storage key unique to this server URL to avoid conflicts
   * when switching between different accounts or servers.
   */
  private async _getServerSeqKey(): Promise<string> {
    const cfg = await this.privateCfg.load();
    const baseUrl = cfg?.baseUrl ?? 'default';
    const hash = baseUrl
      .split('')
      .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
      .toString(16);
    return `${LAST_SERVER_SEQ_KEY_PREFIX}${hash}`;
  }

  private async _fetchApi<T>(
    cfg: SuperSyncPrivateCfg,
    path: string,
    options: RequestInit,
  ): Promise<T> {
    const baseUrl = cfg.baseUrl.replace(/\/$/, '');
    const url = `${baseUrl}${path}`;

    const headers = new Headers(options.headers as HeadersInit);
    headers.set('Content-Type', 'application/json');
    headers.set('Authorization', `Bearer ${cfg.accessToken}`);

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
