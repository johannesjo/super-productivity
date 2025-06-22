import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PluginBridgeService } from '../plugin-bridge.service';
import { PluginSidePanelBtnCfg } from '../plugin-api.model';
import { CommonModule } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton } from '@angular/material/button';
import { PluginIconComponent } from './plugin-icon/plugin-icon.component';
import { NavigationEnd, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { togglePluginPanel } from '../../core-ui/layout/store/layout.actions';
import {
  selectActivePluginId,
  selectIsShowPluginPanel,
} from '../../core-ui/layout/store/layout.reducer';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { BreakpointObserver } from '@angular/cdk/layout';

/**
 * Component that renders side panel buttons for plugins in the main header.
 * Buttons appear next to the play button and toggle plugin panels in the right sidebar.
 */
@Component({
  selector: 'plugin-side-panel-btns',
  standalone: true,
  imports: [CommonModule, MatTooltip, MatIconButton, PluginIconComponent],
  template: `
    @for (button of sidePanelButtons(); track button.pluginId) {
      <button
        mat-icon-button
        [matTooltip]="
          button.label + (isWorkView() ? '' : ' (only available in work views)')
        "
        (click)="onButtonClick(button)"
        class="plugin-side-panel-btn"
        [class.active]="activePluginId() === button.pluginId && isShowPanel()"
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
        position: relative;
        overflow: visible !important;
      }

      .plugin-side-panel-btn.active {
        background-color: transparent;
      }

      .plugin-side-panel-btn plugin-icon {
        transition: all 0.2s ease;
      }

      .plugin-side-panel-btn.active plugin-icon {
        transform: rotate(45deg);
      }

      .plugin-side-panel-btn.active::after {
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;
        border-bottom-left-radius: 4px;
        border-bottom-right-radius: 4px;
        box-shadow: 0px -2px 3px 0px var(--theme-separator-alpha);
        background: var(--theme-sidebar-bg);
        content: '';
        width: 100%;
        position: absolute;
        left: 1px;
        top: 0;
        bottom: -5px;
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;
        z-index: -1;
      }

      .plugin-side-panel-btn:hover:not(.active):not(:disabled) {
        background-color: var(--hover-color, rgba(0, 0, 0, 0.04));
      }

      .plugin-side-panel-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: transparent !important;
      }

      .plugin-side-panel-btn:disabled::after {
        background: transparent !important;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginSidePanelBtnsComponent {
  private _pluginBridge = inject(PluginBridgeService);
  private _router = inject(Router);
  private _breakpointObserver = inject(BreakpointObserver);

  private _store = inject(Store);
  private _isXs$ = this._breakpointObserver.observe('(max-width: 600px)');

  sidePanelButtons = toSignal(this._pluginBridge.sidePanelButtons$, { initialValue: [] });

  activePluginId = toSignal(this._store.select(selectActivePluginId));
  isShowPanel = toSignal(this._store.select(selectIsShowPluginPanel));
  isXs = toSignal(this._isXs$.pipe(map((result) => result.matches)), {
    initialValue: false,
  });

  readonly currentRoute = toSignal(
    this._router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this._router.url),
    ),
    { initialValue: this._router.url },
  );

  readonly isWorkView = computed(() => {
    const url = this.currentRoute();
    return url.includes('/active/') || url.includes('/tag/') || url.includes('/project/');
  });

  onButtonClick(button: PluginSidePanelBtnCfg): void {
    console.log('Side panel button clicked:', button.pluginId, button.label);

    // Prevent action if not in work view
    if (!this.isWorkView()) {
      console.log('Not in work view, ignoring click');
      return;
    }

    console.log('Dispatching togglePluginPanel action for:', button.pluginId);
    // Dispatch action to toggle the plugin panel
    this._store.dispatch(togglePluginPanel(button.pluginId));

    // Call the original onClick handler if provided
    if (button.onClick) {
      console.log('Calling plugin onClick handler for:', button.pluginId);
      button.onClick();
    }
  }
}
