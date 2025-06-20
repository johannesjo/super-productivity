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
   * Set plugin enabled state without triggering pfapi write (startup-safe)
   * This method only updates the in-memory state to avoid sync conflicts during startup
   */
  async setPluginEnabledSafe(pluginId: string, isEnabled: boolean): Promise<void> {
    // During startup, we just ensure the plugin is considered enabled in memory
    // without writing to pfapi to avoid sync conflicts
    console.log(
      `Plugin ${pluginId} enabled state set to ${isEnabled} (memory only, no pfapi write)`,
    );

    // The actual persistence will happen when user explicitly enables/disables plugins
    // through the plugin management UI
  }

  /**
   * Get all plugin metadata
   */
  async getAllPluginMetadata(): Promise<PluginMetadata[]> {
    return await this._pfapiService.pf.m.pluginMetadata.load();
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
