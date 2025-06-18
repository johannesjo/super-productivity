// Import types from the plugin-api package
import {
  PluginHooks,
  Hooks,
  PluginBaseCfg,
  DialogButtonCfg,
  DialogCfg,
  NotifyCfg,
  PluginManifest,
  PluginHookHandler,
  PluginInstance,
  PluginHookHandlerRegistration,
  PluginCreateTaskData,
  PluginShortcutCfg,
  PluginMenuEntryCfg,
  PluginHeaderBtnCfg,
  PluginNodeScriptRequest,
  PluginNodeScriptResult,
  PluginSidePanelBtnCfg,
} from '@super-productivity/plugin-api';

// Re-export plugin-api types
export {
  PluginHooks,
  Hooks,
  PluginBaseCfg,
  DialogButtonCfg,
  DialogCfg,
  NotifyCfg,
  PluginManifest,
  PluginHookHandler,
  PluginInstance,
  PluginHookHandlerRegistration,
  PluginCreateTaskData,
  PluginShortcutCfg,
  PluginMenuEntryCfg,
  PluginHeaderBtnCfg,
  PluginNodeScriptRequest,
  PluginNodeScriptResult,
  PluginSidePanelBtnCfg,
};

// Import app-specific types
import { SnackParams } from '../core/snack/snack.model';
import { TaskCopy } from '../features/tasks/task.model';
import { ProjectCopy } from '../features/project/project.model';
import { TagCopy } from '../features/tag/tag.model';

// Re-export app-specific types
export { TaskCopy, ProjectCopy, TagCopy };

// App-specific types that differ from the plugin-api package
export type SnackCfgLimited = Omit<
  SnackParams,
  'actionFn' | 'actionStr' | 'actionPayload'
>;
