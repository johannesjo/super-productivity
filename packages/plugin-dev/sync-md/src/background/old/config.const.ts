/**
 * Configuration constants for the sync-md plugin
 */

// Sync timing configuration
export const SYNC_DEBOUNCE_TIME_FOCUSED = 500; // 0.5 seconds when SP is focused
export const SYNC_DEBOUNCE_TIME_UNFOCUSED = 2000; // 2 seconds when editing markdown
export const MIN_SYNC_INTERVAL = 5000; // 5 seconds minimum between syncs

// Plugin logging prefixes
export const LOG_PREFIX = {
  SYNC: '[Sync]',
  PLUGIN: '[Plugin]',
  BACKGROUND: '[Background]',
  FILE_WATCHER: '[FileWatcher]',
  HOOK: '[Hook]',
  PLUGIN_BUILD: '[Plugin Build]',
} as const;

// Hook names to register
export const REGISTERED_HOOKS = [
  'anyTaskUpdate',
  'projectUpdate',
  'projectListUpdate',
  'workContextUpdate',
] as const;

// Actions to ignore in task updates
export const IGNORED_TASK_ACTIONS = ['timeTracking'] as const;
