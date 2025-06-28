import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { PluginService } from '../../plugin.service';
import { PluginInstance } from '../../plugin-api.model';
import { PluginState } from '../../plugin-state.model';
import { PluginMetaPersistenceService } from '../../plugin-meta-persistence.service';
import { PluginCacheService } from '../../plugin-cache.service';
import { MAX_PLUGIN_ZIP_SIZE } from '../../plugin.const';
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
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { PluginIconComponent } from '../plugin-icon/plugin-icon.component';
import { IS_ELECTRON } from '../../../app.constants';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';

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
    TranslatePipe,
    PluginIconComponent,
  ],
})
export class PluginManagementComponent implements OnInit {
  private readonly _pluginService = inject(PluginService);
  private readonly _pluginMetaPersistenceService = inject(PluginMetaPersistenceService);
  private readonly _pluginCacheService = inject(PluginCacheService);
  private readonly _translateService = inject(TranslateService);
  private readonly _destroyRef = inject(DestroyRef);

  T: typeof T = T;
  readonly IS_ELECTRON = IS_ELECTRON;

  // Plugin size limits for display
  readonly maxPluginSizeMB = (MAX_PLUGIN_ZIP_SIZE / 1024 / 1024).toFixed(1);

  // Signal for all plugins (loaded + disabled with isEnabled state)
  readonly allPlugins = signal<PluginInstance[]>([]);

  // Signal for plugin states (for lazy loading)
  readonly pluginStates = signal<Map<string, PluginState>>(new Map());

  // Upload state
  readonly isUploading = signal<boolean>(false);
  readonly uploadError = signal<string | null>(null);

  constructor() {
    // Subscribe to plugin states for lazy loading
    this._pluginService.pluginStates$
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((states) => {
        this.pluginStates.set(states);
        this.updatePluginsFromStates();
      });
  }

  async ngOnInit(): Promise<void> {
    // Wait for plugin system to initialize before loading plugins
    while (!this._pluginService.isInitialized()) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await this.loadPlugins();
  }

  async loadPlugins(): Promise<void> {
    const allPlugins = await this._pluginService.getAllPlugins();
    this.allPlugins.set(allPlugins);
  }

