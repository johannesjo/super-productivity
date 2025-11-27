import { SyncProviderId } from '../../../pfapi.const';
import { WebdavBaseProvider } from '../webdav/webdav-base-provider';
import { WebdavPrivateCfg } from '../webdav/webdav.model';

/**
 * SuperSync provider - a WebDAV-based sync provider with enhanced capabilities.
 *
 * Current features (Phase 0):
 * - Standard WebDAV synchronization
 *
 * Planned features:
 * - Phase 1: Safe sync operations with transaction support
 * - Phase 2: Incremental updates for faster sync
 *
 * @see docs/sync/SYNC-PLAN.md for full roadmap
 */
export class SuperSyncProvider extends WebdavBaseProvider<SyncProviderId.SuperSync> {
  readonly id = SyncProviderId.SuperSync;

  protected override get logLabel(): string {
    return 'SuperSyncProvider';
  }

  override async isReady(): Promise<boolean> {
    const privateCfg = await this.privateCfg.load();
    return !!(
      privateCfg &&
      privateCfg.userName &&
      privateCfg.baseUrl &&
      privateCfg.password
    );
  }

  protected override _getFilePath(targetPath: string, cfg: WebdavPrivateCfg): string {
    const parts: string[] = [];
    if (this._extraPath) {
      parts.push(this._extraPath);
    }
    parts.push(targetPath);
    return parts.join('/').replace(/\/+/g, '/');
  }

  // Future: Add SuperSync-specific methods here
  // Example: beginTransaction(), commitTransaction(), etc.
}
