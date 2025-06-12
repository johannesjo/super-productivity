import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { take } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PluginRunner } from './plugin-runner';
import { PluginHooksService } from './plugin-hooks';
import { PluginSecurityService } from './plugin-security';
import { PluginBaseCfg, PluginInstance, PluginManifest } from './plugin-api.model';
import { GlobalThemeService } from '../core/theme/global-theme.service';
import { IS_ANDROID_WEB_VIEW } from '../util/is-android-web-view';
import { IS_ELECTRON } from '../app.constants';
import { PluginMetaPersistenceService } from './plugin-meta-persistence.service';
import { PluginUserPersistenceService } from './plugin-user-persistence.service';
import { PluginCacheService } from './plugin-cache.service';

@Injectable({
  providedIn: 'root',
})
export class PluginService {
  private _isInitialized = false;
  private _loadedPlugins: PluginInstance[] = [];
  private _pluginPaths: Map<string, string> = new Map(); // Store plugin ID -> path mapping

  constructor(
    private _http: HttpClient,
    private _pluginRunner: PluginRunner,
    private _pluginHooks: PluginHooksService,
    private _pluginSecurity: PluginSecurityService,
    private _globalThemeService: GlobalThemeService,
    private _pluginMetaPersistenceService: PluginMetaPersistenceService,
    private _pluginUserPersistenceService: PluginUserPersistenceService,
    private _pluginCacheService: PluginCacheService,
  ) {}

  async initializePlugins(): Promise<void> {
    if (this._isInitialized) {
      console.warn('Plugin system already initialized');
      return;
    }

    console.log('Initializing plugin system...');

    try {
      // Load plugins from known locations
      await this._loadBuiltInPlugins();

      // Load uploaded plugins
      await this._loadUploadedPlugins();

      // Clean up old cached plugins
      await this._pluginCacheService.cleanupOldPlugins();

      this._isInitialized = true;
      console.log('Plugin system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize plugin system:', error);
      throw error;
    }
  }

  private async _loadBuiltInPlugins(): Promise<void> {
    // For now, we'll load the example plugin from assets
    const pluginPaths = ['assets/example-plugin'];

    for (const pluginPath of pluginPaths) {
      try {
        const pluginInstance = await this._loadPlugin(pluginPath);
        // Add all plugin instances to the loaded plugins list so they show up in the management UI
        // Note: _loadPlugin already adds loaded plugins to _loadedPlugins, so we only need to add disabled ones
        if (!pluginInstance.loaded && !pluginInstance.isEnabled) {
          this._loadedPlugins.push(pluginInstance);
        }
      } catch (error) {
        console.error(`Failed to load plugin from ${pluginPath}:`, error);
        // Continue loading other plugins even if one fails
      }
    }
  }

  private async _loadUploadedPlugins(): Promise<void> {
    try {
      const cachedPlugins = await this._pluginCacheService.getAllPlugins();

      // Load each cached plugin
      for (const cachedPlugin of cachedPlugins) {
        try {
          console.log(`Loading cached plugin: ${cachedPlugin.id}`);
          // Set the path for reload functionality
          this._pluginPaths.set(cachedPlugin.id, `uploaded://${cachedPlugin.id}`);
        } catch (error) {
          console.error(`Failed to load cached plugin ${cachedPlugin.id}:`, error);
          // Continue loading other plugins even if one fails
        }
      }
    } catch (error) {
      console.error('Failed to load cached plugins:', error);
      // Don't throw - this shouldn't prevent other plugins from loading
    }
  }

