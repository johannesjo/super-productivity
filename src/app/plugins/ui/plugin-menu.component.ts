import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PluginBridgeService } from '../plugin-bridge.service';
import { MatMenuItem } from '@angular/material/menu';
import { PluginIconComponent } from './plugin-icon/plugin-icon.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'plugin-menu',
  template: `
    @for (menuEntry of menuEntries(); track menuEntry.pluginId + menuEntry.label) {
      <button
        mat-menu-item
        class="plugin-menu-entry"
        [class.isActive]="isActive(menuEntry.pluginId)"
        (click)="menuEntry.onClick()"
      >
        <plugin-icon
          [pluginId]="menuEntry.pluginId"
          [fallbackIcon]="menuEntry.icon || 'extension'"
        ></plugin-icon>
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
        &.isActive {
          color: var(--c-primary);
          font-weight: bold;

          mat-icon {
            color: var(--c-primary);
          }
        }

        mat-icon,
        plugin-icon {
          margin-right: 16px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatMenuItem, PluginIconComponent],
})
export class PluginMenuComponent {
  private readonly _pluginBridge = inject(PluginBridgeService);
  private readonly _router = inject(Router);

  readonly currentRoute = toSignal(
    this._router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this._router.url),
    ),
    { initialValue: this._router.url },
  );

  readonly menuEntries = this._pluginBridge.menuEntries;

  isActive(pluginId: string): boolean {
    return this.currentRoute().includes(pluginId);
  }
}
