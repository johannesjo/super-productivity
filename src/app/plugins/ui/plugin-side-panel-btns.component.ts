import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PluginBridgeService } from '../plugin-bridge.service';
import { PluginSidePanelBtnCfg } from '../plugin-api.model';
import { PluginService } from '../plugin.service';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton } from '@angular/material/button';
import { PluginIconComponent } from './plugin-icon/plugin-icon.component';

/**
 * Component that renders side panel buttons for plugins in the main header.
 * Buttons appear next to the play button and toggle plugin panels in the right sidebar.
 */
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
        [class.active]="(activePluginId$ | async) === button.pluginId"
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
        transition: all 0.2s ease;
      }

      .plugin-side-panel-btn.active {
        background-color: var(--accent-color-lighter, rgba(255, 193, 7, 0.2));
      }

      .plugin-side-panel-btn:hover:not(.active) {
        background-color: var(--hover-color, rgba(0, 0, 0, 0.04));
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

  activePluginId$: Observable<string | null> =
    this._pluginService.activeSidePanelPlugin$.pipe(
      map((plugin) => plugin?.manifest.id || null),
    );

  onButtonClick(button: PluginSidePanelBtnCfg): void {
    // Check if this plugin is already active
    const currentActiveId = this._pluginService.getActiveSidePanelPluginId();
    const isCurrentlyActive = currentActiveId === button.pluginId;

    if (isCurrentlyActive) {
      // Toggle off if clicking the active button
      this._pluginService.setActiveSidePanelPlugin(null);
    } else {
      // Set the active side panel plugin
      this._pluginService.setActiveSidePanelPlugin(button.pluginId);
    }

    // Call the original onClick handler
    button.onClick();
  }
}
