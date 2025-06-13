export interface PluginMenuEntryCfg {
  pluginId: string;
  label: string;
  icon?: string;
  onClick: () => void;
}
export declare enum PluginHooks {
  TASK_COMPLETE = 'taskComplete',
  TASK_UPDATE = 'taskUpdate',
  TASK_DELETE = 'taskDelete',
  FINISH_DAY = 'finishDay',
  LANGUAGE_CHANGE = 'languageChange',
  PERSISTED_DATA_UPDATE = 'persistedDataUpdate',
  ACTION = 'action',
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
export interface SnackCfg {
  msg: string;
  type?: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO';
  ico?: string;
}
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
  isSkipMenuEntry?: boolean;
  type?: 'standard';
  assets?: string[];
  icon?: string;
}
export type PluginHookHandler = (...args: unknown[]) => void | Promise<void>;
export interface TaskData {
  id: string;
  title: string;
  notes?: string;
  timeEstimate?: number;
  timeSpent?: number;
  isDone?: boolean;
  projectId?: string | null;
  tagIds?: string[];
  parentId?: string | null;
  created?: number;
  updated?: number;
}
export interface ProjectData {
  id: string;
  title: string;
  themeColor?: string;
  isDone?: boolean;
  created?: number;
  updated?: number;
}
export interface TagData {
  id: string;
  title: string;
  color?: string;
  created?: number;
  updated?: number;
}
export interface PluginHeaderBtnCfg {
  pluginId: string;
  label: string;
  icon?: string;
  onClick: () => void;
}
export interface PluginAPI {
  cfg: PluginBaseCfg;
  registerHook(hook: Hooks, fn: PluginHookHandler): void;
  registerHeaderButton(headerBtnCfg: Omit<PluginHeaderBtnCfg, 'pluginId'>): void;
  registerMenuEntry(menuEntryCfg: Omit<PluginMenuEntryCfg, 'pluginId'>): void;
  registerShortcut(
    shortcutCfg: Omit<PluginShortcutCfg, 'pluginId'> & {
      id?: string;
    },
  ): void;
  showSnack(snackCfg: SnackCfg): void;
  notify(notifyCfg: NotifyCfg): Promise<void>;
  showIndexHtmlAsView(): void;
  openDialog(dialogCfg: DialogCfg): Promise<void>;
  getTasks(): Promise<TaskData[]>;
  getArchivedTasks(): Promise<TaskData[]>;
  getCurrentContextTasks(): Promise<TaskData[]>;
  updateTask(taskId: string, updates: Partial<TaskData>): Promise<void>;
  addTask(taskData: PluginCreateTaskData): Promise<string>;
  getAllProjects(): Promise<ProjectData[]>;
  addProject(projectData: Partial<ProjectData>): Promise<string>;
  updateProject(projectId: string, updates: Partial<ProjectData>): Promise<void>;
  getAllTags(): Promise<TagData[]>;
  addTag(tagData: Partial<TagData>): Promise<string>;
  updateTag(tagId: string, updates: Partial<TagData>): Promise<void>;
  persistDataSynced(dataStr: string): Promise<void>;
  loadSyncedData(): Promise<string | null>;
}
export interface PluginInstance {
  manifest: PluginManifest;
  loaded: boolean;
  isEnabled: boolean;
  error?: string;
}
export interface PluginHookHandlerRegistration {
  pluginId: string;
  hook: Hooks;
  handler: PluginHookHandler;
}
export interface PluginCreateTaskData {
  title: string;
  projectId?: string | null;
  tagIds?: string[];
  notes?: string;
  timeEstimate?: number;
  parentId?: string | null;
}
export interface PluginShortcutCfg {
  pluginId: string;
  id: string;
  label: string;
  onExec: () => void;
}
declare global {
  interface Window {
    PluginAPI: PluginAPI;
  }
  const PluginAPI: PluginAPI;
}
//# sourceMappingURL=types.d.ts.map
