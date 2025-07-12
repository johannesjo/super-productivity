/**
 * Models for UI-background communication
 */

import { SyncConfig } from '../../shared/types';

export interface MessageCallbacks {
  onConfigUpdated: (config: SyncConfig) => Promise<void>;
  onSyncNow: () => Promise<void>;
}
