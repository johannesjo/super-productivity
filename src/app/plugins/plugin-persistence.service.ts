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

  constructor() {}

  /**
   * Persist plugin data for a specific plugin
   */
  async persistPluginData(pluginId: string, data: string): Promise<void> {
    const currentState = await this._pfapiService.pf.m.pluginData.load();
    const existingIndex = currentState.findIndex((item) => item.id === pluginId);

    const updatedState: PluginDataState = [...currentState];
    const pluginData: DataForPlugin = { id: pluginId, data };

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
   * Clear all plugin data
   */
  async clearAllPluginData(): Promise<void> {
    await this._pfapiService.pf.m.pluginData.save([], {
      isUpdateRevAndLastUpdate: true,
    });
  }

  /**
   * Legacy method for backward compatibility with existing plugin API
   * @deprecated Use persistPluginData instead
   */
  async persistDataSynced(dataStr: string): Promise<void> {
    return this.persistPluginData('legacy', dataStr);
  }

  /**
   * Legacy method for backward compatibility with existing plugin API
   * @deprecated Use loadPluginData instead
   */
  async loadPersistedData(): Promise<string | null> {
    return this.loadPluginData('legacy');
  }
}
