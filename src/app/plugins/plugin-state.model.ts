/**
 * Plugin state model for lazy loading implementation
 */

import { PluginInstance, PluginManifest } from './plugin-api.model';

export type PluginLoadStatus = 'not-loaded' | 'loading' | 'loaded' | 'error';

export interface PluginState {
  manifest: PluginManifest;
  status: PluginLoadStatus;
  instance?: PluginInstance;
  error?: string;
  path: string;
  type: 'built-in' | 'uploaded';
  isEnabled: boolean;

  // Cached assets for lazy loading
  code?: string;
  indexHtml?: string;
  icon?: string;
}

export interface PluginLoadResult {
  success: boolean;
  instance?: PluginInstance;
  error?: string;
}
