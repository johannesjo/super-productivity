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
import { PluginPersistenceService } from '../../../plugins/plugin-persistence.service';
import { DataForPlugin } from '../../../plugins/plugin-persistence.model';
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
  private readonly _pluginPersistenceService = inject(PluginPersistenceService);

  T: typeof T = T;
  loadedPlugins: PluginInstance[] = [];
  allPluginData: DataForPlugin[] = [];
  private _subs = new Subscription();

  async ngOnInit(): Promise<void> {
    await this.loadPlugins();
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  async loadPlugins(): Promise<void> {
    this.loadedPlugins = this._pluginService.getLoadedPlugins();
    this.allPluginData = await this._pluginPersistenceService.getAllPluginData();
  }

  /**
   * Get all plugins including loaded and disabled ones
   */
  getAllPlugins(): PluginInstance[] {
    const plugins: PluginInstance[] = [...this.loadedPlugins];

    // Add disabled plugins that aren't already in the loaded list
    for (const pluginData of this.allPluginData) {
      const isAlreadyLoaded = plugins.some((p) => p.manifest.id === pluginData.id);
      if (!isAlreadyLoaded && pluginData.isEnabled === false) {
        // Create a minimal PluginInstance for disabled plugins
        plugins.push({
          manifest: {
            id: pluginData.id,
            name: pluginData.id, // We'll use ID as name since we don't have the full manifest
            version: 'unknown',
            manifestVersion: 1,
            minSupVersion: 'unknown',
            hooks: [],
            permissions: [],
            type: 'standard',
          },
          api: null as any, // No API for disabled plugins
          loaded: false,
          error: undefined,
        });
      }
    }

    return plugins;
  }

  /**
   * Check if a plugin is enabled based on loaded state and persistence data
   */
  isPluginEnabledSync(plugin: PluginInstance): boolean {
    // If the plugin is loaded, it's enabled
    if (plugin.loaded) {
      return true;
    }

    // Check persistence data for disabled plugins
    const pluginData = this.allPluginData.find((data) => data.id === plugin.manifest.id);
    return pluginData?.isEnabled ?? false;
  }

  onPluginToggle(plugin: PluginInstance, event: MatSlideToggleChange): void {
    if (event.checked) {
      this.enablePlugin(plugin);
    } else {
      this.disablePlugin(plugin);
    }
  }

  private async enablePlugin(plugin: PluginInstance): Promise<void> {
    console.log('Enabling plugin:', plugin.manifest.id);

    try {
      // Set plugin as enabled in persistence
      await this._pluginPersistenceService.setPluginEnabled(plugin.manifest.id, true);

      // If plugin is not loaded, reload it
      if (!plugin.loaded) {
        await this._pluginService.reloadPlugin(plugin.manifest.id);
      }

      await this.loadPlugins(); // Refresh the list
    } catch (error) {
      console.error('Failed to enable plugin:', error);
    }
  }

  private async disablePlugin(plugin: PluginInstance): Promise<void> {
    console.log('Disabling plugin:', plugin.manifest.id);

    try {
      // Set plugin as disabled in persistence
      await this._pluginPersistenceService.setPluginEnabled(plugin.manifest.id, false);

      // Unload the plugin
      this._pluginService.unloadPlugin(plugin.manifest.id);

      await this.loadPlugins(); // Refresh the list
    } catch (error) {
      console.error('Failed to disable plugin:', error);
    }
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
    return this.isPluginEnabledSync(plugin) ? 'Enabled' : 'Disabled';
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
