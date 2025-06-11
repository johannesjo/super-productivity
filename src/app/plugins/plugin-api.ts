import {
  DialogCfg,
  Hooks,
  IssueProviderPluginCfg,
  NotifyCfg,
  PluginAPI as IPluginAPI,
  PluginBaseCfg,
  PluginHooks,
  SnackCfgLimited,
  TaskCopy,
} from './plugin-api.model';
import {
  PluginMessage,
  PluginMessageType,
  PluginMessageResponse,
} from './plugin-messaging.model';
import { nanoid } from 'nanoid';

/**
 * PluginAPI implementation that uses messaging instead of dependency injection
 * This allows it to work in sandboxed plugin environments
 */
export class PluginAPI implements IPluginAPI {
  readonly Hooks = PluginHooks;
  private _hookHandlers = new Map<
    string,
    Map<Hooks, Array<(...args: any[]) => void | Promise<void>>>
  >();
  private _headerButtons: Array<{ label: string; icon: string; onClick: () => void }> =
    [];
  private _menuEntries: Array<{ label: string; icon: string; onClick: () => void }> = [];
  private _shortcuts: Array<{ label: string; onExec: () => void }> = [];
  private _actionsBeforeClose: Array<() => Promise<void>> = [];

  constructor(
    public cfg: PluginBaseCfg,
    private pluginId: string,
    private sendMessage: (message: PluginMessage) => Promise<PluginMessageResponse>,
    private registerCallback: (fn: (...args: any[]) => void | Promise<void>) => string,
  ) {}

  /**
   * Helper method to send a message to the main application
   */
  private async _sendMessage(type: PluginMessageType, payload: any = {}): Promise<any> {
    const message: PluginMessage = {
      id: nanoid(),
      type,
      payload,
    };

    const response = await this.sendMessage(message);

    if (!response.success) {
      throw new Error(response.error || 'Plugin message failed');
    }

    return response.data;
  }

  registerIssueProvider(provider: IssueProviderPluginCfg): void {
    console.log(`Plugin ${this.pluginId} registered issue provider:`, provider);
    this._sendMessage(PluginMessageType.REGISTER_ISSUE_PROVIDER, { provider }).catch(
      (error) => {
        console.error('Failed to register issue provider:', error);
      },
    );
  }

  registerHook(hook: Hooks, fn: (...args: any[]) => void | Promise<void>): void {
    if (!this._hookHandlers.has(this.pluginId)) {
      this._hookHandlers.set(this.pluginId, new Map());
    }

    const pluginHooks = this._hookHandlers.get(this.pluginId)!;
    if (!pluginHooks.has(hook)) {
      pluginHooks.set(hook, []);
    }

    pluginHooks.get(hook)!.push(fn);
    console.log(`Plugin ${this.pluginId} registered hook: ${hook}`);

    // Register callback and send message to main app
    const callbackId = this.registerCallback(fn);
    this._sendMessage(PluginMessageType.REGISTER_HOOK, { hook, callbackId }).catch(
      (error) => {
        console.error('Failed to register hook:', error);
      },
    );
  }

  registerHeaderButton(label: string, icon: string, onClick: () => void): void {
    this._headerButtons.push({ label, icon, onClick });
    console.log(`Plugin ${this.pluginId} registered header button: ${label}`);

    const callbackId = this.registerCallback(onClick);
    this._sendMessage(PluginMessageType.REGISTER_HEADER_BUTTON, {
      label,
      icon,
      callbackId,
    }).catch((error) => {
      console.error('Failed to register header button:', error);
    });
  }

  registerMenuEntry(label: string, icon: string, onClick: () => void): void {
    this._menuEntries.push({ label, icon, onClick });
    console.log(`Plugin ${this.pluginId} registered menu entry: ${label}`);

    const callbackId = this.registerCallback(onClick);
    this._sendMessage(PluginMessageType.REGISTER_MENU_ENTRY, {
      label,
      icon,
      callbackId,
    }).catch((error) => {
      console.error('Failed to register menu entry:', error);
    });
  }

