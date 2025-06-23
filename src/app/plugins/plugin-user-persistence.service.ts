import { inject, Injectable } from '@angular/core';
import { PfapiService } from '../pfapi/pfapi.service';
import { PluginUserData, PluginUserDataState } from './plugin-persistence.model';

/**
 * Service for persisting plugin user data using pfapi.
 * Handles data that plugins store and retrieve via persistDataSynced/loadSyncedData.
 */
@Injectable({
  providedIn: 'root',
})
export class PluginUserPersistenceService {
  private _pfapiService = inject(PfapiService);

  /**
   * Persist user data for a specific plugin (called by plugin via persistDataSynced)
   */
  async persistPluginUserData(pluginId: string, data: string): Promise<void> {
    const currentState = (await this._pfapiService.pf.m.pluginUserData.load()) || [];
    const existingIndex = currentState.findIndex((item) => item.id === pluginId);

    const updatedState: PluginUserDataState = [...currentState];
    const pluginUserData: PluginUserData = {
      id: pluginId,
      data,
    };

    if (existingIndex >= 0) {
      updatedState[existingIndex] = pluginUserData;
    } else {
      updatedState.push(pluginUserData);
    }

    await this._pfapiService.pf.m.pluginUserData.save(updatedState, {
      isUpdateRevAndLastUpdate: true,
    });
  }

  /**
   * Load user data for a specific plugin (called by plugin via loadSyncedData)
   */
  async loadPluginUserData(pluginId: string): Promise<string | null> {
    const currentState = (await this._pfapiService.pf.m.pluginUserData.load()) || [];
    const pluginData = currentState.find((item) => item.id === pluginId);
    return pluginData?.data || null;
  }

  /**
   * Remove user data for a specific plugin
   */
  async removePluginUserData(pluginId: string): Promise<void> {
    const currentState = (await this._pfapiService.pf.m.pluginUserData.load()) || [];
    const updatedState = currentState.filter((item) => item.id !== pluginId);

    await this._pfapiService.pf.m.pluginUserData.save(updatedState, {
      isUpdateRevAndLastUpdate: true,
    });
  }

  /**
   * Get all plugin user data
   */
  async getAllPluginUserData(): Promise<PluginUserData[]> {
    return (await this._pfapiService.pf.m.pluginUserData.load()) || [];
  }

  /**
   * Clear all plugin user data
   */
  async clearAllPluginUserData(): Promise<void> {
    await this._pfapiService.pf.m.pluginUserData.save([], {
      isUpdateRevAndLastUpdate: true,
    });
  }
}
