import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { PluginService } from '../../../plugins/plugin.service';
import { PluginInstance } from '../../../plugins/plugin-api.model';
import { CommonModule } from '@angular/common';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';

@Component({
  selector: 'plugin-management',
  templateUrl: './plugin-management.component.html',
  styleUrls: ['./plugin-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatSlideToggle,
    MatIcon,
    MatButton,
    MatChip,
    MatChipSet,
    TranslatePipe,
  ],
})
export class PluginManagementComponent implements OnInit, OnDestroy {
  private readonly _pluginService = inject(PluginService);

  T: typeof T = T;
  loadedPlugins: PluginInstance[] = [];
  private _subs = new Subscription();

  ngOnInit(): void {
    this.loadPlugins();
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  loadPlugins(): void {
    this.loadedPlugins = this._pluginService.getLoadedPlugins();
  }

  onPluginToggle(plugin: PluginInstance, event: MatSlideToggleChange): void {
    if (event.checked) {
      this.enablePlugin(plugin);
    } else {
      this.disablePlugin(plugin);
    }
  }

  private enablePlugin(plugin: PluginInstance): void {
    // TODO: Implement plugin enable functionality
    console.log('Enabling plugin:', plugin.manifest.id);
    // For now, just reload the plugin if it was previously disabled
    if (!plugin.loaded) {
      // TODO: Add enable/disable state management
    }
  }

  private disablePlugin(plugin: PluginInstance): void {
    // TODO: Implement plugin disable functionality
    console.log('Disabling plugin:', plugin.manifest.id);
    // For now, just unload the plugin
    this._pluginService.unloadPlugin(plugin.manifest.id);
    this.loadPlugins(); // Refresh the list
  }

  async reloadPlugin(plugin: PluginInstance): Promise<void> {
    console.log('Reloading plugin:', plugin.manifest.id);

    try {
      const success = await this._pluginService.reloadPlugin(plugin.manifest.id);
      if (success) {
        console.log('Plugin reloaded successfully:', plugin.manifest.id);
      } else {
        console.error('Failed to reload plugin:', plugin.manifest.id);
      }
    } catch (error) {
      console.error('Failed to reload plugin:', error);
    }

    // Refresh the UI
    this.loadPlugins();
  }

  getPluginStatusColor(plugin: PluginInstance): string {
    if (plugin.error) {
      return 'warn';
    }
    return plugin.loaded ? 'primary' : 'accent';
  }

  getPluginStatusText(plugin: PluginInstance): string {
    if (plugin.error) {
      return 'Error';
    }
    return plugin.loaded ? 'Enabled' : 'Disabled';
  }

  getPluginDescription(plugin: PluginInstance): string {
    // Generate a basic description based on plugin manifest
    const features: string[] = [];

    if (plugin.manifest.hooks?.length > 0) {
      features.push(`${plugin.manifest.hooks.length} hooks`);
    }

    if (plugin.manifest.permissions?.length > 0) {
      features.push(`${plugin.manifest.permissions.length} permissions`);
    }

    if (plugin.manifest.type) {
      features.push(`Type: ${plugin.manifest.type}`);
    }

    return features.length > 0
      ? features.join(' • ')
      : 'No additional information available';
  }
}
