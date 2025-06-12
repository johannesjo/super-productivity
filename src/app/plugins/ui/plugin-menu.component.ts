import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { PluginBridgeService } from '../plugin-bridge.service';
import { PluginMenuEntryCfg } from '../plugin-api.model';
import { MatMenuItem } from '@angular/material/menu';

@Component({
  selector: 'plugin-menu',
  template: `
    @for (menuEntry of menuEntries(); track menuEntry.pluginId + menuEntry.label) {
      <button
        mat-menu-item
        class="plugin-menu-entry"
        (click)="menuEntry.onClick()"
      >
        <mat-icon>{{ menuEntry.icon }}</mat-icon>
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

        mat-icon {
          margin-right: 16px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButton, MatIcon, MatMenuItem],
})
export class PluginMenuComponent {
  private readonly _pluginBridge = inject(PluginBridgeService);

  readonly menuEntries = signal<PluginMenuEntryCfg[]>([]);

  constructor() {
    // Subscribe to menu entry changes
    this._pluginBridge.menuEntries$.subscribe((entries) => {
      this.menuEntries.set(entries);
    });
  }
}
