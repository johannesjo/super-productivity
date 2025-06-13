/* eslint-disable max-len */
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { take } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PluginRunner } from './plugin-runner';
import { PluginHooksService } from './plugin-hooks';
import { PluginSecurityService } from './plugin-security';
import { Hooks, PluginBaseCfg, PluginInstance, PluginManifest } from './plugin-api.model';
import { GlobalThemeService } from '../core/theme/global-theme.service';
import { IS_ANDROID_WEB_VIEW } from '../util/is-android-web-view';
import { IS_ELECTRON } from '../app.constants';
import { PluginMetaPersistenceService } from './plugin-meta-persistence.service';
import { PluginUserPersistenceService } from './plugin-user-persistence.service';
import { PluginCacheService } from './plugin-cache.service';
import {
  MAX_PLUGIN_CODE_SIZE,
  MAX_PLUGIN_MANIFEST_SIZE,
  MAX_PLUGIN_ZIP_SIZE,
} from './plugin.const';

@Injectable({
  providedIn: 'root',
})
export class PluginService {
  private readonly _http = inject(HttpClient);
  private readonly _pluginRunner = inject(PluginRunner);
  private readonly _pluginHooks = inject(PluginHooksService);
  private readonly _pluginSecurity = inject(PluginSecurityService);
  private readonly _globalThemeService = inject(GlobalThemeService);
  private readonly _pluginMetaPersistenceService = inject(PluginMetaPersistenceService);
  private readonly _pluginUserPersistenceService = inject(PluginUserPersistenceService);
  private readonly _pluginCacheService = inject(PluginCacheService);

