import { MatSnackBarConfig } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';

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
}

export type Hooks = PluginHooks;

export interface BaseCfg {
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

export interface SnackCfg {
  msg: string;
  type?: 'ERROR' | 'SUCCESS' | 'CUSTOM';
  ico?: string;
  actionFn?: (...args: any[]) => void;
  config?: MatSnackBarConfig;
  isSpinner?: boolean;
  promise?: Promise<unknown>;
  showWhile$?: Observable<unknown>;
}

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
  cfg: BaseCfg;
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
  showSnack(snackCfg: SnackCfg): void;
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
