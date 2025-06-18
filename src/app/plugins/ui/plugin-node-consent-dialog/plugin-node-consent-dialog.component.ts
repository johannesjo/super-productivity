import { Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PluginManifest } from '../../plugin-api.model';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
} from '@angular/material/dialog';
import { NgIf } from '@angular/common';

export interface PluginNodeConsentDialogData {
  manifest: PluginManifest;
  isFirstConfirmation: boolean;
}

@Component({
  selector: 'plugin-node-consent-dialog',
  standalone: true,
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatIcon, NgIf],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="warning-icon">warning</mat-icon>
      Security Warning: Node.js Execution
    </h2>

    <mat-dialog-content>
      <div class="warning-content">
        <p class="plugin-info">
          <strong>Plugin:</strong> {{ data.manifest.name }}<br />
          <strong>ID:</strong> {{ data.manifest.id }}<br />
          <strong>Version:</strong> {{ data.manifest.version }}
        </p>

        <div
          *ngIf="data.isFirstConfirmation"
          class="first-warning"
        >
          <p class="warning-text">
            This plugin is requesting permission to execute Node.js scripts on your
            computer. This is a <strong>potentially dangerous</strong> operation that
            could:
          </p>
          <ul class="risks">
            <li>Access or modify files on your system</li>
            <li>Execute system commands</li>
            <li>Install or run other software</li>
            <li>Access network resources</li>
          </ul>
          <p class="recommendation">
            <strong
              >Only enable this if you completely trust the plugin author and understand
              the risks.</strong
            >
          </p>
        </div>

        <div
          *ngIf="!data.isFirstConfirmation"
          class="second-warning"
        >
          <p class="warning-text urgent">
            <strong>ARE YOU ABSOLUTELY SURE?</strong>
          </p>
          <p>
            You are about to grant this plugin the ability to execute arbitrary code on
            your system. This plugin will have similar permissions to any program you
            install on your computer.
          </p>
          <p class="final-warning">
            If you did not intend to grant these permissions, or if you have any doubts
            about the trustworthiness of this plugin, click "Cancel" now.
          </p>
        </div>

        <div
          class="config-info"
          *ngIf="data.manifest.nodeScriptConfig"
        >
          <p><strong>Script Configuration:</strong></p>
          <ul>
            <li *ngIf="data.manifest.nodeScriptConfig.timeout">
              Timeout: {{ data.manifest.nodeScriptConfig.timeout }}ms
            </li>
            <li *ngIf="data.manifest.nodeScriptConfig.memoryLimit">
              Memory Limit: {{ data.manifest.nodeScriptConfig.memoryLimit }}
            </li>
          </ul>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button
        mat-button
        (click)="onCancel()"
        color="primary"
      >
        <mat-icon>close</mat-icon>
        Cancel
      </button>
      <button
        mat-raised-button
        (click)="onConfirm()"
        color="warn"
        [class.danger-button]="!data.isFirstConfirmation"
      >
        <mat-icon>{{ data.isFirstConfirmation ? 'security' : 'warning' }}</mat-icon>
        {{
          data.isFirstConfirmation ? 'I Understand, Continue' : 'Yes, Grant Permission'
        }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      mat-dialog-content {
        min-width: 450px;
        max-width: 600px;
      }

      .warning-icon {
        color: #ff9800;
        vertical-align: middle;
        margin-right: 8px;
      }

      .warning-content {
        padding: 16px 0;
      }

      .plugin-info {
        background: rgba(0, 0, 0, 0.05);
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 16px;
        font-family: monospace;
      }

      .warning-text {
        color: #d32f2f;
        margin: 16px 0;
      }

      .warning-text.urgent {
        font-size: 1.2em;
        text-align: center;
        margin: 24px 0;
      }

      .risks {
        margin: 16px 0;
        padding-left: 24px;
        color: #666;
      }

      .risks li {
        margin: 8px 0;
      }

      .recommendation {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        padding: 12px;
        border-radius: 4px;
        margin: 16px 0;
      }

      .final-warning {
        background: #ffebee;
        border: 1px solid #ffcdd2;
        padding: 12px;
        border-radius: 4px;
        color: #c62828;
        font-weight: 500;
      }

      .config-info {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(0, 0, 0, 0.12);
      }

      .config-info ul {
        margin: 8px 0;
        padding-left: 24px;
      }

      .danger-button {
        background-color: #d32f2f !important;
      }

      mat-icon {
        margin-right: 4px;
      }
    `,
  ],
})
export class PluginNodeConsentDialogComponent {
  private dialogRef = inject(MatDialogRef<PluginNodeConsentDialogComponent>);
  data = inject<PluginNodeConsentDialogData>(MAT_DIALOG_DATA);

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