  private async _loadPlugin(pluginPath: string): Promise<PluginInstance> {
    try {
      // Load manifest
      const manifestUrl = `${pluginPath}/manifest.json`;
      const manifest = await this._http
        .get<PluginManifest>(manifestUrl)
        .pipe(take(1))
        .toPromise();

      if (!manifest) {
        throw new Error('Failed to load plugin manifest');
      }

      // Validate manifest
      const manifestValidation = this._pluginSecurity.validatePluginManifest(manifest);
      if (!manifestValidation.isValid) {
        throw new Error(
          `Plugin manifest validation failed: ${manifestValidation.errors.join(', ')}`,
        );
      }

      // Load plugin code
      const pluginCodeUrl = `${pluginPath}/plugin.js`;
      const pluginCode = await this._http
        .get(pluginCodeUrl, { responseType: 'text' })
        .pipe(take(1))
        .toPromise();

      if (!pluginCode) {
        throw new Error('Failed to load plugin code');
      }

      // Validate plugin code
      const codeValidation = this._pluginSecurity.validatePluginCode(pluginCode);
      if (!codeValidation.isValid) {
        throw new Error(
          `Plugin code validation failed: ${codeValidation.errors.join(', ')}`,
        );
      }

      // Check if plugin should be loaded based on persisted enabled state
      const isPluginEnabled = await this._pluginMetaPersistenceService.isPluginEnabled(
        manifest.id,
      );

      // If plugin is disabled, create a placeholder instance without loading code
      if (!isPluginEnabled) {
        const placeholderInstance: PluginInstance = {
          manifest,
          loaded: false,
          isEnabled: false,
          error: undefined,
        };
        this._pluginPaths.set(manifest.id, pluginPath); // Store the path for potential reload
        console.log(`Plugin ${manifest.id} is disabled, skipping load`);
        return placeholderInstance;
      }

      // Load the plugin
      const baseCfg = this._getBaseCfg();
      const pluginInstance = await this._pluginRunner.loadPlugin(
        manifest,
        pluginCode,
        baseCfg,
        true, // Plugin is enabled if we reach this point
      );

      if (pluginInstance.loaded) {
        this._loadedPlugins.push(pluginInstance);
        this._pluginPaths.set(manifest.id, pluginPath); // Store the path

        // Ensure plugin is marked as enabled since we loaded it
        await this._pluginMetaPersistenceService.setPluginEnabled(manifest.id, true);

        console.log(`Plugin ${manifest.id} loaded successfully`);
      } else {
        console.error(`Plugin ${manifest.id} failed to load:`, pluginInstance.error);
      }

      return pluginInstance;
    } catch (error) {
      console.error(`Failed to load plugin from ${pluginPath}:`, error);
      throw error;
    }
  }

  private _getBaseCfg(): PluginBaseCfg {
    let platform: PluginBaseCfg['platform'] = 'web';
    if (IS_ELECTRON) {
      platform = 'desktop';
    } else if (IS_ANDROID_WEB_VIEW) {
      platform = 'android';
    }

    return {
      theme: this._globalThemeService.darkMode$.getValue() ? 'dark' : 'light',
      appVersion: environment.version,
      platform,
      isDev: !environment.production,
    };
  }

  async getAllPlugins(): Promise<PluginInstance[]> {
    const loadedPlugins = [...this._loadedPlugins];
    const allPluginMetadata =
      await this._pluginMetaPersistenceService.getAllPluginMetadata();

    // Update loaded plugins with persistence state
    for (const plugin of loadedPlugins) {
      const metadata = allPluginMetadata.find((data) => data.id === plugin.manifest.id);
      plugin.isEnabled = metadata?.isEnabled ?? false;
    }

    // Add disabled plugins that aren't loaded
    for (const pluginMetadata of allPluginMetadata) {
      const isAlreadyLoaded = loadedPlugins.some(
        (p) => p.manifest.id === pluginMetadata.id,
      );
      if (!isAlreadyLoaded && pluginMetadata.isEnabled === false) {
        // Create minimal PluginInstance for disabled plugins
        loadedPlugins.push({
          manifest: {
            id: pluginMetadata.id,
            name: pluginMetadata.id,
            version: 'unknown',
            manifestVersion: 1,
            minSupVersion: 'unknown',
            hooks: [],
            permissions: [],
            type: 'standard',
          },
          loaded: false,
          isEnabled: false,
          error: undefined,
        });
      }
    }

    return loadedPlugins;
  }

  getLoadedPlugins(): PluginInstance[] {
    return [...this._loadedPlugins];
  }

  getPluginPath(pluginId: string): string | undefined {
    return this._pluginPaths.get(pluginId);
  }

  isInitialized(): boolean {
    return this._isInitialized;
  }

  async dispatchHook(hookName: any, payload?: any): Promise<void> {
    if (!this._isInitialized) {
      console.warn('Plugin system not initialized, skipping hook dispatch');
      return;
    }

    await this._pluginHooks.dispatchHook(hookName, payload);
  }

