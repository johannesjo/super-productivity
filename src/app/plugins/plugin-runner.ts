import { Injectable, inject } from '@angular/core';
import { PluginBaseCfg, PluginInstance, PluginManifest } from './plugin-api.model';
import { PluginAPI } from './plugin-api';
import { PluginMessagingService } from './plugin-messaging.service';

@Injectable({
  providedIn: 'root',
})
export class PluginRunner {
  private _loadedPlugins = new Map<string, PluginInstance>();
  private _messagingService = inject(PluginMessagingService);

  constructor() {}

  async loadPlugin(
    manifest: PluginManifest,
    pluginCode: string,
    baseCfg: PluginBaseCfg,
  ): Promise<PluginInstance> {
    try {
      // Create message handlers for this plugin
      const sendMessage = async (message: any): Promise<any> => {
        return this._messagingService.handleMessage(message, manifest.id);
      };

      const registerCallback = (fn: (...args: any[]) => void | Promise<void>): string => {
        return this._messagingService.registerCallback(manifest.id, fn);
      };

      // Create plugin API instance with messaging
      const pluginAPI = new PluginAPI(
        baseCfg,
        manifest.id,
        sendMessage,
        registerCallback,
      );

      // Create plugin instance
      const pluginInstance: PluginInstance = {
        manifest,
        api: pluginAPI,
        loaded: false,
      };

      // Execute plugin code in a sandboxed environment
      await this._executePluginCode(pluginCode, pluginAPI, manifest);

      pluginInstance.loaded = true;
      this._loadedPlugins.set(manifest.id, pluginInstance);

      console.log(`Plugin ${manifest.id} loaded successfully`);
      return pluginInstance;
    } catch (error) {
      console.error(`Failed to load plugin ${manifest.id}:`, error);
      // Create dummy handlers for error case
      const dummySendMessage = async (): Promise<any> => {
        throw new Error('Plugin failed to load');
      };
      const dummyRegisterCallback = (): string => {
        return 'error';
      };

      const errorInstance: PluginInstance = {
        manifest,
        api: new PluginAPI(baseCfg, manifest.id, dummySendMessage, dummyRegisterCallback),
        loaded: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      this._loadedPlugins.set(manifest.id, errorInstance);
      return errorInstance;
    }
  }

  private async _executePluginCode(
    pluginCode: string,
    pluginAPI: PluginAPI,
    manifest: PluginManifest,
  ): Promise<void> {
    try {
      // Create a sandboxed function execution environment
      // This is a basic implementation - in production, we'd want more security
      const sandboxedFunction = new Function('PluginAPI', 'manifest', pluginCode);

      // Execute the plugin code with the provided API
      await sandboxedFunction(pluginAPI, manifest);
    } catch (error) {
      throw new Error(`Plugin execution failed: ${error}`);
    }
  }

  unloadPlugin(pluginId: string): boolean {
    const plugin = this._loadedPlugins.get(pluginId);
    if (plugin) {
      this._loadedPlugins.delete(pluginId);
      this._messagingService.cleanupPlugin(pluginId);
      console.log(`Plugin ${pluginId} unloaded`);
      return true;
    }
    return false;
  }

  getLoadedPlugin(pluginId: string): PluginInstance | undefined {
    return this._loadedPlugins.get(pluginId);
  }

  getAllLoadedPlugins(): PluginInstance[] {
    return Array.from(this._loadedPlugins.values());
  }

  isPluginLoaded(pluginId: string): boolean {
    const plugin = this._loadedPlugins.get(pluginId);
    return plugin?.loaded ?? false;
  }

  async validateManifest(manifest: any): Promise<boolean> {
    try {
      // Basic validation of required fields
      const required = [
        'name',
        'id',
        'manifestVersion',
        'version',
        'minSupVersion',
        'hooks',
        'permissions',
        'type',
      ];

      for (const field of required) {
        if (!(field in manifest)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate types
      if (typeof manifest.name !== 'string' || manifest.name.trim() === '') {
        throw new Error('Invalid name field');
      }

      if (typeof manifest.id !== 'string' || manifest.id.trim() === '') {
        throw new Error('Invalid id field');
      }

      if (!Array.isArray(manifest.hooks)) {
        throw new Error('hooks must be an array');
      }

      if (!Array.isArray(manifest.permissions)) {
        throw new Error('permissions must be an array');
      }

      if (!['issueProvider', 'standard'].includes(manifest.type)) {
        throw new Error('type must be either "issueProvider" or "standard"');
      }

      return true;
    } catch (error) {
      console.error('Manifest validation failed:', error);
      return false;
    }
  }
}
