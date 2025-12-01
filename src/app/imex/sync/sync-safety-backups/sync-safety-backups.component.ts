import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { SyncSafetyBackup, SyncSafetyBackupService } from '../sync-safety-backup.service';
import { SnackService } from '../../../core/snack/snack.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { T } from '../../../t.const';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SyncLog } from '../../../core/log';

@Component({
  selector: 'sync-safety-backups',
  templateUrl: './sync-safety-backups.component.html',
  styleUrls: ['./sync-safety-backups.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon, MatButton, MatTooltip, TranslatePipe],
})
export class SyncSafetyBackupsComponent implements OnInit, OnDestroy {
  private _syncSafetyBackupService = inject(SyncSafetyBackupService);
  private _snackService = inject(SnackService);
  private _translateService = inject(TranslateService);
  private _destroy$ = new Subject<void>();

  readonly backups = signal<SyncSafetyBackup[]>([]);
  readonly isLoading = signal(false);

  T: typeof T = T;

  async ngOnInit(): Promise<void> {
    await this.loadBackups();

    // Subscribe to backup changes to automatically refresh the list
    this._syncSafetyBackupService.backupsChanged$
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => {
        this.loadBackups();
      });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  async loadBackups(): Promise<void> {
    try {
      this.isLoading.set(true);
      const backups = await this._syncSafetyBackupService.getBackups();
      this.backups.set(backups);
    } catch (error) {
      SyncLog.err('Failed to load backups:', error);
      this._snackService.open({
        type: 'ERROR',
        msg: 'Failed to load safety backups',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  async createManualBackup(): Promise<void> {
    try {
      this.isLoading.set(true);
      await this._syncSafetyBackupService.createBackup();
      // No need to manually reload - the service will emit backupsChanged$
      this._snackService.open({
        type: 'SUCCESS',
        msg: T.F.SYNC.SAFETY_BACKUP.CREATED_SUCCESS,
      });
    } catch (error) {
      SyncLog.err('Failed to create manual backup:', error);
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.SYNC.SAFETY_BACKUP.CREATE_FAILED,
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  async restoreBackup(backup: SyncSafetyBackup): Promise<void> {
    try {
      this.isLoading.set(true);
      await this._syncSafetyBackupService.restoreBackup(backup.id);
      this._snackService.open({
        type: 'SUCCESS',
        msg: T.F.SYNC.SAFETY_BACKUP.RESTORED_SUCCESS,
      });
      // Reload the page after restoration
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      SyncLog.err('Failed to restore backup:', error);
      this._snackService.open({
        type: 'ERROR',
        msg: error instanceof Error ? error.message : 'Failed to restore backup',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteBackup(backup: SyncSafetyBackup): Promise<void> {
    if (
      window.confirm(
        `Are you sure you want to delete the backup from ${this.formatTimestamp(backup.timestamp)}?`,
      )
    ) {
      try {
        await this._syncSafetyBackupService.deleteBackup(backup.id);
        // No need to manually reload - the service will emit backupsChanged$
        this._snackService.open({
          type: 'SUCCESS',
          msg: T.F.SYNC.SAFETY_BACKUP.DELETED_SUCCESS,
        });
      } catch (error) {
        SyncLog.err('Failed to delete backup:', error);
        this._snackService.open({
          type: 'ERROR',
          msg: T.F.SYNC.SAFETY_BACKUP.DELETE_FAILED,
        });
      }
    }
  }

  async clearAllBackups(): Promise<void> {
    if (
      window.confirm(
        'Are you sure you want to delete ALL safety backups? This cannot be undone.',
      )
    ) {
      try {
        await this._syncSafetyBackupService.clearAllBackups();
        // No need to manually reload - the service will emit backupsChanged$
        this._snackService.open({
          type: 'SUCCESS',
          msg: T.F.SYNC.SAFETY_BACKUP.CLEARED_SUCCESS,
        });
      } catch (error) {
        SyncLog.err('Failed to clear backups:', error);
        this._snackService.open({
          type: 'ERROR',
          msg: T.F.SYNC.SAFETY_BACKUP.CLEAR_FAILED,
        });
      }
    }
  }

  formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  getReasonText(reason: SyncSafetyBackup['reason']): string {
    switch (reason) {
      case 'BEFORE_UPDATE_LOCAL':
        return this._translateService.instant(
          T.F.SYNC.SAFETY_BACKUP.REASON_BEFORE_UPDATE,
        );
      case 'MANUAL':
        return this._translateService.instant(T.F.SYNC.SAFETY_BACKUP.REASON_MANUAL);
      default:
        return reason;
    }
  }

  getSlotInfo(backup: SyncSafetyBackup, index: number): string {
    // const backups = this.backups();
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const isFromToday = backup.timestamp >= todayStart;

    if (index < 2) {
      return `Slot ${index + 1}: ${this._translateService.instant(T.F.SYNC.SAFETY_BACKUP.SLOT_RECENT)}`;
    } else if (index === 2) {
      return isFromToday
        ? `Slot 3: ${this._translateService.instant(T.F.SYNC.SAFETY_BACKUP.SLOT_TODAY)}`
        : 'Slot 3: Backup from ' + this.getRelativeDay(backup.timestamp);
    } else if (index === 3) {
      return `Slot 4: ${this._translateService.instant(T.F.SYNC.SAFETY_BACKUP.SLOT_BEFORE_TODAY)}`;
    }
    return '';
  }

  getRelativeDay(timestamp: number): string {
    const now = new Date();
    const backupDate = new Date(timestamp);
    const daysDiff = Math.floor((now.getTime() - timestamp) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      return 'Today';
    } else if (daysDiff === 1) {
      return 'Yesterday';
    } else if (daysDiff < 7) {
      return `${daysDiff} days ago`;
    } else {
      return backupDate.toLocaleDateString();
    }
  }

  getReasonIcon(reason: SyncSafetyBackup['reason']): string {
    switch (reason) {
      case 'BEFORE_UPDATE_LOCAL':
        return 'sync';
      case 'MANUAL':
        return 'person';
      default:
        return 'help';
    }
  }
}
