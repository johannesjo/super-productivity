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
import { PluginPersistenceService } from './plugin-persistence.service';

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
    private _pluginPersistenceService: PluginPersistenceService,
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
        await this._loadPlugin(pluginPath);
      } catch (error) {
        console.error(`Failed to load plugin from ${pluginPath}:`, error);
        // Continue loading other plugins even if one fails
      }
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

      // Load the plugin
      const baseCfg = this._getBaseCfg();
      const pluginInstance = await this._pluginRunner.loadPlugin(
        manifest,
        pluginCode,
        baseCfg,
      );

      if (pluginInstance.loaded) {
        this._loadedPlugins.push(pluginInstance);
        this._pluginPaths.set(manifest.id, pluginPath); // Store the path

        // Mark plugin as enabled in persistence (with some data)
        await this._pluginPersistenceService.persistPluginData(
          manifest.id,
          JSON.stringify({ loadTime: Date.now() }),
          true,
        );

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
    const allPluginData = await this._pluginPersistenceService.getAllPluginData();

    // Update loaded plugins with persistence state
    for (const plugin of loadedPlugins) {
      const persistedData = allPluginData.find((data) => data.id === plugin.manifest.id);
      plugin.isEnabled = persistedData?.isEnabled ?? true;
    }

    // Add disabled plugins that aren't loaded
    for (const pluginData of allPluginData) {
      const isAlreadyLoaded = loadedPlugins.some((p) => p.manifest.id === pluginData.id);
      if (!isAlreadyLoaded && pluginData.isEnabled === false) {
        // Create minimal PluginInstance for disabled plugins
        loadedPlugins.push({
          manifest: {
            id: pluginData.id,
            name: pluginData.id,
            version: 'unknown',
            manifestVersion: 1,
            minSupVersion: 'unknown',
            hooks: [],
            permissions: [],
            type: 'standard',
          },
          api: null as any,
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
      // Reload the plugin
      const pluginInstance = await this._loadPlugin(pluginPath);
      return pluginInstance.loaded;
    } catch (error) {
      console.error(`Failed to reload plugin ${pluginId}:`, error);
      return false;
    }
  }
}
