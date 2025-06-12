export interface DataForPlugin {
  id: string;
  data: string;
}

/**
 * Simple plugin data state - just an array of plugin data entries
 */
export type PluginDataState = DataForPlugin[];

/**
 * Initial state for plugin data
 */
export const initialPluginDataState: PluginDataState = [];