  async loadPluginFromPath(pluginPath: string): Promise<PluginInstance> {
    const pluginInstance = await this._loadPlugin(pluginPath);

    if (pluginInstance.loaded) {
      this._loadedPlugins.push(pluginInstance);
    }

    return pluginInstance;
  }

  async loadPluginFromZip(file: File): Promise<PluginInstance> {
    // Import fflate dynamically for better bundle size
    const { unzip } = await import('fflate');

    try {
      // Convert File to Uint8Array
      const arrayBuffer = await file.arrayBuffer();
      const zipData = new Uint8Array(arrayBuffer);

      // Extract ZIP contents
      const extractedFiles = await new Promise<Record<string, Uint8Array>>(
        (resolve, reject) => {
          unzip(zipData, (err, files) => {
            if (err) {
              reject(new Error(`Failed to extract ZIP: ${err.message}`));
              return;
            }
            resolve(files);
          });
        },
      );

      // Find and extract manifest.json
      if (!extractedFiles['manifest.json']) {
        throw new Error('manifest.json not found in plugin ZIP');
      }

      const manifestText = new TextDecoder().decode(extractedFiles['manifest.json']);
      const manifest: PluginManifest = JSON.parse(manifestText);

      // Validate manifest
      const manifestValidation = this._pluginSecurity.validatePluginManifest(manifest);
      if (!manifestValidation.isValid) {
        throw new Error(
          `Plugin manifest validation failed: ${manifestValidation.errors.join(', ')}`,
        );
      }

      // Find and extract plugin.js
      if (!extractedFiles['plugin.js']) {
        throw new Error('plugin.js not found in plugin ZIP');
      }

      const pluginCode = new TextDecoder().decode(extractedFiles['plugin.js']);

      // Validate plugin code
      const codeValidation = this._pluginSecurity.validatePluginCode(pluginCode);
      if (!codeValidation.isValid) {
        throw new Error(
          `Plugin code validation failed: ${codeValidation.errors.join(', ')}`,
        );
      }

      // Check if plugin is enabled (default to true for new uploads)
      const isPluginEnabled = await this._pluginMetaPersistenceService.isPluginEnabled(
        manifest.id,
      );

      // Create a unique path identifier for uploaded plugins
      const uploadedPluginPath = `uploaded://${manifest.id}`;

      // Always store plugin files in cache for later use (regardless of enabled state)
      await this._pluginCacheService.storePlugin(manifest.id, manifestText, pluginCode);

      // If plugin is disabled, create a placeholder instance without loading code
      if (!isPluginEnabled) {
        const placeholderInstance: PluginInstance = {
          manifest,
          loaded: false,
          isEnabled: false,
          error: undefined,
        };
        this._pluginPaths.set(manifest.id, uploadedPluginPath);
        this._loadedPlugins.push(placeholderInstance); // Add to list so it shows in management UI

        console.log(`Uploaded plugin ${manifest.id} is disabled, skipping load`);
        return placeholderInstance;
      }

      // Load the plugin
      const baseCfg = this._getBaseCfg();
      const pluginInstance = await this._pluginRunner.loadPlugin(
        manifest,
        pluginCode,
        baseCfg,
        true, // Plugin is enabled if we reach this point
      );

      if (pluginInstance.loaded) {
        this._loadedPlugins.push(pluginInstance);
        this._pluginPaths.set(manifest.id, uploadedPluginPath);

        console.log(`Uploaded plugin ${manifest.id} loaded successfully`);
      } else {
        console.error(
          `Uploaded plugin ${manifest.id} failed to load:`,
          pluginInstance.error,
        );
      }

      return pluginInstance;
    } catch (error) {
      console.error('Failed to load plugin from ZIP:', error);
      throw error;
    }
  }

