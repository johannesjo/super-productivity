import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PluginBridgeService } from '../plugin-bridge.service';
import { PluginSidePanelBtnCfg } from '../plugin-api.model';
import { PluginService } from '../plugin.service';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton } from '@angular/material/button';
import { PluginIconComponent } from './plugin-icon/plugin-icon.component';

@Component({
  selector: 'plugin-side-panel-btns',
  standalone: true,
  imports: [CommonModule, MatIcon, MatTooltip, MatIconButton, PluginIconComponent],
  template: `
    @for (button of sidePanelButtons$ | async; track button.pluginId) {
      <button
        mat-icon-button
        [matTooltip]="button.label"
        (click)="onButtonClick(button)"
        class="plugin-side-panel-btn"
      >
        <mat-icon *ngIf="!button.icon">extension</mat-icon>
        <plugin-icon
          *ngIf="button.icon"
          [pluginId]="button.pluginId"
          [iconName]="button.icon"
        ></plugin-icon>
      </button>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .plugin-side-panel-btn {
        margin: 0 2px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginSidePanelBtnsComponent {
  private _pluginBridge = inject(PluginBridgeService);
  private _pluginService = inject(PluginService);

  sidePanelButtons$: Observable<PluginSidePanelBtnCfg[]> =
    this._pluginBridge.sidePanelButtons$;

  onButtonClick(button: PluginSidePanelBtnCfg): void {
    // Set the active side panel plugin
    this._pluginService.setActiveSidePanelPlugin(button.pluginId);
    // Call the original onClick handler
    button.onClick();
  }
}
