import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { PluginService } from '../../../plugins/plugin.service';
import { PluginInstance } from '../../../plugins/plugin-api.model';
import { PluginPersistenceService } from '../../../plugins/plugin-persistence.service';
import { CommonModule } from '@angular/common';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { MatError } from '@angular/material/form-field';
import { MatList, MatListItem } from '@angular/material/list';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { MatToolbar } from '@angular/material/toolbar';

@Component({
  selector: 'plugin-management',
  templateUrl: './plugin-management.component.html',
  styleUrls: ['./plugin-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatCard,
    MatCardActions,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatSlideToggle,
    MatIcon,
    MatButton,
    MatChip,
    MatChipSet,
    MatError,
    MatList,
    MatListItem,
    TranslatePipe,
    MatToolbar,
  ],
})
export class PluginManagementComponent implements OnInit {
  private readonly _pluginService = inject(PluginService);
  private readonly _pluginPersistenceService = inject(PluginPersistenceService);

  T: typeof T = T;

  // Signal for all plugins (loaded + disabled with isEnabled state)
  readonly allPlugins = signal<PluginInstance[]>([]);

  async ngOnInit(): Promise<void> {
    await this.loadPlugins();
  }

  async loadPlugins(): Promise<void> {
    const allPlugins = await this._pluginService.getAllPlugins();
    this.allPlugins.set(allPlugins);
  }

  /**
   * Check if a plugin is enabled
   */
  isPluginEnabledSync(plugin: PluginInstance): boolean {
    return plugin.isEnabled;
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

      // Update the plugin state immediately
      plugin.isEnabled = true;

      // If plugin is not loaded, reload it
      if (!plugin.loaded) {
        await this._pluginService.reloadPlugin(plugin.manifest.id);
        await this.loadPlugins(); // Full refresh needed for reloaded plugin
      } else {
        // Just update the signal for immediate UI update
        this.allPlugins.set([...this.allPlugins()]);
      }
    } catch (error) {
      console.error('Failed to enable plugin:', error);
    }
  }

  private async disablePlugin(plugin: PluginInstance): Promise<void> {
    console.log('Disabling plugin:', plugin.manifest.id);

    try {
      // Set plugin as disabled in persistence
      await this._pluginPersistenceService.setPluginEnabled(plugin.manifest.id, false);

      // Update the plugin state immediately
      plugin.isEnabled = false;

      // Unload the plugin
      this._pluginService.unloadPlugin(plugin.manifest.id);

      // Update the signal for immediate UI update
      this.allPlugins.set([...this.allPlugins()]);
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
    return plugin.isEnabled ? 'Enabled' : 'Disabled';
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
