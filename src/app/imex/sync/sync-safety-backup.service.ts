import { inject, Injectable, Injector } from '@angular/core';
import { SyncLog } from '../../core/log';
import { PfapiService } from '../../pfapi/pfapi.service';
import { CompleteBackup } from '../../pfapi/api';
import { Subject } from 'rxjs';
import { nanoid } from 'nanoid';
import { SnackService } from '../../core/snack/snack.service';
import { T } from '../../t.const';

/**
 * Represents a safety backup created before sync updates local data.
 * These backups allow users to recover from problematic sync operations.
 */
export interface SyncSafetyBackup {
  /** Unique identifier for this backup (nanoid) */
  id: string;
  /** Unix timestamp (ms) when the backup was created */
  timestamp: number;
  /** Complete application data snapshot */
  data: CompleteBackup<any>;
  /** Why this backup was created */
  reason: 'BEFORE_UPDATE_LOCAL' | 'MANUAL';
  /** ID of the model that triggered the sync (for debugging) */
  lastChangedModelId?: string | null;
  /** Which models were about to be updated when backup was created */
  modelsToUpdate?: string[];
}

const STORAGE_KEY = 'SYNC_SAFETY_BACKUPS';

// Backup slot strategy:
// - MAX_RECENT_BACKUPS (2): Most recent backups, rolling (newest replaces oldest)
// - Plus 1 "today" slot: Oldest backup from today (preserved until tomorrow)
// - Plus 1 "before today" slot: Most recent backup from before today (preserved)
// This ensures we always have: 2 recent + 1 older-today + 1 older-day = 4 slots max
const MAX_RECENT_BACKUPS = 2;
const TOTAL_BACKUP_SLOTS = 4;

@Injectable({
  providedIn: 'root',
})
export class SyncSafetyBackupService {
  private readonly _injector = inject(Injector);

  // Lazy-loaded PfapiService to avoid circular dependency
  // Chain: PfapiService -> Pfapi -> OperationLogSyncService -> ConflictResolutionService -> SyncSafetyBackupService
  private _pfapiService: PfapiService | null = null;
  private _getPfapiService(): PfapiService {
    if (!this._pfapiService) {
      this._pfapiService = this._injector.get(PfapiService);
    }
    return this._pfapiService;
  }

  // Lazy-loaded SnackService to avoid circular dependency
  private _snackService: SnackService | null = null;
  private _getSnackService(): SnackService {
    if (!this._snackService) {
      this._snackService = this._injector.get(SnackService);
    }
    return this._snackService;
  }

  // Subject to notify components when backups change
  private readonly _backupsChanged$ = new Subject<void>();
  readonly backupsChanged$ = this._backupsChanged$.asObservable();

  constructor() {
    // Defer event subscription to avoid circular dependency during construction
    // Use setTimeout to ensure PfapiService is fully constructed before we access it
    setTimeout(() => {
      this._initEventSubscription();
    }, 0);
  }

  private _initEventSubscription(): void {
    // Subscribe to the onBeforeUpdateLocal event
    this._getPfapiService().pf.ev.on('onBeforeUpdateLocal', async (eventData) => {
      try {
        SyncLog.normal('SyncSafetyBackupService: Received onBeforeUpdateLocal event', {
          modelsToUpdate: eventData.modelsToUpdate,
        });

        const backupId = nanoid();
        if (!this._isValidBackupId(backupId)) {
          throw new Error('Invalid backup ID generated');
        }

        // Get the last changed model from meta-data
        const metaData = await this._getPfapiService().pf.metaModel.load();
        const lastChangedModelId = metaData.lastUpdateAction || null;

        const backup: SyncSafetyBackup = {
          id: backupId,
          timestamp: Date.now(),
          data: eventData.backup,
          reason: 'BEFORE_UPDATE_LOCAL',
          lastChangedModelId,
          modelsToUpdate: eventData.modelsToUpdate,
        };

        await this._saveBackup(backup);
        SyncLog.normal('SyncSafetyBackupService: Backup created before UpdateLocal', {
          backupId: backup.id,
          lastChangedModelId,
          modelsToUpdate: eventData.modelsToUpdate,
        });
      } catch (error) {
        SyncLog.critical(
          'SyncSafetyBackupService: Failed to create backup on UpdateLocal',
          {
            error,
          },
        );
        // Notify user that backup failed but sync continues
        this._getSnackService().open({
          type: 'ERROR',
          msg: T.F.SYNC.SAFETY_BACKUP.CREATE_FAILED_SYNC_CONTINUES,
        });
      }
    });
  }

