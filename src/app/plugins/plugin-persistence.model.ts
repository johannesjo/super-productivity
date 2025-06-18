/**
 * Plugin user data - data that plugins store and retrieve via persistDataSynced/loadSyncedData
 */
export interface PluginUserData {
  id: string;
  data: string;
}

/**
 * Plugin metadata - enabled state and other plugin management info
 */
export interface PluginMetadata {
  id: string;
  isEnabled: boolean;
  nodeExecutionConsent?: boolean;
  // Future metadata can be added here:
  // installDate?: number;
  // lastUsed?: number;
  // version?: string;
}

/**
 * Plugin user data state - array of plugin data entries
 */
export type PluginUserDataState = PluginUserData[];

/**
 * Plugin metadata state - array of plugin metadata entries
 */
export type PluginMetaDataState = PluginMetadata[];

/**
 * Initial states
 */
export const initialPluginUserDataState: PluginUserDataState = [];
export const initialPluginMetaDataState: PluginMetaDataState = [];
