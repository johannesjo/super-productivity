// Types for Super Productivity Plugin API
// This package provides TypeScript types for developing plugins

export interface PluginMenuEntryCfg {
  pluginId: string;
  label: string;
  icon?: string;
  onClick: () => void;
}

export enum PluginHooks {
  TASK_COMPLETE = 'taskComplete',
  TASK_UPDATE = 'taskUpdate',
  TASK_DELETE = 'taskDelete',
  CURRENT_TASK_CHANGE = 'currentTaskChange',
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

export type SnackCfgLimited = SnackCfg;

export interface NotifyCfg {
  title: string;
  body: string;
}

export interface PluginNodeScriptConfig {
  allowedPaths?: string[]; // Specific paths the script can access
  timeout?: number; // Default timeout in milliseconds for scripts
  memoryLimit?: string; // Default memory limit (e.g., '128MB', '256MB')
}

export interface PluginNodeScriptRequest {
  script: string;
  timeout?: number;
  args?: unknown[];
}

export interface PluginNodeScriptError {
  code:
    | 'TIMEOUT'
    | 'MEMORY_LIMIT'
    | 'SCRIPT_ERROR'
    | 'PERMISSION_DENIED'
    | 'INVALID_SCRIPT'
    | 'NO_CONSENT';
  message: string;
  details?: {
    line?: number;
    column?: number;
    scriptSnippet?: string;
  };
}

export interface PluginNodeScriptResult {
  success: boolean;
  result?: unknown;
  error?: string | PluginNodeScriptError;
  executionTime?: number;
  resourceUsage?: {
    peakMemoryMB?: number;
    cpuTime?: number;
  };
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
  icon?: string; // Path to SVG icon file relative to plugin root
  nodeScriptConfig?: PluginNodeScriptConfig;
  sidePanel?: boolean; // If true, plugin loads in right panel instead of route
}

export type PluginHookHandler = (...args: unknown[]) => void | Promise<void>;

// Simplified types for plugin developers (without internal dependencies)
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

export type TaskCopy = TaskData;

export interface ProjectData {
  id: string;
  title: string;
  themeColor?: string;
  isDone?: boolean;
  created?: number;
  updated?: number;
}

export type ProjectCopy = ProjectData;

export interface TagData {
  id: string;
  title: string;
  color?: string;
  created?: number;
  updated?: number;
}

export type TagCopy = TagData;

export interface PluginHeaderBtnCfg {
  pluginId: string;
  label: string;
  icon?: string;
  onClick: () => void;
  color?: 'primary' | 'accent' | 'warn';
}

export interface PluginSidePanelBtnCfg {
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
    shortcutCfg: Omit<PluginShortcutCfg, 'pluginId'> & { id?: string },
  ): void;

  registerSidePanelButton(sidePanelBtnCfg: Omit<PluginSidePanelBtnCfg, 'pluginId'>): void;

  // ui bridge
  showSnack(snackCfg: SnackCfg): void;

  notify(notifyCfg: NotifyCfg): Promise<void>;

  showIndexHtmlAsView(): void;

  openDialog(dialogCfg: DialogCfg): Promise<void>;

  // tasks
  getTasks(): Promise<TaskData[]>;

  getArchivedTasks(): Promise<TaskData[]>;

  getCurrentContextTasks(): Promise<TaskData[]>;

  updateTask(taskId: string, updates: Partial<TaskData>): Promise<void>;

  addTask(taskData: PluginCreateTaskData): Promise<string>;

  // projects
  getAllProjects(): Promise<ProjectData[]>;

  addProject(projectData: Partial<ProjectData>): Promise<string>;

  updateProject(projectId: string, updates: Partial<ProjectData>): Promise<void>;

  // tags
  getAllTags(): Promise<TagData[]>;

  addTag(tagData: Partial<TagData>): Promise<string>;

  updateTag(tagId: string, updates: Partial<TagData>): Promise<void>;

  // task ordering
  reorderTasks(
    taskIds: string[],
    contextId: string,
    contextType: 'project' | 'task',
  ): Promise<void>;

  // persistence
  persistDataSynced(dataStr: string): Promise<void>;

  loadSyncedData(): Promise<string | null>;

  // node execution (only available in Electron with nodeExecution permission)
  executeNodeScript?(request: PluginNodeScriptRequest): Promise<PluginNodeScriptResult>;
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

// Global PluginAPI interface for runtime use
// Note: This is commented out to avoid conflicts with node_modules version
// declare global {
//   interface Window {
//     PluginAPI: PluginAPI;
//   }
//
//   // For plugin development without window reference
//   const PluginAPI: PluginAPI;
// }