  /**
   * Creates a manual backup
   */
  async createBackup(): Promise<void> {
    const data = await this._getPfapiService().pf.loadCompleteBackup();
    const backupId = nanoid();
    if (!this._isValidBackupId(backupId)) {
      throw new Error('Invalid backup ID generated');
    }

    // Get the last changed model from meta data
    const metaData = await this._getPfapiService().pf.metaModel.load();
    const lastChangedModelId = metaData.lastUpdateAction || null;

    const backup: SyncSafetyBackup = {
      id: backupId,
      timestamp: Date.now(),
      data,
      reason: 'MANUAL',
      lastChangedModelId,
    };

    await this._saveBackup(backup);
    SyncLog.normal('SyncSafetyBackupService: Manual backup created', {
      backupId: backup.id,
    });
  }

  /**
   * Gets all available backups, sorted by timestamp (newest first)
   */
  async getBackups(): Promise<SyncSafetyBackup[]> {
    try {
      // Use pfapi db adapter for loading
      const backups = (await this._getPfapiService().pf.db.load(
        STORAGE_KEY,
      )) as SyncSafetyBackup[];
      if (!backups || !Array.isArray(backups)) {
        return [];
      }

      // Filter out any invalid backups and ensure all have unique IDs
      const validBackups = backups.filter((backup) => {
        if (!backup || typeof backup !== 'object') {
          SyncLog.error('SyncSafetyBackupService: Invalid backup object found', {
            backup,
          });
          return false;
        }

        // Check for valid ID - must be a non-empty string and not "EMPTY"
        if (!this._isValidBackupId(backup.id)) {
          SyncLog.error('SyncSafetyBackupService: Invalid backup ID found', {
            id: backup.id,
            timestamp: backup.timestamp,
          });
          return false;
        }

        if (!backup.timestamp || typeof backup.timestamp !== 'number') {
          SyncLog.critical('SyncSafetyBackupService: Invalid backup timestamp', {
            id: backup.id,
            timestamp: backup.timestamp,
          });
          return false;
        }

        return true;
      });

      // Check for duplicate IDs and regenerate if needed
      const seenIds = new Set<string>();
      const uniqueBackups = validBackups.map((backup) => {
        if (seenIds.has(backup.id)) {
          // Generate a new unique ID if duplicate found
          const newId = nanoid();
          SyncLog.critical('SyncSafetyBackupService: Regenerating duplicate backup ID', {
            oldId: backup.id,
            newId,
            timestamp: backup.timestamp,
          });
          backup.id = newId;
        }
        seenIds.add(backup.id);
        return backup;
      });

      // Final validation to ensure no duplicates
      const finalIds = new Set<string>();
      const finalBackups = uniqueBackups.filter((backup) => {
        if (finalIds.has(backup.id)) {
          SyncLog.critical(
            'SyncSafetyBackupService: Duplicate ID still exists after regeneration',
            {
              id: backup.id,
            },
          );
          return false;
        }
        finalIds.add(backup.id);
        return true;
      });

      return finalBackups.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      SyncLog.critical('SyncSafetyBackupService: Failed to load backups', { error });
      return [];
    }
  }

  /**
   * Restores a backup after user confirmation
   */
  async restoreBackup(backupId: string): Promise<void> {
    const backups = await this.getBackups();
    const backup = backups.find((b) => b.id === backupId);

    if (!backup) {
      throw new Error(`Backup with ID ${backupId} not found`);
    }

    const confirmMessage =
      `Are you sure you want to restore the backup from ${new Date(backup.timestamp).toLocaleString()}?\n\n` +
      `This will COMPLETELY REPLACE all your current data!\n\n` +
      `Reason: ${backup.reason}\n\n` +
      `Click OK to proceed or Cancel to abort.`;

    if (window.confirm(confirmMessage)) {
      SyncLog.normal('SyncSafetyBackupService: Restoring backup', {
        backupId,
        timestamp: backup.timestamp,
      });

      try {
        // Import backup with: isSkipLegacyWarnings=false, isSkipReload=true, isForceConflict=true
        await this._getPfapiService().importCompleteBackup(
          backup.data,
          false,
          true,
          true,
        );

        SyncLog.normal('SyncSafetyBackupService: Backup restored successfully', {
          backupId,
        });
      } catch (error) {
        SyncLog.critical('SyncSafetyBackupService: Failed to restore backup', {
          backupId,
          error,
        });
        throw new Error(`Failed to restore backup: ${error}`);
      }
    } else {
      SyncLog.normal('SyncSafetyBackupService: Backup restoration cancelled by user', {
        backupId,
      });
    }
  }