  private updatePluginsFromStates(): void {
    const plugins: PluginInstance[] = [];

    for (const state of this.pluginStates().values()) {
      if (state.instance) {
        // Plugin is loaded, use the instance
        plugins.push(state.instance);
      } else {
        // Create a placeholder instance
        plugins.push({
          manifest: state.manifest,
          loaded: state.status === 'loaded',
          isEnabled: state.isEnabled,
          error: state.error,
        });
      }
    }

    this.allPlugins.set(plugins);
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
      // Check if plugin requires Node.js execution consent
      const hasConsent = await this._pluginService.checkNodeExecutionPermission(
        plugin.manifest,
      );
      if (!hasConsent) {
        console.log(
          'User denied Node.js execution permission for plugin:',
          plugin.manifest.id,
        );
        // Reset the toggle state
        await this.loadPlugins();
        return;
      }

      // Set plugin as enabled in persistence
      await this._pluginMetaPersistenceService.setPluginEnabled(plugin.manifest.id, true);

      // Update the plugin state immediately
      plugin.isEnabled = true;

      // Activate the plugin (lazy load if needed)
      const instance = await this._pluginService.activatePlugin(plugin.manifest.id);
      if (instance) {
        console.log('Plugin activated successfully:', plugin.manifest.id);
      }

      // Refresh UI
      await this.loadPlugins();
    } catch (error) {
      console.error('Failed to enable plugin:', error);
    }
  }

  private async disablePlugin(plugin: PluginInstance): Promise<void> {
    console.log('Disabling plugin:', plugin.manifest.id);

    try {
      // Set plugin as disabled in persistence
      await this._pluginMetaPersistenceService.setPluginEnabled(
        plugin.manifest.id,
        false,
      );

      // Update the plugin state immediately
      plugin.isEnabled = false;
      plugin.loaded = false;

      // Unload the plugin (this will unregister hooks and remove from loaded plugins)
      this._pluginService.unloadPlugin(plugin.manifest.id);

      // Reload plugins to get the updated state from the service
      await this.loadPlugins();
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
      return this._translateService.instant(T.PLUGINS.ERROR);
    }

    // Check if plugin is loading
    const state = this.pluginStates().get(plugin.manifest.id);
    if (state && state.status === 'loading') {
      return this._translateService.instant(T.PLUGINS.LOADING_PLUGIN);
    }

    return plugin.isEnabled
      ? this._translateService.instant(T.PLUGINS.ENABLED)
      : this._translateService.instant(T.PLUGINS.DISABLED);
  }

  isPluginLoading(plugin: PluginInstance): boolean {
    const state = this.pluginStates().get(plugin.manifest.id);
    return state?.status === 'loading' || false;
  }

  requiresNodeExecution(plugin: PluginInstance): boolean {
    return (
      plugin.manifest.permissions?.includes('nodeExecution') ||
      plugin.manifest.permissions?.includes('executeNodeScript') ||
      false
    );
  }

  canEnablePlugin(plugin: PluginInstance): boolean {
    // Plugin can be enabled if there's no error AND either:
    // 1. It doesn't require nodeExecution, OR
    // 2. We're running in Electron
    return !plugin.error && (!this.requiresNodeExecution(plugin) || IS_ELECTRON);
  }

  getNodeExecutionMessage(): string {
    return this._translateService.instant('PLUGINS.NODE_EXECUTION_REQUIRED');
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.name.endsWith('.zip')) {
      this.uploadError.set(
        this._translateService.instant(T.PLUGINS.PLEASE_SELECT_ZIP_FILE),
      );
      return;
    }

    if (file.size > MAX_PLUGIN_ZIP_SIZE) {
      this.uploadError.set(
        this._translateService.instant(T.PLUGINS.FILE_TOO_LARGE, {
          maxSize: this.maxPluginSizeMB,
          fileSize: (file.size / 1024 / 1024).toFixed(1),
        }),
      );
      return;
    }

    this.isUploading.set(true);
    this.uploadError.set(null);

    try {
      await this._pluginService.loadPluginFromZip(file);
      await this.loadPlugins(); // Refresh the plugin list

      // Clear the input
      input.value = '';
    } catch (error) {
      console.error('Failed to load plugin from ZIP:', error);
      this.uploadError.set(
        error instanceof Error
          ? error.message
          : this._translateService.instant(T.PLUGINS.FAILED_TO_INSTALL),
      );
    } finally {
      this.isUploading.set(false);
    }
  }

  async clearPluginCache(): Promise<void> {
    try {
      this.isUploading.set(true);
      this.uploadError.set(null);

      await this._pluginCacheService.clearCache();
      await this.loadPlugins(); // Refresh the plugin list

      console.log('Plugin cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear plugin cache:', error);
      this.uploadError.set(
        error instanceof Error
          ? error.message
          : this._translateService.instant(T.PLUGINS.FAILED_TO_CLEAR_CACHE),
      );
    } finally {
      this.isUploading.set(false);
    }
  }

  isUploadedPlugin(plugin: PluginInstance): boolean {
    // Check if this is an uploaded plugin by checking if it has persistence data with 'uploaded' source
    // This is a simple heuristic - uploaded plugins have the uploaded:// path prefix
    return (
      this._pluginService.getPluginPath(plugin.manifest.id)?.startsWith('uploaded://') ??
      false
    );
  }

  async removeUploadedPlugin(plugin: PluginInstance): Promise<void> {
    if (
      !confirm(
        this._translateService.instant(T.PLUGINS.CONFIRM_REMOVE, {
          name: plugin.manifest.name,
        }),
      )
    ) {
      return;
    }

    try {
      this.isUploading.set(true);
      this.uploadError.set(null);

      await this._pluginService.removeUploadedPlugin(plugin.manifest.id);
      await this.loadPlugins(); // Refresh the plugin list

      console.log(`Plugin ${plugin.manifest.id} removed successfully`);
    } catch (error) {
      console.error('Failed to remove plugin:', error);
      this.uploadError.set(
        error instanceof Error
          ? error.message
          : this._translateService.instant(T.PLUGINS.FAILED_TO_REMOVE),
      );
    } finally {
      this.isUploading.set(false);
    }
  }

  getPluginDescription(plugin: PluginInstance): string {
    // Use manifest description if available
    if (plugin.manifest.description) {
      return plugin.manifest.description;
    }

    // Fallback: generate a basic description based on plugin manifest
    const features: string[] = [];

    if (plugin.manifest.hooks?.length > 0) {
      features.push(
        this._translateService.instant(T.PLUGINS.HOOKS, {
          count: plugin.manifest.hooks.length,
        }),
      );
    }

    if (plugin.manifest.permissions?.length > 0) {
      features.push(
        this._translateService.instant(T.PLUGINS.PERMISSIONS, {
          count: plugin.manifest.permissions.length,
        }),
      );
    }

    if (plugin.manifest.type) {
      features.push(
        this._translateService.instant(T.PLUGINS.TYPE, {
          type: plugin.manifest.type,
        }),
      );
    }

    return features.length > 0
      ? features.join(' • ')
      : this._translateService.instant(T.PLUGINS.NO_ADDITIONAL_INFO);
  }
}
