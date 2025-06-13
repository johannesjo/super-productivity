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

// Custom PluginAPI interface that uses TaskCopy instead of TaskData
export interface PluginAPI {
  cfg: PluginBaseCfg;

  registerHook(hook: Hooks, fn: PluginHookHandler): void;

  registerHeaderButton(headerBtnCfg: Omit<PluginHeaderBtnCfg, 'pluginId'>): void;

  registerMenuEntry(menuEntryCfg: Omit<PluginMenuEntryCfg, 'pluginId'>): void;

  registerShortcut(
    shortcutCfg: Omit<PluginShortcutCfg, 'pluginId'> & { id?: string },
  ): void;

  // ui bridge
  showSnack(snackCfg: SnackCfgLimited): void;

  notify(notifyCfg: NotifyCfg): Promise<void>;

  showIndexHtmlAsView(): void;

  openDialog(dialogCfg: DialogCfg): Promise<void>;

  // tasks
  getTasks(): Promise<TaskCopy[]>;

  getArchivedTasks(): Promise<TaskCopy[]>;

  getCurrentContextTasks(): Promise<TaskCopy[]>;

  updateTask(taskId: string, updates: Partial<TaskCopy>): Promise<void>;

  addTask(taskData: PluginCreateTaskData): Promise<string>;

  // projects
  getAllProjects(): Promise<ProjectCopy[]>;

  addProject(projectData: Partial<ProjectCopy>): Promise<string>;

  updateProject(projectId: string, updates: Partial<ProjectCopy>): Promise<void>;

  // tags
  getAllTags(): Promise<TagCopy[]>;

  addTag(tagData: Partial<TagCopy>): Promise<string>;

  updateTag(tagId: string, updates: Partial<TagCopy>): Promise<void>;

  // persistence
  persistDataSynced(dataStr: string): Promise<void>;

  loadSyncedData(): Promise<string | null>;

  __getHookHandlers(): Map<string, Map<Hooks, Array<PluginHookHandler>>>;

  // Potentially later
  // addActionBeforeCloseApp(action: () => Promise<void>): void;
}
