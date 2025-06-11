import { inject, Injectable } from '@angular/core';
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
import { SnackService } from '../core/snack/snack.service';

@Injectable({
  providedIn: 'root',
})
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

  private _snackService = inject(SnackService);

  constructor(
    public cfg: PluginBaseCfg,
    private pluginId: string,
  ) {}

  registerIssueProvider(provider: IssueProviderPluginCfg): void {
    console.log(`Plugin ${this.pluginId} registered issue provider:`, provider);
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
  }

  registerHeaderButton(label: string, icon: string, onClick: () => void): void {
    this._headerButtons.push({ label, icon, onClick });
    console.log(`Plugin ${this.pluginId} registered header button: ${label}`);
  }

  registerMenuEntry(label: string, icon: string, onClick: () => void): void {
    this._menuEntries.push({ label, icon, onClick });
    console.log(`Plugin ${this.pluginId} registered menu entry: ${label}`);
  }

  registerShortcut(label: string, onExec: () => void): void {
    this._shortcuts.push({ label, onExec });
    console.log(`Plugin ${this.pluginId} registered shortcut: ${label}`);
  }

  showIndexHtml(): void {
    console.log(`Plugin ${this.pluginId} requested to show index.html`);
  }

  async getAllTasks(): Promise<TaskCopy[]> {
    console.log(`Plugin ${this.pluginId} requested all tasks`);
    return [];
  }

  async getArchivedTasks(): Promise<TaskCopy[]> {
    console.log(`Plugin ${this.pluginId} requested archived tasks`);
    return [];
  }

  async getCurrentContextTasks(): Promise<TaskCopy[]> {
    console.log(`Plugin ${this.pluginId} requested current context tasks`);
    return [];
  }

  async updateTask(taskId: string, updates: Partial<TaskCopy>): Promise<void> {
    console.log(`Plugin ${this.pluginId} requested to update task ${taskId}:`, updates);
  }

  showSnack(snackCfg: SnackCfgLimited): void {
    this._snackService.open(snackCfg);
  }

  notify(notifyCfg: NotifyCfg): void {
    console.log(`Plugin ${this.pluginId} requested notification:`, notifyCfg);
  }

  persistDataSynced(dataStr: string): void {
    console.log(`Plugin ${this.pluginId} requested to persist data:`, dataStr);
  }

  async openDialog(dialogCfg: DialogCfg): Promise<void> {
    console.log(`Plugin ${this.pluginId} requested to open dialog:`, dialogCfg);
  }

  addActionBeforeCloseApp(action: () => Promise<void>): void {
    this._actionsBeforeClose.push(action);
    console.log(`Plugin ${this.pluginId} added action before close`);
  }

  async getCfg<T>(): Promise<T> {
    console.log(`Plugin ${this.pluginId} requested configuration`);
    return {} as T;
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