  private _isInitialized = false;
  private _loadedPlugins: PluginInstance[] = [];
  private _pluginPaths: Map<string, string> = new Map(); // Store plugin ID -> path mapping
  private _pluginIndexHtml: Map<string, string> = new Map(); // Store plugin ID -> index.html content
  private _pluginIcons: Map<string, string> = new Map(); // Store plugin ID -> SVG icon content
  private _pluginIconsSignal = signal<Map<string, string>>(new Map());

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
    const pluginPaths = [
      'assets/example-plugin',
      'assets/yesterday-tasks-plugin',
      'assets/markdown-list-to-task',
    ];
    await this._loadPluginsFromPaths(pluginPaths, 'built-in');
  }

  private async _loadUploadedPlugins(): Promise<void> {
    try {
      const cachedPlugins = await this._pluginCacheService.getAllPlugins();

      const promises = cachedPlugins.map(async (cachedPlugin) => {
        try {
          console.log(`Loading cached plugin: ${cachedPlugin.id}`);
          // Set the path for reload functionality
          this._pluginPaths.set(cachedPlugin.id, `uploaded://${cachedPlugin.id}`);

          // Load the cached plugin
          await this._loadUploadedPlugin(cachedPlugin.id);
          // The plugin instance is already added to _loadedPlugins in _loadUploadedPlugin if loaded successfully
        } catch (error) {
          console.error(`Failed to load cached plugin ${cachedPlugin.id}:`, error);
          // Continue loading other plugins even if one fails
        }
      });

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Failed to load cached plugins:', error);
      // Don't throw - this shouldn't prevent other plugins from loading
    }
  }

  /**
   * Load plugins from multiple paths with error handling
   */
  private async _loadPluginsFromPaths(
    pluginPaths: string[],
    type: 'built-in' | 'uploaded',
  ): Promise<void> {
    const promises = pluginPaths.map(async (pluginPath) => {
      try {
        const pluginInstance = await this._loadPlugin(pluginPath);
        // Add all plugin instances to the loaded plugins list so they show up in the management UI
        // Note: _loadPlugin already adds loaded plugins to _loadedPlugins, so we only need to add disabled ones
        if (!pluginInstance.loaded && !pluginInstance.isEnabled) {
          this._loadedPlugins.push(pluginInstance);
        }
        // Store the path for built-in plugins to enable reload functionality
        // This ensures that built-in plugins can be reloaded just like uploaded ones
        if (pluginInstance.manifest && pluginInstance.manifest.id) {
          this._pluginPaths.set(pluginInstance.manifest.id, pluginPath);
        }
        console.log(`${type} plugin loaded successfully from ${pluginPath}`);
      } catch (error) {
        console.error(`Failed to load ${type} plugin from ${pluginPath}:`, error);
        // Continue loading other plugins even if one fails
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Validate and load plugin files (code, manifest, assets)
   */
  private async _validateAndLoadPluginFiles(
    manifest: PluginManifest,
    pluginPath?: string,
  ): Promise<{ pluginCode: string; indexHtml?: string }> {
    // Validate manifest
    const manifestValidation = this._pluginSecurity.validatePluginManifest(manifest);
    if (!manifestValidation.isValid) {
      throw new Error(
        `Plugin manifest validation failed: ${manifestValidation.errors.join(', ')}`,
      );
    }

    let pluginCode: string;
    let indexHtml: string | undefined;

    if (pluginPath) {
      // Load from file system path
      const pluginCodeUrl = `${pluginPath}/plugin.js`;
      pluginCode =
        (await this._http
          .get(pluginCodeUrl, { responseType: 'text' })
          .pipe(take(1))
          .toPromise()) || '';

      if (!pluginCode) {
        throw new Error('Failed to load plugin code');
      }

      // Only try to load index.html if manifest.iFrame is true
      if (manifest.iFrame) {
        const indexHtmlUrl = `${pluginPath}/index.html`;
        try {
          indexHtml =
            (await this._http
              .get(indexHtmlUrl, { responseType: 'text' })
              .pipe(take(1))
              .toPromise()) || undefined;

          if (indexHtml) {
            this._pluginIndexHtml.set(manifest.id, indexHtml);
            console.log(`Loaded index.html for plugin ${manifest.id}`);
          }
        } catch (error) {
          console.log(`No index.html found for plugin ${manifest.id} (optional)`);
        }
      }

      // Try to load icon if specified in manifest
      if (manifest.icon) {
        const iconUrl = `${pluginPath}/${manifest.icon}`;
        try {
          const iconContent = await this._http
            .get(iconUrl, { responseType: 'text' })
            .pipe(take(1))
            .toPromise();

          if (iconContent) {
            this._pluginIcons.set(manifest.id, iconContent);
            this._pluginIconsSignal.set(new Map(this._pluginIcons));
          }
        } catch (error) {
          console.log(`Failed to load icon for plugin ${manifest.id}:`, error);
        }
      }
    } else {
      throw new Error('Plugin path is required for file loading');
    }

    // Validate plugin code
    const codeValidation = this._pluginSecurity.validatePluginCode(pluginCode);
    if (!codeValidation.isValid) {
      throw new Error(
        `Plugin code validation failed: ${codeValidation.errors.join(', ')}`,
      );
    }

    return { pluginCode, indexHtml };
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

      // Check if plugin should be loaded based on persisted enabled state
      const isPluginEnabled = await this._pluginMetaPersistenceService.isPluginEnabled(
        manifest.id,
      );

      // Always validate and load files to get index.html if present
      const { pluginCode } = await this._validateAndLoadPluginFiles(manifest, pluginPath);

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
        // Check if plugin is already in the list to prevent duplicates
        const existingIndex = this._loadedPlugins.findIndex(
          (p) => p.manifest.id === manifest.id,
        );
        if (existingIndex === -1) {
          this._loadedPlugins.push(pluginInstance);
        } else {
          // Replace existing instance
          this._loadedPlugins[existingIndex] = pluginInstance;
        }
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

  /**
   * Get index.html content for a plugin
   */
  getPluginIndexHtml(pluginId: string): string | null {
    return this._pluginIndexHtml.get(pluginId) || null;
  }

  /**
   * Get SVG icon content for a plugin
   */
  getPluginIcon(pluginId: string): string | null {
    return this._pluginIcons.get(pluginId) || null;
  }

  /**
   * Get reactive signal for plugin icons
   */
  getPluginIconsSignal(): import('@angular/core').Signal<ReadonlyMap<string, string>> {
    return this._pluginIconsSignal.asReadonly();
  }

  async dispatchHook(hookName: Hooks, payload?: unknown): Promise<void> {
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
    console.log(`Starting plugin load from ZIP: ${file.name}`);

    // Import fflate dynamically for better bundle size
    const { unzip } = await import('fflate');

    try {
      // Validate ZIP file size
      if (file.size > MAX_PLUGIN_ZIP_SIZE) {
        throw new Error(
          `Plugin ZIP file is too large. Maximum allowed size is ${(MAX_PLUGIN_ZIP_SIZE / 1024 / 1024).toFixed(1)} MB, but received ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
        );
      }

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

      // Validate manifest.json size
      const manifestBytes = extractedFiles['manifest.json'];
      if (manifestBytes.length > MAX_PLUGIN_MANIFEST_SIZE) {
        throw new Error(
          `Plugin manifest.json is too large. Maximum allowed size is ${(MAX_PLUGIN_MANIFEST_SIZE / 1024).toFixed(1)} KB, but received ${(manifestBytes.length / 1024).toFixed(1)} KB.`,
        );
      }

      const manifestText = new TextDecoder().decode(manifestBytes);
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

      // Validate plugin.js size
      const pluginCodeBytes = extractedFiles['plugin.js'];
      if (pluginCodeBytes.length > MAX_PLUGIN_CODE_SIZE) {
        throw new Error(
          `Plugin code (plugin.js) is too large. Maximum allowed size is ${(MAX_PLUGIN_CODE_SIZE / 1024 / 1024).toFixed(1)} MB, but received ${(pluginCodeBytes.length / 1024 / 1024).toFixed(1)} MB.`,
        );
      }

      const pluginCode = new TextDecoder().decode(pluginCodeBytes);

      // Extract index.html if it exists (optional) and iFrame is true
      let indexHtml: string | null = null;
      if (manifest.iFrame && extractedFiles['index.html']) {
        const indexHtmlBytes = extractedFiles['index.html'];
        // Validate index.html size (same as manifest for now)
        if (indexHtmlBytes.length > MAX_PLUGIN_MANIFEST_SIZE) {
          throw new Error(
            `Plugin index.html is too large. Maximum allowed size is ${(MAX_PLUGIN_MANIFEST_SIZE / 1024).toFixed(1)} KB, but received ${(indexHtmlBytes.length / 1024).toFixed(1)} KB.`,
          );
        }
        indexHtml = new TextDecoder().decode(indexHtmlBytes);
      }

      // Extract icon if specified in manifest
      let iconContent: string | null = null;
      if (manifest.icon && extractedFiles[manifest.icon]) {
        const iconBytes = extractedFiles[manifest.icon];
        // Validate icon size (same as manifest for now)
        if (iconBytes.length > MAX_PLUGIN_MANIFEST_SIZE) {
          throw new Error(
            `Plugin icon is too large. Maximum allowed size is ${(MAX_PLUGIN_MANIFEST_SIZE / 1024).toFixed(1)} KB, but received ${(iconBytes.length / 1024).toFixed(1)} KB.`,
          );
        }
        iconContent = new TextDecoder().decode(iconBytes);
        // Basic SVG validation
        if (!iconContent.includes('<svg') || !iconContent.includes('</svg>')) {
          console.warn(`Plugin icon ${manifest.icon} does not appear to be a valid SVG`);
          iconContent = null;
        }
      }

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
      await this._pluginCacheService.storePlugin(
        manifest.id,
        manifestText,
        pluginCode,
        indexHtml || undefined,
        iconContent || undefined,
      );

      // Store index.html content if it exists
      if (indexHtml) {
        this._pluginIndexHtml.set(manifest.id, indexHtml);
      }

      // Store icon content if it exists
      if (iconContent) {
        this._pluginIcons.set(manifest.id, iconContent);
        this._pluginIconsSignal.set(new Map(this._pluginIcons));
      }

      // If plugin is disabled, create a placeholder instance without loading code
      if (!isPluginEnabled) {
        const placeholderInstance: PluginInstance = {
          manifest,
          loaded: false,
          isEnabled: false,
          error: undefined,
        };
        this._pluginPaths.set(manifest.id, uploadedPluginPath);
        // Check if plugin is already in the list to prevent duplicates
        const existingIndexDisabled = this._loadedPlugins.findIndex(
          (p) => p.manifest.id === manifest.id,
        );
        if (existingIndexDisabled === -1) {
          this._loadedPlugins.push(placeholderInstance);
        } else {
          // Replace existing instance
          this._loadedPlugins[existingIndexDisabled] = placeholderInstance;
        }

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
        // Check if plugin is already in the list to prevent duplicates
        const existingIndexLoaded = this._loadedPlugins.findIndex(
          (p) => p.manifest.id === manifest.id,
        );
        if (existingIndexLoaded === -1) {
          this._loadedPlugins.push(pluginInstance);
        } else {
          // Replace existing instance
          this._loadedPlugins[existingIndexLoaded] = pluginInstance;
        }
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

      // Create error instance for UI display
      const errorInstance: PluginInstance = {
        manifest: {
          id: `error-${Date.now()}`,
          name: file.name.replace('.zip', ''),
          version: 'unknown',
          manifestVersion: 1,
          minSupVersion: 'unknown',
          hooks: [],
          permissions: [],
          type: 'standard',
        },
        loaded: false,
        isEnabled: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error occurred during plugin installation',
      };

      // Still add to loaded plugins list so user can see the error
      this._loadedPlugins.push(errorInstance);

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

    // Remove index.html content
    this._pluginIndexHtml.delete(pluginId);

    // Remove icon content
    this._pluginIcons.delete(pluginId);
    this._pluginIconsSignal.set(new Map(this._pluginIcons));

    console.log(`Uploaded plugin ${pluginId} removed completely`);
  }

  unloadPlugin(pluginId: string): boolean {
    const index = this._loadedPlugins.findIndex((p) => p.manifest.id === pluginId);
    if (index !== -1) {
      this._loadedPlugins.splice(index, 1);
      this._pluginHooks.unregisterPluginHooks(pluginId);
      // Don't remove from _pluginPaths or _pluginIndexHtml for reload functionality
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
      let pluginInstance: PluginInstance;

      // Check if this is an uploaded plugin
      if (pluginPath.startsWith('uploaded://')) {
        // Load from stored files
        pluginInstance = await this._loadUploadedPlugin(pluginId);
      } else {
        // Load from file system path
        pluginInstance = await this._loadPlugin(pluginPath);
        // Note: _loadPlugin already handles adding to _loadedPlugins
      }

      return pluginInstance.loaded;
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

      // Store index.html content if it exists in cache
      if (cachedPlugin.indexHtml) {
        this._pluginIndexHtml.set(manifest.id, cachedPlugin.indexHtml);
      }

      // Store icon content if it exists in cache
      if (cachedPlugin.icon) {
        this._pluginIcons.set(manifest.id, cachedPlugin.icon);
        this._pluginIconsSignal.set(new Map(this._pluginIcons));
      }

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

      if (pluginInstance.loaded) {
        // Check if plugin is already in the list to prevent duplicates
        const existingIndex = this._loadedPlugins.findIndex(
          (p) => p.manifest.id === manifest.id,
        );
        if (existingIndex === -1) {
          this._loadedPlugins.push(pluginInstance);
        } else {
          // Replace existing instance
          this._loadedPlugins[existingIndex] = pluginInstance;
        }
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
