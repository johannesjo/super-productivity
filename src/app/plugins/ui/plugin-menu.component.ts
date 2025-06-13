import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { PluginBridgeService } from '../plugin-bridge.service';
import { MatMenuItem } from '@angular/material/menu';
import { PluginIconComponent } from './plugin-icon/plugin-icon.component';

@Component({
  selector: 'plugin-menu',
  template: `
    @for (menuEntry of menuEntries$ | async; track menuEntry.pluginId + menuEntry.label) {
      <button
        mat-menu-item
        class="plugin-menu-entry"
        (click)="menuEntry.onClick()"
      >
        @if (menuEntry.icon && menuEntry.icon.length > 0) {
          <mat-icon>{{ menuEntry.icon }}</mat-icon>
        } @else {
          <plugin-icon
            [pluginId]="menuEntry.pluginId"
            [size]="24"
            fallbackIcon="extension"
          ></plugin-icon>
        }
        <span>{{ menuEntry.label }}</span>
      </button>
    }
  `,
  styles: [
    `
      .plugin-menu-entry {
        width: 100%;
        justify-content: flex-start;
        margin-bottom: 4px;

        mat-icon,
        plugin-icon {
          margin-right: 16px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIcon, MatMenuItem, PluginIconComponent],
})
export class PluginMenuComponent {
  private readonly _pluginBridge = inject(PluginBridgeService);

  readonly menuEntries$ = this._pluginBridge.menuEntries$;
}
