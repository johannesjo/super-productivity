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
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { togglePluginPanel } from '../../core-ui/layout/store/layout.actions';
import { selectActivePluginId } from '../../core-ui/layout/store/layout.reducer';

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
        [matTooltip]="
          button.label + (isWorkView() ? '' : ' (only available in work views)')
        "
        (click)="onButtonClick(button)"
        class="plugin-side-panel-btn"
        [class.active]="(activePluginId$ | async) === button.pluginId"
        [disabled]="!isWorkView()"
      >
        <plugin-icon
          [pluginId]="button.pluginId"
          [fallbackIcon]="button.icon || 'extension'"
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
        transition: all 0.2s ease;
      }

      .plugin-side-panel-btn.active {
        background-color: var(--accent-color-lighter, rgba(255, 193, 7, 0.2));
      }

      .plugin-side-panel-btn:hover:not(.active):not(:disabled) {
        background-color: var(--hover-color, rgba(0, 0, 0, 0.04));
      }

      .plugin-side-panel-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginSidePanelBtnsComponent {
  private _pluginBridge = inject(PluginBridgeService);
  private _pluginService = inject(PluginService);
  private _router = inject(Router);
  private _store = inject(Store);

  sidePanelButtons$: Observable<PluginSidePanelBtnCfg[]> =
    this._pluginBridge.sidePanelButtons$;

  activePluginId$: Observable<string | null> = this._store.select(selectActivePluginId);

  isWorkView(): boolean {
    const url = this._router.url;
    // Plugin side panels are only available in work views (active tasks, daily planner)
    return (
      url.includes('/active/') ||
      url.includes('/daily-planner') ||
      url.includes('/tag/') ||
      url.includes('/project/')
    );
  }

  onButtonClick(button: PluginSidePanelBtnCfg): void {
    // Prevent action if not in work view
    if (!this.isWorkView()) {
      return;
    }

    // Dispatch action to toggle the plugin panel
    this._store.dispatch(togglePluginPanel(button.pluginId));

    // Call the original onClick handler if provided
    if (button.onClick) {
      button.onClick();
    }
  }
}
