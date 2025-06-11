import {
  DialogCfg,
  NotifyCfg,
  SnackCfgLimited,
  TaskCopy,
  IssueProviderPluginCfg,
} from './plugin-api.model';

/**
 * Plugin message types for communication between plugin and main app
 */
export enum PluginMessageType {
  // UI Messages
  SHOW_SNACK = 'showSnack',
  NOTIFY = 'notify',
  OPEN_DIALOG = 'openDialog',

  // Task Management
  GET_ALL_TASKS = 'getAllTasks',
  GET_ARCHIVED_TASKS = 'getArchivedTasks',
  GET_CURRENT_CONTEXT_TASKS = 'getCurrentContextTasks',
  UPDATE_TASK = 'updateTask',

  // Plugin Registration
  REGISTER_HOOK = 'registerHook',
  REGISTER_ISSUE_PROVIDER = 'registerIssueProvider',
  REGISTER_HEADER_BUTTON = 'registerHeaderButton',
  REGISTER_MENU_ENTRY = 'registerMenuEntry',
  REGISTER_SHORTCUT = 'registerShortcut',

  // Data & Configuration
  PERSIST_DATA = 'persistData',
  GET_CONFIG = 'getConfig',
  ADD_ACTION_BEFORE_CLOSE = 'addActionBeforeClose',
  SHOW_INDEX_HTML = 'showIndexHtml',
}

/**
 * Base plugin message interface
 */
export interface PluginMessage {
  id: string; // Unique message ID for response correlation
  type: PluginMessageType;
  payload: any;
}

/**
 * Plugin message response interface
 */
export interface PluginMessageResponse {
  id: string; // Correlates with request message ID
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Specific message payloads for type safety
 */
export interface ShowSnackPayload {
  snackCfg: SnackCfgLimited;
}

export interface NotifyPayload {
  notifyCfg: NotifyCfg;
}

export interface OpenDialogPayload {
  dialogCfg: DialogCfg;
}

export interface UpdateTaskPayload {
  taskId: string;
  updates: Partial<TaskCopy>;
}

export interface RegisterHookPayload {
  hook: string;
  // Note: function cannot be serialized, so we'll use a callback ID system
  callbackId: string;
}

export interface RegisterIssueProviderPayload {
  provider: IssueProviderPluginCfg;
}

export interface RegisterUIElementPayload {
  label: string;
  icon: string;
  callbackId: string; // ID for the onClick callback
}

export interface PersistDataPayload {
  dataStr: string;
}

/**
 * Plugin message handler function type
 */
export type PluginMessageHandler = (
  message: PluginMessage,
) => Promise<PluginMessageResponse>;

/**
 * Plugin callback registry for storing plugin functions
 */
export interface PluginCallback {
  id: string;
  pluginId: string;
  fn: (...args: any[]) => void | Promise<void>;
}
