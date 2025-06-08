/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SafService } from './saf.service';
import { LocalFileSyncAndroid } from '../../../pfapi/api/sync/providers/local-file-sync/local-file-sync-android';
import { NgIf } from '@angular/common';
import { MatCard, MatCardActions, MatCardContent } from '@angular/material/card';
import { MatChip } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'saf-settings',
  template: `
    <div
      class="saf-settings"
      *ngIf="isAndroid"
    >
      <h3>Android File Access Settings</h3>

      <mat-card>
        <mat-card-content>
          <div class="status-row">
            <span>Enhanced File Access (SAF):</span>
            <mat-chip-list>
              <mat-chip
                [color]="isEnabled ? 'primary' : ''"
                selected
              >
                {{ isEnabled ? 'Enabled' : 'Disabled' }}
              </mat-chip>
            </mat-chip-list>
          </div>

          <div
            class="folder-info"
            *ngIf="isEnabled && folderUri"
          >
            <mat-icon>folder</mat-icon>
            <span class="folder-path">{{ displayFolderPath }}</span>
          </div>

          <div
            class="permission-status"
            *ngIf="isEnabled"
          >
            <mat-icon [color]="hasPermission ? 'primary' : 'warn'">
              {{ hasPermission ? 'check_circle' : 'error' }}
            </mat-icon>
            <span>
              {{
                hasPermission
                  ? 'Folder access granted'
                  : 'Folder access revoked - please reselect'
              }}
            </span>
          </div>
        </mat-card-content>

        <mat-card-actions>
          <button
            mat-raised-button
            color="primary"
            (click)="selectFolder()"
            [disabled]="isLoading"
          >
            <mat-icon>folder_open</mat-icon>
            {{ isEnabled ? 'Change Folder' : 'Enable & Select Folder' }}
          </button>

          <button
            mat-button
            color="warn"
            (click)="disable()"
            *ngIf="isEnabled"
            [disabled]="isLoading"
          >
            <mat-icon>close</mat-icon>
            Disable
          </button>
        </mat-card-actions>
      </mat-card>

      <div class="help-text">
        <p>
          <mat-icon>info</mat-icon>
          Enhanced File Access allows Super Productivity to read and write files in
          folders shared with other apps like Syncthing. This is required on Android 11+
          due to scoped storage restrictions.
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .saf-settings {
        margin: 16px 0;
      }

      mat-card {
        margin: 16px 0;
      }

      .status-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
      }

      .folder-info {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 16px 0;
        padding: 8px;
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: 4px;
      }

      .folder-path {
        font-family: monospace;
        font-size: 0.9em;
        word-break: break-all;
      }

      .permission-status {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 8px 0;
      }

      .help-text {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-top: 16px;
        color: rgba(0, 0, 0, 0.6);
      }

      .help-text mat-icon {
        margin-top: 2px;
      }

      mat-card-actions {
        display: flex;
        gap: 8px;
      }
    `,
  ],
  imports: [NgIf, MatCard, MatCardContent, MatChip, MatIcon, MatCardActions],
})
export class SafSettingsComponent implements OnInit {
  isAndroid = false;
  isEnabled = false;
  hasPermission = false;
  folderUri: string | null = null;
  displayFolderPath = '';
  isLoading = false;

  constructor(private snackBar: MatSnackBar) {}

  async ngOnInit() {
    await this.loadStatus();
  }

  async loadStatus() {
    this.isAndroid = await SafService.isAndroid();
    if (this.isAndroid) {
      this.isEnabled = await SafService.isEnabled();
      this.folderUri = await SafService.getSavedFolderUri();
      this.hasPermission = await SafService.checkPermission();

      if (this.folderUri) {
        // Extract a display-friendly path from the URI
        this.displayFolderPath = this.extractDisplayPath(this.folderUri);
      }
    }
  }

  private extractDisplayPath(uri: string): string {
    // content://com.android.externalstorage.documents/tree/primary%3ASyncthing%2Fsuperproductivity
    // -> /Syncthing/superproductivity
    try {
      const parts = uri.split('/tree/');
      if (parts.length > 1) {
        const path = decodeURIComponent(parts[1]);
        const pathParts = path.split(':');
        if (pathParts.length > 1) {
          return '/' + pathParts[1].replace(/%2F/g, '/');
        }
      }
    } catch (e) {
      console.error('Failed to parse URI:', e);
    }
    return uri;
  }

  async selectFolder() {
    this.isLoading = true;
    try {
      const localFileSync = new LocalFileSyncAndroid();
      const success = await localFileSync.setupSaf();

      if (success) {
        this.snackBar.open('Folder selected successfully!', 'OK', {
          duration: 3000,
        });
        await this.loadStatus();
      } else {
        this.snackBar.open('Failed to select folder', 'OK', {
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      this.snackBar.open('An error occurred', 'OK', {
        duration: 5000,
      });
    } finally {
      this.isLoading = false;
    }
  }

  async disable() {
    this.isLoading = true;
    try {
      const localFileSync = new LocalFileSyncAndroid();
      await localFileSync.disableSaf();

      this.snackBar.open('Enhanced file access disabled', 'OK', {
        duration: 3000,
      });
      await this.loadStatus();
    } catch (error) {
      console.error('Error disabling SAF:', error);
      this.snackBar.open('An error occurred', 'OK', {
        duration: 5000,
      });
    } finally {
      this.isLoading = false;
    }
  }
}
