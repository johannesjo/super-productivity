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
  lang?: {
    code: string;
    [key: string]: any;
  };
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

// Core data types - Single source of truth for both plugins and app
export interface Task {
  id: string;
  title: string;
  notes?: string;
  timeEstimate: number;
  timeSpent: number;
  isDone: boolean;
  projectId: string | null;
  tagIds: string[];
  parentId?: string | null;
  created: number;
  updated?: number;
  subTaskIds: string[];

  // Additional fields for internal use (plugins can read but shouldn't modify)
  timeSpentOnDay?: { [key: string]: number };
  doneOn?: number | null;
  attachments?: any[];
  reminderId?: string | null;
  repeatCfgId?: string | null;

  // Issue tracking fields (optional)
  issueId?: string | null;
  issueProviderId?: string | null;
  issueType?: any | null; // IssueProviderKey in app
  issueWasUpdated?: boolean;
  issueLastUpdated?: number | null;
  issueAttachmentNr?: number;
  issuePoints?: number | null;

  // UI state (internal)
  _hideSubTasksMode?: number;
}

export interface Project {
  id: string;
  title: string;
  theme: {
    primary?: string;
    isAutoContrast?: boolean;
    [key: string]: any;
  };
  isArchived?: boolean;
  created?: number;
  updated?: number;
  taskIds: string[];
  backlogTaskIds: string[];
  noteIds: string[];
  isEnableBacklog?: boolean;
  isHiddenFromMenu?: boolean;

  // Advanced config (internal) - must be any to match WorkContextCommon
  advancedCfg: any;
  icon?: string | null;
}

export interface Tag {
  id: string;
  title: string;
  color?: string | null;
  created: number;
  updated?: number;
  taskIds: string[];
  icon?: string | null;

  // Advanced config (internal) - must be any to match WorkContextCommon
  theme: any;
  advancedCfg: any;
}

// Legacy aliases for backward compatibility
/** @deprecated Use Task instead */
export type TaskData = Task;
/** @deprecated Use Task instead */
export type TaskCopy = Task;

/** @deprecated Use Project instead */
export type ProjectData = Project;
/** @deprecated Use Project instead */
export type ProjectCopy = Project;

/** @deprecated Use Tag instead */
export type TagData = Tag;
/** @deprecated Use Tag instead */
export type TagCopy = Tag;

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
  getTasks(): Promise<Task[]>;

  getArchivedTasks(): Promise<Task[]>;

  getCurrentContextTasks(): Promise<Task[]>;

  updateTask(taskId: string, updates: Partial<Task>): Promise<void>;

  addTask(taskData: PluginCreateTaskData): Promise<string>;

  // projects
  getAllProjects(): Promise<Project[]>;

  addProject(projectData: Partial<Project>): Promise<string>;

  updateProject(projectId: string, updates: Partial<Project>): Promise<void>;

  // tags
  getAllTags(): Promise<Tag[]>;

  addTag(tagData: Partial<Tag>): Promise<string>;

  updateTag(tagId: string, updates: Partial<Tag>): Promise<void>;

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

  // action execution - dispatch NgRx actions (limited to allowed subset)
  dispatchAction(action: any): void;
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
  isDone?: boolean;
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
