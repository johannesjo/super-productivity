import { SyncProviderId } from '../../../pfapi.const';
import { WebdavBaseProvider } from '../webdav/webdav-base-provider';

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

  // Future: Add SuperSync-specific methods here
  // Example: beginTransaction(), commitTransaction(), etc.
}
