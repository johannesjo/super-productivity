import { SnackParams } from '../core/snack/snack.model';

export enum PluginHooks {
  TASK_COMPLETE = 'taskComplete',
  TASK_UPDATE = 'taskUpdate',
  TASK_DELETE = 'taskDelete',
  FINISH_DAY = 'finishDay',
  LANGUAGE_CHANGE = 'languageChange',
  CFG_CHANGE = 'cfgChange',
  ISSUE_TASK_UPDATE = 'issueTaskUpdate',
  ISSUE_PROVIDER_SETTINGS_UPDATE = 'issueProviderSettingsUpdate',
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

export interface IssueProviderPluginCfg {
  iconSvg: string;
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
  icon?: string;
}

export interface TaskCopy {
  id: string;
  title: string;
  isDone: boolean;
  timeSpent: number;
  timeEstimate: number;
  created: number;

  [key: string]: any;
}

export interface PluginManifest {
  name: string;
  id: string;
  manifestVersion: number;
  version: string;
  minSupVersion: string;
  hooks: Hooks[];
  permissions: string[];
  iFrame?: boolean;
  type: 'issueProvider' | 'standard';
  assets?: string[];
}

export interface PluginAPI {
  cfg: PluginBaseCfg;
  Hooks: typeof PluginHooks;

  registerIssueProvider(provider: IssueProviderPluginCfg): void;

  registerHook(hook: Hooks, fn: (...args: any[]) => void | Promise<void>): void;

  registerHeaderButton(label: string, icon: string, onClick: () => void): void;

  registerMenuEntry(label: string, icon: string, onClick: () => void): void;

  registerShortcut(label: string, onExec: () => void): void;

  showIndexHtml(): void;

  getAllTasks(): Promise<TaskCopy[]>;

  getArchivedTasks(): Promise<TaskCopy[]>;

  getCurrentContextTasks(): Promise<TaskCopy[]>;

  updateTask(taskId: string, updates: Partial<TaskCopy>): Promise<void>;

  showSnack(snackCfg: SnackCfgLimited): void;

  notify(notifyCfg: NotifyCfg): void;

  persistDataSynced(dataStr: string): void;

  openDialog(dialogCfg: DialogCfg): Promise<void>;

  addActionBeforeCloseApp(action: () => Promise<void>): void;

  getCfg<T>(): Promise<T>;

  __getHookHandlers(): Map<
    string,
    Map<Hooks, Array<(...args: any[]) => void | Promise<void>>>
  >;
}

export interface PluginInstance {
  manifest: PluginManifest;
  api: PluginAPI;
  loaded: boolean;
  error?: string;
}

export interface PluginHookHandler {
  pluginId: string;
  hook: Hooks;
  handler: (...args: any[]) => void | Promise<void>;
}
