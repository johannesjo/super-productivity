import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DialogButtonCfg, DialogCfg } from '../../plugin-api.model';
import { PluginSecurityService } from '../../plugin-security';
import { TranslateService } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { PluginLog } from '../../../core/log';

@Component({
  selector: 'plugin-dialog',
  template: `
    <div mat-dialog-title>
      {{ dialogData.title || _translateService.instant(T.PLUGINS.PLUGIN_DIALOG_TITLE) }}
    </div>

    <mat-dialog-content>
      @if (sanitizedContent) {
        <div [innerHTML]="sanitizedContent"></div>
      } @else {
        <div>
          {{
            dialogData.htmlContent ||
              _translateService.instant(T.PLUGINS.NO_CONTENT_PROVIDED)
          }}
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      @for (button of dialogData.buttons || defaultButtons; track button.label) {
        <button
          mat-button
          [color]="button.color || 'primary'"
          (click)="onButtonClick(button)"
        >
          @if (button.icon) {
            <mat-icon>{{ button.icon }}</mat-icon>
          }
          {{ button.label }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        min-width: 300px;
        max-width: 600px;
        max-height: 400px;
        overflow-y: auto;
      }

      mat-dialog-actions {
        gap: 8px;
      }

      mat-icon {
        margin-right: 8px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, MatIcon, MatDialogActions, MatDialogContent, MatDialogTitle],
})
export class PluginDialogComponent {
  private readonly _dialogRef = inject(MatDialogRef<PluginDialogComponent>);
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _pluginSecurity = inject(PluginSecurityService);
  readonly _translateService = inject(TranslateService);

  readonly dialogData: DialogCfg & { title?: string };
  readonly sanitizedContent: SafeHtml | null = null;
  readonly T = T;
  readonly defaultButtons: DialogButtonCfg[] = [
    {
      label: this._translateService.instant(T.PLUGINS.OK),
      onClick: () => this._dialogRef.close(),
    },
  ];

  data = inject<DialogCfg & { title?: string }>(MAT_DIALOG_DATA);

  constructor() {
    this.dialogData = this.data;

    // Sanitize HTML content if provided
    if (this.data.htmlContent) {
      this.sanitizedContent = this._sanitizer.bypassSecurityTrustHtml(
        this._pluginSecurity.sanitizeHtml(this.data.htmlContent),
      );
    }
  }

  async onButtonClick(button: DialogButtonCfg): Promise<void> {
    try {
      if (button.onClick) {
        await button.onClick();
      }
      // Close dialog after button action completes (unless button prevents it)
      if (!this._dialogRef.disableClose) {
        this._dialogRef.close(button.label);
      }
    } catch (error) {
      PluginLog.err('Plugin dialog button action failed:', error);
      this._dialogRef.close('error');
    }
  }
}
