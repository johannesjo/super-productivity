import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { take } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PluginRunner } from './plugin-runner';
import { PluginHooksService } from './plugin-hooks';
import { PluginSecurityService } from './plugin-security';
import { BaseCfg, PluginInstance, PluginManifest } from './plugin-api.model';

@Injectable({
  providedIn: 'root',
})
export class PluginService {
  private _isInitialized = false;
  private _loadedPlugins: PluginInstance[] = [];

  constructor(
    private _http: HttpClient,
    private _pluginRunner: PluginRunner,
    private _pluginHooks: PluginHooksService,
    private _pluginSecurity: PluginSecurityService,
  ) {}

  async initializePlugins(): Promise<void> {
    if (this._isInitialized) {
      console.warn('Plugin system already initialized');
      return;
    }

    console.log('Initializing plugin system...');

    try {
      // Get base configuration for plugins
      const baseCfg = this._getBaseCfg();

      // Load plugins from known locations
      await this._loadBuiltInPlugins(baseCfg);

      this._isInitialized = true;
      console.log('Plugin system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize plugin system:', error);
      throw error;
    }
  }

  private async _loadBuiltInPlugins(baseCfg: BaseCfg): Promise<void> {
    // For now, we'll load the example plugin from assets
    const pluginPaths = ['assets/example-plugin'];

    for (const pluginPath of pluginPaths) {
      try {
        await this._loadPlugin(pluginPath, baseCfg);
      } catch (error) {
        console.error(`Failed to load plugin from ${pluginPath}:`, error);
        // Continue loading other plugins even if one fails
      }
    }
  }

  private async _loadPlugin(
    pluginPath: string,
    baseCfg: BaseCfg,
  ): Promise<PluginInstance> {
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
      const pluginInstance = await this._pluginRunner.loadPlugin(
        manifest,
        pluginCode,
        baseCfg,
      );

      if (pluginInstance.loaded) {
        this._loadedPlugins.push(pluginInstance);
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

  private _getBaseCfg(): BaseCfg {
    // Determine platform
    let platform: BaseCfg['platform'] = 'web';
    if (typeof window !== 'undefined') {
      // Check if running in Electron
      if ((window as any).electronAPI) {
        platform = 'desktop';
      }
      // Check if running in Android WebView (basic detection)
      else if (navigator.userAgent.includes('Android')) {
        platform = 'android';
      }
      // Check if running on iOS (basic detection)
      else if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        platform = 'ios';
      }
    }

    return {
      theme: 'light', // TODO: Get from theme service
      appVersion: '13.0.11', // TODO: Get from environment or package.json
      platform,
      isDev: !environment.production,
    };
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
    const baseCfg = this._getBaseCfg();
    const pluginInstance = await this._loadPlugin(pluginPath, baseCfg);

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
      return this._pluginRunner.unloadPlugin(pluginId);
    }
    return false;
  }
}