  async removeUploadedPlugin(pluginId: string): Promise<void> {
    // First disable and unload the plugin if it's currently loaded
    const pluginInstance = this._loadedPlugins.find((p) => p.manifest.id === pluginId);
    if (pluginInstance && pluginInstance.loaded) {
      // Disable the plugin first
      await this._pluginMetaPersistenceService.setPluginEnabled(pluginId, false);

      // Unload and unregister the plugin
      this.unloadPlugin(pluginId);
    }

    // Remove from cache
    await this._pluginCacheService.removePlugin(pluginId);

    // Remove from persistence (both user data and metadata)
    await this._pluginUserPersistenceService.removePluginUserData(pluginId);
    await this._pluginMetaPersistenceService.removePluginMetadata(pluginId);

    // Remove from loaded plugins (handles both loaded and placeholder instances)
    const index = this._loadedPlugins.findIndex((p) => p.manifest.id === pluginId);
    if (index !== -1) {
      this._loadedPlugins.splice(index, 1);
    }

    // Remove path mapping
    this._pluginPaths.delete(pluginId);

    console.log(`Uploaded plugin ${pluginId} removed completely`);
  }

  unloadPlugin(pluginId: string): boolean {
    const index = this._loadedPlugins.findIndex((p) => p.manifest.id === pluginId);
    if (index !== -1) {
      this._loadedPlugins.splice(index, 1);
      this._pluginHooks.unregisterPluginHooks(pluginId);
      // Don't remove from _pluginPaths for reload functionality
      return this._pluginRunner.unloadPlugin(pluginId);
    }
    return false;
  }

  async reloadPlugin(pluginId: string): Promise<boolean> {
    const pluginPath = this._pluginPaths.get(pluginId);
    if (!pluginPath) {
      console.error(`Cannot reload plugin ${pluginId}: path not found`);
      return false;
    }

    // Unload the plugin first
    this.unloadPlugin(pluginId);

    try {
      // Check if this is an uploaded plugin
      if (pluginPath.startsWith('uploaded://')) {
        // Load from stored files
        const pluginInstance = await this._loadUploadedPlugin(pluginId);
        return pluginInstance.loaded;
      } else {
        // Load from file system path
        const pluginInstance = await this._loadPlugin(pluginPath);
        return pluginInstance.loaded;
      }
    } catch (error) {
      console.error(`Failed to reload plugin ${pluginId}:`, error);
      return false;
    }
  }

  private async _loadUploadedPlugin(pluginId: string): Promise<PluginInstance> {
    try {
      // Load cached plugin files
      const cachedPlugin = await this._pluginCacheService.getPlugin(pluginId);
      if (!cachedPlugin) {
        throw new Error(`Cached files not found for uploaded plugin ${pluginId}`);
      }

      const manifest: PluginManifest = JSON.parse(cachedPlugin.manifest);
      const pluginCode: string = cachedPlugin.code;

      // Validate manifest
      const manifestValidation = this._pluginSecurity.validatePluginManifest(manifest);
      if (!manifestValidation.isValid) {
        throw new Error(
          `Plugin manifest validation failed: ${manifestValidation.errors.join(', ')}`,
        );
      }

      // Validate plugin code
      const codeValidation = this._pluginSecurity.validatePluginCode(pluginCode);
      if (!codeValidation.isValid) {
        throw new Error(
          `Plugin code validation failed: ${codeValidation.errors.join(', ')}`,
        );
      }

      // Check if plugin is enabled
      const isPluginEnabled = await this._pluginMetaPersistenceService.isPluginEnabled(
        manifest.id,
      );

      // If plugin is disabled, create a placeholder instance without loading code
      if (!isPluginEnabled) {
        const placeholderInstance: PluginInstance = {
          manifest,
          loaded: false,
          isEnabled: false,
          error: undefined,
        };
        console.log(`Uploaded plugin ${manifest.id} is disabled, skipping reload`);
        return placeholderInstance;
      }

      // Load the plugin
      const baseCfg = this._getBaseCfg();
      const pluginInstance = await this._pluginRunner.loadPlugin(
        manifest,
        pluginCode,
        baseCfg,
        true, // Plugin is enabled if we reach this point
      );

      // Always add plugin to loaded plugins list for management UI
      this._loadedPlugins.push(pluginInstance);

      if (pluginInstance.loaded) {
        console.log(`Uploaded plugin ${manifest.id} reloaded successfully`);
      } else {
        console.error(
          `Uploaded plugin ${manifest.id} failed to reload:`,
          pluginInstance.error,
        );
      }

      return pluginInstance;
    } catch (error) {
      console.error(`Failed to reload uploaded plugin ${pluginId}:`, error);
      throw error;
    }
  }
}
