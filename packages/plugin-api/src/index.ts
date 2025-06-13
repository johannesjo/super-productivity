// Super Productivity Plugin API Types
// Official TypeScript definitions for developing Super Productivity plugins

export * from './types';

// Re-export commonly used types with cleaner names
export type {
  PluginAPI,
  PluginManifest,
  TaskData,
  ProjectData,
  TagData,
  PluginCreateTaskData,
  PluginBaseCfg,
  DialogCfg,
  DialogButtonCfg,
  SnackCfg,
  SnackCfgLimited,
  NotifyCfg,
  PluginMenuEntryCfg,
  PluginShortcutCfg,
  PluginHeaderBtnCfg,
  PluginHookHandler,
  PluginInstance,
  PluginHookHandlerRegistration,
  TaskCopy,
  ProjectCopy,
  TagCopy,
} from './types';

// Re-export enums as values (not just types) so they can be used
export { PluginHooks, type Hooks } from './types';

// Export app-specific types that extend the plugin-api versions
export type { PluginMenuEntryCfg as PluginMenuEntryCfgApp } from './types';
