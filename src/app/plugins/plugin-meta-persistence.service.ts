import { inject, Injectable } from '@angular/core';
import { PfapiService } from '../pfapi/pfapi.service';
import { PluginMetadata, PluginMetaDataState } from './plugin-persistence.model';

/**
 * Service for persisting plugin metadata using pfapi.
 * Handles plugin management information like enabled state.
 */
@Injectable({
  providedIn: 'root',
})
export class PluginMetaPersistenceService {
  private _pfapiService = inject(PfapiService);

  /**
   * Set plugin enabled/disabled status
   */
  async setPluginEnabled(pluginId: string, isEnabled: boolean): Promise<void> {
    const currentState = await this._pfapiService.pf.m.pluginMetadata.load();
    const existingIndex = currentState.findIndex((item) => item.id === pluginId);
    const updatedState: PluginMetaDataState = [...currentState];

    if (existingIndex >= 0) {
      // Update existing entry
      updatedState[existingIndex] = {
        ...updatedState[existingIndex],
        isEnabled,
      };
    } else {
      // Create new entry for this plugin
      updatedState.push({
        id: pluginId,
        isEnabled,
      });
    }

    await this._pfapiService.pf.m.pluginMetadata.save(updatedState, {
      isUpdateRevAndLastUpdate: true,
    });
  }

  /**
   * Check if plugin is enabled
   */
  async isPluginEnabled(pluginId: string): Promise<boolean> {
    const currentState = await this._pfapiService.pf.m.pluginMetadata.load();
    const pluginMetadata = currentState.find((item) => item.id === pluginId);

    // Default to false for all plugins that haven't been explicitly enabled
    // This ensures plugins start disabled and must be manually enabled by the user
    return pluginMetadata?.isEnabled ?? false;
  }

  /**
   * Get all plugin metadata
   */
  async getAllPluginMetadata(): Promise<PluginMetadata[]> {
    return await this._pfapiService.pf.m.pluginMetadata.load();
  }

  /**
   * Get all enabled plugins metadata
   */
  async getEnabledPluginsMetadata(): Promise<PluginMetadata[]> {
    const currentState = await this._pfapiService.pf.m.pluginMetadata.load();
    return currentState.filter((plugin) => plugin.isEnabled === true);
  }

  /**
   * Get all disabled plugins metadata
   */
  async getDisabledPluginsMetadata(): Promise<PluginMetadata[]> {
    const currentState = await this._pfapiService.pf.m.pluginMetadata.load();
    return currentState.filter((plugin) => plugin.isEnabled === false);
  }

  /**
   * Remove plugin metadata
   */
  async removePluginMetadata(pluginId: string): Promise<void> {
    const currentState = await this._pfapiService.pf.m.pluginMetadata.load();
    const updatedState = currentState.filter((item) => item.id !== pluginId);

    await this._pfapiService.pf.m.pluginMetadata.save(updatedState, {
      isUpdateRevAndLastUpdate: true,
    });
  }

  /**
   * Clear all plugin metadata
   */
  async clearAllPluginMetadata(): Promise<void> {
    await this._pfapiService.pf.m.pluginMetadata.save([], {
      isUpdateRevAndLastUpdate: true,
    });
  }

  /**
   * Set Node.js execution consent for a plugin
   */
  async setNodeExecutionConsent(pluginId: string, hasConsent: boolean): Promise<void> {
    const currentState = await this._pfapiService.pf.m.pluginMetadata.load();
    const existingIndex = currentState.findIndex((item) => item.id === pluginId);
    const updatedState: PluginMetaDataState = [...currentState];

    if (existingIndex >= 0) {
      // Update existing entry
      updatedState[existingIndex] = {
        ...updatedState[existingIndex],
        nodeExecutionConsent: hasConsent,
      };
    } else {
      // Create new entry for this plugin
      updatedState.push({
        id: pluginId,
        isEnabled: false, // Default to disabled
        nodeExecutionConsent: hasConsent,
      });
    }

    await this._pfapiService.pf.m.pluginMetadata.save(updatedState, {
      isUpdateRevAndLastUpdate: true,
    });
  }

  /**
   * Get Node.js execution consent for a plugin
   */
  async getNodeExecutionConsent(pluginId: string): Promise<boolean | undefined> {
    const currentState = await this._pfapiService.pf.m.pluginMetadata.load();
    const pluginMetadata = currentState.find((item) => item.id === pluginId);
    return pluginMetadata?.nodeExecutionConsent;
  }
}
