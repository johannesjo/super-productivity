import { inject, Injectable } from '@angular/core';
import { SyncLog } from '../../core/log';
import { PfapiService } from '../../pfapi/pfapi.service';
import { CompleteBackup } from '../../pfapi/api';
import { Subject } from 'rxjs';
import { nanoid } from 'nanoid';

export interface SyncSafetyBackup {
  id: string;
  timestamp: number;
  data: CompleteBackup<any>;
  reason: 'BEFORE_UPDATE_LOCAL' | 'MANUAL';
  lastChangedModelId?: string | null;
  modelsToUpdate?: string[];
}

const STORAGE_KEY = 'SYNC_SAFETY_BACKUPS';
const MAX_RECENT_BACKUPS = 2;
const TOTAL_BACKUP_SLOTS = 4;

@Injectable({
  providedIn: 'root',
})
export class SyncSafetyBackupService {
  // NOTE: Using pfapi db adapter directly, DatabaseService is legacy and no longer used
  private readonly _pfapiService = inject(PfapiService);

  // Subject to notify components when backups change
  private readonly _backupsChanged$ = new Subject<void>();
  readonly backupsChanged$ = this._backupsChanged$.asObservable();

  constructor() {
    // Subscribe to the onBeforeUpdateLocal event
    this._pfapiService.pf.ev.on('onBeforeUpdateLocal', async (eventData) => {
      try {
        SyncLog.normal('SyncSafetyBackupService: Received onBeforeUpdateLocal event', {
          modelsToUpdate: eventData.modelsToUpdate,
        });

        const backupId = nanoid();
        if (!backupId || backupId === 'EMPTY') {
          throw new Error('Invalid backup ID generated');
        }

        // Get the last changed model from meta-data
        const metaData = await this._pfapiService.pf.metaModel.load();
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
      }
    });
  }

  /**
   * Creates a manual backup
   */
  async createBackup(): Promise<void> {
    const data = await this._pfapiService.pf.loadCompleteBackup();
    const backupId = nanoid();
    if (!backupId || backupId === 'EMPTY') {
      throw new Error('Invalid backup ID generated');
    }

    // Get the last changed model from meta data
    const metaData = await this._pfapiService.pf.metaModel.load();
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
      const backups = (await this._pfapiService.pf.db.load(
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
        if (
          !backup.id ||
          typeof backup.id !== 'string' ||
          backup.id === 'EMPTY' ||
          backup.id.trim() === ''
        ) {
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
        if (seenIds.has(backup.id) || backup.id === 'EMPTY' || !backup.id) {
          // Generate a new unique ID if duplicate, empty, or "EMPTY" found
          const newId = nanoid();
          SyncLog.critical(
            'SyncSafetyBackupService: Regenerating duplicate/invalid backup ID',
            {
              oldId: backup.id,
              newId,
              timestamp: backup.timestamp,
            },
          );
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
        await this._pfapiService.importCompleteBackup(backup.data, false, true, true);

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
    await this._pfapiService.pf.db.save(STORAGE_KEY, filteredBackups, true);

    // Notify components that backups have changed
    this._backupsChanged$.next();

    SyncLog.normal('SyncSafetyBackupService: Backup deleted', { backupId });
  }

  /**
   * Clears all backups
   */
  async clearAllBackups(): Promise<void> {
    // Use pfapi db adapter for saving
    await this._pfapiService.pf.db.save(STORAGE_KEY, [], true);

    // Notify components that backups have changed
    this._backupsChanged$.next();

    SyncLog.normal('SyncSafetyBackupService: All backups cleared');
  }

  private async _saveBackup(backup: SyncSafetyBackup): Promise<void> {
    // Ensure backup has a valid ID
    if (!backup.id || backup.id === 'EMPTY' || backup.id.trim() === '') {
      const oldId = backup.id;
      backup.id = nanoid();
      SyncLog.normal(
        'SyncSafetyBackupService: Generated new ID for backup with invalid ID',
        {
          oldId,
          newId: backup.id,
        },
      );
    }

    const existingBackups = await this.getBackups();
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();

    // Categorize existing backups
    const recentBackups: SyncSafetyBackup[] = [];
    let todayBackup: SyncSafetyBackup | null = null;
    let beforeTodayBackup: SyncSafetyBackup | null = null;

    for (const existingBackup of existingBackups) {
      if (existingBackup.timestamp >= todayStart) {
        // This is from today
        if (recentBackups.length < MAX_RECENT_BACKUPS) {
          recentBackups.push(existingBackup);
        } else if (!todayBackup) {
          todayBackup = existingBackup;
        }
      } else {
        // This is from before today
        if (
          !beforeTodayBackup ||
          existingBackup.timestamp > beforeTodayBackup.timestamp
        ) {
          beforeTodayBackup = existingBackup;
        }
      }
    }

    // Now figure out where to place the new backup
    const finalBackups: SyncSafetyBackup[] = [];

    if (backup.timestamp >= todayStart) {
      // New backup is from today
      if (recentBackups.length < MAX_RECENT_BACKUPS) {
        // Add to recent slots
        finalBackups.push(backup, ...recentBackups);
      } else {
        // Recent slots are full, move oldest recent to today slot
        finalBackups.push(backup, recentBackups[0]);
        todayBackup = recentBackups[1]; // The older recent backup becomes today's backup
      }
    } else {
      // New backup is from before today (shouldn't happen normally, but handle it)
      if (!beforeTodayBackup || backup.timestamp > beforeTodayBackup.timestamp) {
        beforeTodayBackup = backup;
      }
    }

    // Rebuild the final backup list respecting the slots
    const result: SyncSafetyBackup[] = [];

    // Slots 1-2: Most recent backups
    result.push(...finalBackups.slice(0, MAX_RECENT_BACKUPS));

    // Slot 3: First backup of today (if any)
    if (todayBackup) {
      result.push(todayBackup);
    }

    // Slot 4: Last backup before today (if any)
    if (beforeTodayBackup) {
      result.push(beforeTodayBackup);
    }

    // Use pfapi db adapter for saving
    await this._pfapiService.pf.db.save(STORAGE_KEY, result, true);

    // Notify components that backups have changed
    this._backupsChanged$.next();

    SyncLog.normal(
      `SyncSafetyBackupService: Saved backup. Total slots used: ${result.length}/${TOTAL_BACKUP_SLOTS}`,
      {
        recentCount: Math.min(finalBackups.length, MAX_RECENT_BACKUPS),
        hasTodayBackup: !!todayBackup,
        hasBeforeTodayBackup: !!beforeTodayBackup,
      },
    );
  }
}