  /**
   * Deletes a specific backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    const backups = await this.getBackups();
    const filteredBackups = backups.filter((b) => b.id !== backupId);

    // Use pfapi db adapter for saving
    await this._getPfapiService().pf.db.save(STORAGE_KEY, filteredBackups, true);

    // Notify components that backups have changed
    this._backupsChanged$.next();

    SyncLog.normal('SyncSafetyBackupService: Backup deleted', { backupId });
  }

  /**
   * Clears all backups
   */
  async clearAllBackups(): Promise<void> {
    // Use pfapi db adapter for saving
    await this._getPfapiService().pf.db.save(STORAGE_KEY, [], true);

    // Notify components that backups have changed
    this._backupsChanged$.next();

    SyncLog.normal('SyncSafetyBackupService: All backups cleared');
  }

  private async _saveBackup(backup: SyncSafetyBackup): Promise<void> {
    this._ensureValidBackupId(backup);

    const existingBackups = await this.getBackups();
    const todayStart = this._getTodayStart();
    const categorized = this._categorizeBackups(existingBackups, todayStart);
    const result = this._buildBackupSlots(backup, categorized, todayStart);

    await this._getPfapiService().pf.db.save(STORAGE_KEY, result, true);
    this._backupsChanged$.next();

    SyncLog.normal(
      `SyncSafetyBackupService: Saved backup. Total slots used: ${result.length}/${TOTAL_BACKUP_SLOTS}`,
      {
        recentCount: result.filter((b) => b.timestamp >= todayStart).length,
        hasTodayBackup: result.length > MAX_RECENT_BACKUPS,
        hasBeforeTodayBackup: result.some((b) => b.timestamp < todayStart),
      },
    );
  }

  /**
   * Checks if a backup ID is valid.
   * Valid IDs must be non-empty strings that aren't the placeholder "EMPTY".
   */
  private _isValidBackupId(id: unknown): id is string {
    return typeof id === 'string' && id.length > 0 && id !== 'EMPTY' && id.trim() !== '';
  }

  /**
   * Ensures the backup has a valid ID, generating one if necessary.
   */
  private _ensureValidBackupId(backup: SyncSafetyBackup): void {
    if (!this._isValidBackupId(backup.id)) {
      const oldId = backup.id;
      backup.id = nanoid();
      SyncLog.normal(
        'SyncSafetyBackupService: Generated new ID for backup with invalid ID',
        { oldId, newId: backup.id },
      );
    }
  }

  /**
   * Gets the start of today as a timestamp.
   */
  private _getTodayStart(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }

  /**
   * Categorizes existing backups into slots.
   */
  private _categorizeBackups(
    existingBackups: SyncSafetyBackup[],
    todayStart: number,
  ): {
    recentBackups: SyncSafetyBackup[];
    todayBackup: SyncSafetyBackup | null;
    beforeTodayBackup: SyncSafetyBackup | null;
  } {
    const recentBackups: SyncSafetyBackup[] = [];
    let todayBackup: SyncSafetyBackup | null = null;
    let beforeTodayBackup: SyncSafetyBackup | null = null;

    for (const existingBackup of existingBackups) {
      if (existingBackup.timestamp >= todayStart) {
        if (recentBackups.length < MAX_RECENT_BACKUPS) {
          recentBackups.push(existingBackup);
        } else if (!todayBackup) {
          todayBackup = existingBackup;
        }
      } else {
        if (
          !beforeTodayBackup ||
          existingBackup.timestamp > beforeTodayBackup.timestamp
        ) {
          beforeTodayBackup = existingBackup;
        }
      }
    }

    return { recentBackups, todayBackup, beforeTodayBackup };
  }

  /**
   * Builds the final backup slots array with the new backup.
   */
  private _buildBackupSlots(
    newBackup: SyncSafetyBackup,
    categorized: {
      recentBackups: SyncSafetyBackup[];
      todayBackup: SyncSafetyBackup | null;
      beforeTodayBackup: SyncSafetyBackup | null;
    },
    todayStart: number,
  ): SyncSafetyBackup[] {
    let { todayBackup, beforeTodayBackup } = categorized;
    const { recentBackups } = categorized;
    const finalBackups: SyncSafetyBackup[] = [];

    if (newBackup.timestamp >= todayStart) {
      if (recentBackups.length < MAX_RECENT_BACKUPS) {
        finalBackups.push(newBackup, ...recentBackups);
      } else {
        finalBackups.push(newBackup, recentBackups[0]);
        if (!todayBackup) {
          todayBackup = recentBackups[1];
        }
      }
    } else {
      if (!beforeTodayBackup || newBackup.timestamp > beforeTodayBackup.timestamp) {
        beforeTodayBackup = newBackup;
      }
    }

    // Build result: recent slots + today slot + before-today slot
    const result: SyncSafetyBackup[] = [...finalBackups.slice(0, MAX_RECENT_BACKUPS)];
    if (todayBackup) {
      result.push(todayBackup);
    }
    if (beforeTodayBackup) {
      result.push(beforeTodayBackup);
    }

    return result;
  }
}
