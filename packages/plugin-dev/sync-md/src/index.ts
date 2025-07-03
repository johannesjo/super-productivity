// Sync-MD Plugin
// Main entry point for the plugin

export * from './background';
export * from './shared/types';

// Plugin metadata
export const PLUGIN_NAME = 'sync-md';
export const PLUGIN_VERSION = '2.0.0';
export const PLUGIN_DESCRIPTION =
  'Bidirectional synchronization between markdown files and SuperProductivity tasks';
