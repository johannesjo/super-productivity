import { inject, Injectable } from '@angular/core';
import { PfapiService } from '../pfapi/pfapi.service';
import { PluginMetadata, PluginMetaDataState } from './plugin-persistence.model';
import { PluginLog } from '../core/log';

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
   * Helper function to check if data update is necessary before writing to pfapi.
   * Compares current state with new state and only writes if different.
   */
  private async _saveIfChanged(
    newState: PluginMetaDataState,
    currentState?: PluginMetaDataState,
  ): Promise<void> {
    // Load current state if not provided
    if (!currentState) {
      currentState = (await this._pfapiService.pf.m.pluginMetadata.load()) || [];
    }

    // Deep compare the states
    if (this._isDataEqual(currentState, newState)) {
      PluginLog.log('PluginMetaPersistenceService: No changes detected, skipping write');
      return;
    }

    // Data is different, proceed with save
    await this._pfapiService.pf.m.pluginMetadata.save(newState, {
      isUpdateRevAndLastUpdate: true,
    });
    PluginLog.log('PluginMetaPersistenceService: Data updated');
  }

  /**
   * Deep compare two plugin metadata states to check if they are equal
   */
  private _isDataEqual(
    state1: PluginMetaDataState,
    state2: PluginMetaDataState,
  ): boolean {
    if (state1.length !== state2.length) {
      return false;
    }

    // Sort both arrays by id for comparison
    const sorted1 = [...state1].sort((a, b) => a.id.localeCompare(b.id));
    const sorted2 = [...state2].sort((a, b) => a.id.localeCompare(b.id));

    return sorted1.every((item1, index) => {
      const item2 = sorted2[index];
      return (
        item1.id === item2.id &&
        item1.isEnabled === item2.isEnabled &&
        item1.nodeExecutionConsent === item2.nodeExecutionConsent
      );
    });
  }

  /**
   * Set plugin enabled/disabled status
   */
  async setPluginEnabled(pluginId: string, isEnabled: boolean): Promise<void> {
    const currentState = (await this._pfapiService.pf.m.pluginMetadata.load()) || [];
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

    await this._saveIfChanged(updatedState, currentState);
  }

  /**
   * Check if plugin is enabled
   */
  async isPluginEnabled(pluginId: string): Promise<boolean> {
    const currentState = (await this._pfapiService.pf.m.pluginMetadata.load()) || [];
    const pluginMetadata = currentState.find((item) => item.id === pluginId);

    // Default to false for all plugins that haven't been explicitly enabled
    // This ensures plugins start disabled and must be manually enabled by the user
    return pluginMetadata?.isEnabled ?? false;
  }

  /**
   * Get all plugin metadata
   */
  async getAllPluginMetadata(): Promise<PluginMetadata[]> {
    return (await this._pfapiService.pf.m.pluginMetadata.load()) || [];
  }

  /**
   * Remove plugin metadata
   */
  async removePluginMetadata(pluginId: string): Promise<void> {
    const currentState = (await this._pfapiService.pf.m.pluginMetadata.load()) || [];
    const updatedState = currentState.filter((item) => item.id !== pluginId);

    await this._saveIfChanged(updatedState, currentState);
  }

  /**
   * Set Node.js execution consent for a plugin
   */
  async setNodeExecutionConsent(pluginId: string, hasConsent: boolean): Promise<void> {
    const currentState = (await this._pfapiService.pf.m.pluginMetadata.load()) || [];
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

    await this._saveIfChanged(updatedState, currentState);
  }

  /**
   * Get Node.js execution consent for a plugin
   */
  async getNodeExecutionConsent(pluginId: string): Promise<boolean | undefined> {
    const currentState = (await this._pfapiService.pf.m.pluginMetadata.load()) || [];
    const pluginMetadata = currentState.find((item) => item.id === pluginId);
    return pluginMetadata?.nodeExecutionConsent;
  }
}
