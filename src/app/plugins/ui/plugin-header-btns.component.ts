import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { PluginBridgeService } from '../plugin-bridge.service';

@Component({
  selector: 'plugin-header-btns',
  template: `
    @for (button of headerButtons(); track button.pluginId + button.label) {
      <button
        mat-icon-button
        [matTooltip]="button.label"
        (click)="button.onClick()"
        style="margin-left: 8px"
      >
        <mat-icon>{{ button.icon }}</mat-icon>
      </button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconButton, MatIcon, MatTooltip],
})
export class PluginHeaderBtnsComponent {
  private readonly _pluginBridge = inject(PluginBridgeService);

  readonly headerButtons = this._pluginBridge.headerButtons;
}
