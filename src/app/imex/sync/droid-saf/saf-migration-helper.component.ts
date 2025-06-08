/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SafService } from './saf.service';
import { LocalFileSyncAndroid } from '../../../pfapi/api/sync/providers/local-file-sync/local-file-sync-android';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
} from '@angular/material/card';
import { NgIf } from '@angular/common';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'saf-migration-helper',
  template: `
    <div
      class="saf-migration-container"
      *ngIf="showMigrationPrompt"
    >
      <mat-card>
        <mat-card-header>
          <mat-card-title>Enhanced File Access for Android 11+</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>
            Starting with Android 11, apps have limited access to shared storage. To sync
            files with other apps like Syncthing, you need to grant folder access
            permission.
          </p>
          <p><strong>Benefits:</strong></p>
          <ul>
            <li>Access files created by other apps (e.g., Syncthing)</li>
            <li>Choose any folder for sync storage</li>
            <li>Better compatibility with external file sync tools</li>
          </ul>
          <p class="warning">
            <mat-icon>warning</mat-icon>
            This is a one-time setup. You can change the folder or disable this feature
            anytime in settings.
          </p>
        </mat-card-content>
        <mat-card-actions>
          <button
            mat-raised-button
            color="primary"
            (click)="setupSaf()"
          >
            <mat-icon>folder_open</mat-icon>
            Choose Sync Folder
          </button>
          <button
            mat-button
            (click)="skipSetup()"
          >
            Skip for Now
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .saf-migration-container {
        margin: 16px;
      }

      mat-card {
        max-width: 600px;
        margin: 0 auto;
      }

      .warning {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #f57c00;
        margin-top: 16px;
      }

      ul {
        margin: 8px 0;
      }

      mat-card-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
    `,
  ],
  imports: [MatCard, NgIf, MatCardHeader, MatCardContent, MatIcon, MatCardActions],
})
export class SafMigrationHelperComponent implements OnInit {
  @Output() migrationComplete = new EventEmitter<boolean>();
  showMigrationPrompt = false;

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  async ngOnInit() {
    // Check if we're on Android and SAF is not yet enabled
    if (await SafService.isAndroid()) {
      const isEnabled = await SafService.isEnabled();
      const hasSkipped = localStorage.getItem('saf_migration_skipped') === 'true';

      if (!isEnabled && !hasSkipped) {
        this.showMigrationPrompt = true;
      }
    }
  }

  async setupSaf() {
    try {
      const localFileSync = new LocalFileSyncAndroid();
      const success = await localFileSync.setupSaf();

      if (success) {
        this.snackBar.open('Sync folder selected successfully!', 'OK', {
          duration: 3000,
        });
        this.showMigrationPrompt = false;
        this.migrationComplete.emit(true);
      } else {
        this.snackBar.open('Failed to select folder. Please try again.', 'OK', {
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('SAF setup error:', error);
      this.snackBar.open('An error occurred. Please try again.', 'OK', {
        duration: 5000,
      });
    }
  }

  skipSetup() {
    this.dialog
      .open(DialogConfirmComponent, {
        data: {
          okTxt: 'Skip',
          message:
            'You can enable enhanced file access later in Settings > Sync > Local File. Continue without setup?',
        },
      })
      .afterClosed()
      .subscribe((isConfirm) => {
        if (isConfirm) {
          localStorage.setItem('saf_migration_skipped', 'true');
          this.showMigrationPrompt = false;
          this.migrationComplete.emit(false);
        }
      });
  }
}
