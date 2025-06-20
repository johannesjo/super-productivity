import { Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PluginManifest } from '../../plugin-api.model';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import {
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

export interface PluginNodeConsentDialogData {
  manifest: PluginManifest;
}

@Component({
  selector: 'plugin-node-consent-dialog',
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatIcon,
    MatCheckbox,
    FormsModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="info-icon">info</mat-icon>
      Plugin Requests System Access
    </h2>

    <mat-dialog-content>
      <div class="content">
        <p class="plugin-info">
          <strong>{{ data.manifest.name }}</strong> (v{{ data.manifest.version }})
        </p>

        <p>
          This plugin requests permission to execute system commands. This allows it to:
        </p>

        <ul class="capabilities">
          <li>Access files on your computer</li>
          <li>Run system commands</li>
          <li>Use Node.js APIs</li>
        </ul>

        <p class="trust-note">
          <mat-icon>verified_user</mat-icon>
          Only grant this permission if you trust the plugin author.
        </p>

        <mat-checkbox
          [(ngModel)]="rememberChoice"
          class="remember-checkbox"
        >
          Remember my choice for this plugin
        </mat-checkbox>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button
        mat-button
        (click)="onCancel()"
      >
        Cancel
      </button>
      <button
        mat-raised-button
        (click)="onConfirm()"
        color="primary"
      >
        <mat-icon>check</mat-icon>
        Grant Permission
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      mat-dialog-content {
        min-width: 400px;
        max-width: 500px;
      }

      .info-icon {
        color: #1976d2;
        vertical-align: middle;
        margin-right: 8px;
      }

      .content {
        padding: 8px 0;
      }

      .plugin-info {
        background: rgba(0, 0, 0, 0.05);
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 16px;
      }

      .capabilities {
        margin: 16px 0;
        padding-left: 24px;
      }

      .capabilities li {
        margin: 4px 0;
      }

      .trust-note {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #e3f2fd;
        padding: 12px;
        border-radius: 4px;
        margin: 16px 0;
      }

      .trust-note mat-icon {
        color: #1976d2;
      }

      .remember-checkbox {
        margin-top: 16px;
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    `,
  ],
})
export class PluginNodeConsentDialogComponent {
  private dialogRef = inject(MatDialogRef<PluginNodeConsentDialogComponent>);
  data = inject<PluginNodeConsentDialogData>(MAT_DIALOG_DATA);

  rememberChoice = false;

  onConfirm(): void {
    this.dialogRef.close({ granted: true, remember: this.rememberChoice });
  }

  onCancel(): void {
    this.dialogRef.close({ granted: false, remember: false });
  }
}
