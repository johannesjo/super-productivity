import { SnackParams } from '../core/snack/snack.model';
import { TaskCopy } from '../features/tasks/task.model';
import { ProjectCopy } from '../features/project/project.model';
import { TagCopy } from '../features/tag/tag.model';
import { PluginHeaderBtnCfg } from './ui/plugin-header-btns.component';

export interface PluginMenuEntryCfg {
  pluginId: string;
  label: string;
  icon: string;
  onClick: () => void;
}

export { TaskCopy, ProjectCopy, TagCopy };

export enum PluginHooks {
  TASK_COMPLETE = 'taskComplete',
  TASK_UPDATE = 'taskUpdate',
  TASK_DELETE = 'taskDelete',
  FINISH_DAY = 'finishDay',
  LANGUAGE_CHANGE = 'languageChange',
  PERSISTED_DATA_UPDATE = 'persistedDataUpdate',
  ACTION = 'action',

  // ISSUE_TASK_UPDATE = 'ISSUE_TASK_UPDATE',
  // ISSUE_PROVIDER_SETTINGS_UPDATE = 'ISSUE_PROVIDER_SETTINGS_UPDATE',
}

export type Hooks = PluginHooks;

export interface PluginBaseCfg {
  theme: 'light' | 'dark';
  appVersion: string;
  platform: 'web' | 'desktop' | 'android' | 'ios';
  isDev: boolean;
}

export interface DialogButtonCfg {
  label: string;
  icon?: string;
  onClick: () => void | Promise<void>;
  color?: 'primary' | 'warn';
}

export interface DialogCfg {
  htmlContent?: string;
  buttons?: DialogButtonCfg[];
}

export type SnackCfgLimited = Omit<
  SnackParams,
  'actionFn' | 'actionStr' | 'actionPayload'
>;

export interface NotifyCfg {
  title: string;
  body: string;
}

export interface PluginManifest {
  name: string;
  id: string;
  manifestVersion: number;
  version: string;
  minSupVersion: string;
  description?: string;
  hooks: Hooks[];
  permissions: string[];
  iFrame?: boolean;
  type?: 'standard'; // 'issueProvider'
  assets?: string[];
}

export interface PluginAPI {
  cfg: PluginBaseCfg;

  registerHook(hook: Hooks, fn: (...args: any[]) => void | Promise<void>): void;

  registerHeaderButton(headerBtnCfg: Omit<PluginHeaderBtnCfg, 'pluginId'>): void;

  registerMenuEntry(menuEntryCfg: Omit<PluginMenuEntryCfg, 'pluginId'>): void;

  registerShortcut(label: string, onExec: () => void): void;

  // ui bridge
  showSnack(snackCfg: SnackCfgLimited): void;

  notify(notifyCfg: NotifyCfg): Promise<void>;

  showIndexHtmlAsView(): void;

  openDialog(dialogCfg: DialogCfg): Promise<void>;

  // tasks
  getAllTasks(): Promise<TaskCopy[]>;

  getArchivedTasks(): Promise<TaskCopy[]>;

  getCurrentContextTasks(): Promise<TaskCopy[]>;

  updateTask(taskId: string, updates: Partial<TaskCopy>): Promise<void>;

  addTask(taskData: CreateTaskData): Promise<string>;

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

  __getHookHandlers(): Map<
    string,
    Map<Hooks, Array<(...args: any[]) => void | Promise<void>>>
  >;

  // Potentially later
  // addActionBeforeCloseApp(action: () => Promise<void>): void;
}

export interface PluginInstance {
  manifest: PluginManifest;
  loaded: boolean;
  isEnabled: boolean;
  error?: string;
}

export interface PluginHookHandler {
  pluginId: string;
  hook: Hooks;
  handler: (...args: any[]) => void | Promise<void>;
}

export interface CreateTaskData {
  title: string;
  projectId?: string | null;
  tagIds?: string[];
  notes?: string;
  timeEstimate?: number;
  parentId?: string | null;
}
