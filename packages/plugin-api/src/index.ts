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
  NotifyCfg,
  PluginMenuEntryCfg,
  PluginShortcutCfg,
  PluginHeaderBtnCfg,
} from './types';

// Re-export enums as values (not just types) so they can be used
export { PluginHooks, type Hooks } from './types';