  registerShortcut(label: string, onExec: () => void): void {
    this._shortcuts.push({ label, onExec });
    console.log(`Plugin ${this.pluginId} registered shortcut: ${label}`);

    const callbackId = this.registerCallback(onExec);
    this._sendMessage(PluginMessageType.REGISTER_SHORTCUT, { label, callbackId }).catch(
      (error) => {
        console.error('Failed to register shortcut:', error);
      },
    );
  }

  showIndexHtml(): void {
    console.log(`Plugin ${this.pluginId} requested to show index.html`);
    this._sendMessage(PluginMessageType.SHOW_INDEX_HTML).catch((error) => {
      console.error('Failed to show index.html:', error);
    });
  }

  async getAllTasks(): Promise<TaskCopy[]> {
    console.log(`Plugin ${this.pluginId} requested all tasks`);
    return this._sendMessage(PluginMessageType.GET_ALL_TASKS);
  }

  async getArchivedTasks(): Promise<TaskCopy[]> {
    console.log(`Plugin ${this.pluginId} requested archived tasks`);
    return this._sendMessage(PluginMessageType.GET_ARCHIVED_TASKS);
  }

  async getCurrentContextTasks(): Promise<TaskCopy[]> {
    console.log(`Plugin ${this.pluginId} requested current context tasks`);
    return this._sendMessage(PluginMessageType.GET_CURRENT_CONTEXT_TASKS);
  }

  async updateTask(taskId: string, updates: Partial<TaskCopy>): Promise<void> {
    console.log(`Plugin ${this.pluginId} requested to update task ${taskId}:`, updates);
    return this._sendMessage(PluginMessageType.UPDATE_TASK, { taskId, updates });
  }

  showSnack(snackCfg: SnackCfgLimited): void {
    this._sendMessage(PluginMessageType.SHOW_SNACK, { snackCfg }).catch((error) => {
      console.error('Failed to show snack:', error);
    });
  }

  notify(notifyCfg: NotifyCfg): void {
    console.log(`Plugin ${this.pluginId} requested notification:`, notifyCfg);
    this._sendMessage(PluginMessageType.NOTIFY, { notifyCfg }).catch((error) => {
      console.error('Failed to show notification:', error);
    });
  }

  persistDataSynced(dataStr: string): void {
    console.log(`Plugin ${this.pluginId} requested to persist data:`, dataStr);
    this._sendMessage(PluginMessageType.PERSIST_DATA, { dataStr }).catch((error) => {
      console.error('Failed to persist data:', error);
    });
  }

  async openDialog(dialogCfg: DialogCfg): Promise<void> {
    console.log(`Plugin ${this.pluginId} requested to open dialog:`, dialogCfg);
    return this._sendMessage(PluginMessageType.OPEN_DIALOG, { dialogCfg });
  }

  addActionBeforeCloseApp(action: () => Promise<void>): void {
    this._actionsBeforeClose.push(action);
    console.log(`Plugin ${this.pluginId} added action before close`);

    const callbackId = this.registerCallback(action);
    this._sendMessage(PluginMessageType.ADD_ACTION_BEFORE_CLOSE, { callbackId }).catch(
      (error) => {
        console.error('Failed to add action before close:', error);
      },
    );
  }

  async getCfg<T>(): Promise<T> {
    console.log(`Plugin ${this.pluginId} requested configuration`);
    return this._sendMessage(PluginMessageType.GET_CONFIG);
  }

  // Internal methods for the plugin system
  __getHookHandlers(): Map<
    string,
    Map<Hooks, Array<(...args: any[]) => void | Promise<void>>>
  > {
    return this._hookHandlers;
  }

  __getHeaderButtons(): Array<{ label: string; icon: string; onClick: () => void }> {
    return this._headerButtons;
  }

  __getMenuEntries(): Array<{ label: string; icon: string; onClick: () => void }> {
    return this._menuEntries;
  }

  __getShortcuts(): Array<{ label: string; onExec: () => void }> {
    return this._shortcuts;
  }

  __getActionsBeforeClose(): Array<() => Promise<void>> {
    return this._actionsBeforeClose;
  }
}
