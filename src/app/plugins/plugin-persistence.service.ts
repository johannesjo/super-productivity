import { inject, Injectable } from '@angular/core';
import { PfapiService } from '../pfapi/pfapi.service';
import { DataForPlugin, PluginDataState } from './plugin-persistence.model';

/**
 * Simple service for persisting plugin data using pfapi
 */
@Injectable({
  providedIn: 'root',
})
export class PluginPersistenceService {
  private _pfapiService = inject(PfapiService);

  /**
   * Persist plugin data for a specific plugin
   */
  async persistPluginData(
    pluginId: string,
    data: string,
    isEnabled?: boolean,
  ): Promise<void> {
    const currentState = await this._pfapiService.pf.m.pluginData.load();
    const existingIndex = currentState.findIndex((item) => item.id === pluginId);

    const updatedState: PluginDataState = [...currentState];
    const pluginData: DataForPlugin = {
      id: pluginId,
      data,
      isEnabled:
        isEnabled !== undefined
          ? isEnabled
          : existingIndex >= 0
            ? currentState[existingIndex].isEnabled
            : true,
    };

    if (existingIndex >= 0) {
      updatedState[existingIndex] = pluginData;
    } else {
      updatedState.push(pluginData);
    }

    await this._pfapiService.pf.m.pluginData.save(updatedState, {
      isUpdateRevAndLastUpdate: true,
    });
  }

  /**
   * Load plugin data for a specific plugin
   */
  async loadPluginData(pluginId: string): Promise<string | null> {
    const currentState = await this._pfapiService.pf.m.pluginData.load();
    const pluginData = currentState.find((item) => item.id === pluginId);
    return pluginData?.data || null;
  }

  /**
   * Remove plugin data for a specific plugin
   */
  async removePluginData(pluginId: string): Promise<void> {
    const currentState = await this._pfapiService.pf.m.pluginData.load();
    const updatedState = currentState.filter((item) => item.id !== pluginId);

    await this._pfapiService.pf.m.pluginData.save(updatedState, {
      isUpdateRevAndLastUpdate: true,
    });
  }

  /**
   * Get all plugin data
   */
  async getAllPluginData(): Promise<DataForPlugin[]> {
    return await this._pfapiService.pf.m.pluginData.load();
  }

  /**
   * Set plugin enabled/disabled status
   */
  async setPluginEnabled(pluginId: string, isEnabled: boolean): Promise<void> {
    const currentState = await this._pfapiService.pf.m.pluginData.load();
    const existingIndex = currentState.findIndex((item) => item.id === pluginId);

    if (existingIndex >= 0) {
      const updatedState: PluginDataState = [...currentState];
      updatedState[existingIndex] = {
        ...updatedState[existingIndex],
        isEnabled,
      };

      await this._pfapiService.pf.m.pluginData.save(updatedState, {
        isUpdateRevAndLastUpdate: true,
      });
    }
  }

  /**
   * Check if plugin is enabled
   */
  async isPluginEnabled(pluginId: string): Promise<boolean> {
    const currentState = await this._pfapiService.pf.m.pluginData.load();
    const pluginData = currentState.find((item) => item.id === pluginId);
    return pluginData?.isEnabled ?? false;
  }

  /**
   * Get all enabled plugins
   */
  async getEnabledPlugins(): Promise<DataForPlugin[]> {
    const currentState = await this._pfapiService.pf.m.pluginData.load();
    return currentState.filter((plugin) => plugin.isEnabled === true);
  }

  /**
   * Get all disabled plugins
   */
  async getDisabledPlugins(): Promise<DataForPlugin[]> {
    const currentState = await this._pfapiService.pf.m.pluginData.load();
    return currentState.filter((plugin) => plugin.isEnabled === false);
  }

  /**
   * Clear all plugin data
   */
  async clearAllPluginData(): Promise<void> {
    await this._pfapiService.pf.m.pluginData.save([], {
      isUpdateRevAndLastUpdate: true,
    });
  }
}
