import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { PluginUserData } from './plugin-persistence.model';
import { upsertPluginUserData, deletePluginUserData } from './store/plugin.actions';
import { selectPluginUserDataFeatureState } from './store/plugin-user-data.reducer';

/**
 * Service for persisting plugin user data using NgRx actions.
 * Handles data that plugins store and retrieve via persistDataSynced/loadSyncedData.
 */
@Injectable({
  providedIn: 'root',
})
export class PluginUserPersistenceService {
  private _store = inject(Store);

  /**
   * Persist user data for a specific plugin (called by plugin via persistDataSynced)
   */
  persistPluginUserData(pluginId: string, data: string): void {
    const pluginUserData: PluginUserData = {
      id: pluginId,
      data,
    };
    this._store.dispatch(upsertPluginUserData({ pluginUserData }));
  }

  /**
   * Load user data for a specific plugin (called by plugin via loadSyncedData)
   */
  async loadPluginUserData(pluginId: string): Promise<string | null> {
    const currentState = await firstValueFrom(
      this._store.select(selectPluginUserDataFeatureState),
    );
    const pluginData = currentState.find((item) => item.id === pluginId);
    return pluginData?.data || null;
  }

  /**
   * Remove user data for a specific plugin
   */
  removePluginUserData(pluginId: string): void {
    this._store.dispatch(deletePluginUserData({ pluginId }));
  }

  /**
   * Get all plugin user data
   */
  async getAllPluginUserData(): Promise<PluginUserData[]> {
    return firstValueFrom(this._store.select(selectPluginUserDataFeatureState));
  }

  /**
   * Clear all plugin user data (removes each one individually to create operations)
   */
  async clearAllPluginUserData(): Promise<void> {
    const currentState = await firstValueFrom(
      this._store.select(selectPluginUserDataFeatureState),
    );
    for (const item of currentState) {
      this._store.dispatch(deletePluginUserData({ pluginId: item.id }));
    }
  }
}
