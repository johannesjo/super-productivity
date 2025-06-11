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
  ProjectCopy,
  TagCopy,
  CreateTaskData,
} from './plugin-api.model';
import { PluginBridgeService } from './plugin-bridge.service';

/**
 * PluginAPI implementation that uses direct bridge service injection
 * This provides a clean intermediary layer between plugins and app services
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
    private _pluginId: string,
    private _pluginBridge: PluginBridgeService,
  ) {}

  registerIssueProvider(provider: IssueProviderPluginCfg): void {
    console.log(`Plugin ${this._pluginId} registered issue provider:`, provider);
    // TODO: Implement issue provider registration in bridge
    console.warn('Issue provider registration not yet implemented in bridge');
  }

  registerHook(hook: Hooks, fn: (...args: any[]) => void | Promise<void>): void {
    if (!this._hookHandlers.has(this._pluginId)) {
      this._hookHandlers.set(this._pluginId, new Map());
    }

    const pluginHooks = this._hookHandlers.get(this._pluginId)!;
    if (!pluginHooks.has(hook)) {
      pluginHooks.set(hook, []);
    }

    pluginHooks.get(hook)!.push(fn);
    console.log(`Plugin ${this._pluginId} registered hook: ${hook}`);

    // Register hook with bridge
    this._pluginBridge.registerHook(this._pluginId, hook, fn);
  }

  registerHeaderButton(label: string, icon: string, onClick: () => void): void {
    this._headerButtons.push({ label, icon, onClick });
    console.log(`Plugin ${this._pluginId} registered header button: ${label}`);
    // TODO: Implement header button registration in bridge
    console.warn('Header button registration not yet implemented in bridge');
  }

  registerMenuEntry(label: string, icon: string, onClick: () => void): void {
    this._menuEntries.push({ label, icon, onClick });
    console.log(`Plugin ${this._pluginId} registered menu entry: ${label}`);
    // TODO: Implement menu entry registration in bridge
    console.warn('Menu entry registration not yet implemented in bridge');
  }

  registerShortcut(label: string, onExec: () => void): void {
    this._shortcuts.push({ label, onExec });
    console.log(`Plugin ${this._pluginId} registered shortcut: ${label}`);
    // TODO: Implement shortcut registration in bridge
    console.warn('Shortcut registration not yet implemented in bridge');
  }

  showIndexHtml(): void {
    console.log(`Plugin ${this._pluginId} requested to show index.html`);
    // TODO: Implement show index html in bridge
    console.warn('Show index html not yet implemented in bridge');
  }

  async getAllTasks(): Promise<TaskCopy[]> {
    console.log(`Plugin ${this._pluginId} requested all tasks`);
    return this._pluginBridge.getAllTasks();
  }

  async getArchivedTasks(): Promise<TaskCopy[]> {
    console.log(`Plugin ${this._pluginId} requested archived tasks`);
    return this._pluginBridge.getArchivedTasks();
  }

  async getCurrentContextTasks(): Promise<TaskCopy[]> {
    console.log(`Plugin ${this._pluginId} requested current context tasks`);
    return this._pluginBridge.getCurrentContextTasks();
  }

  async updateTask(taskId: string, updates: Partial<TaskCopy>): Promise<void> {
    console.log(`Plugin ${this._pluginId} requested to update task ${taskId}:`, updates);
    return this._pluginBridge.updateTask(taskId, updates);
  }

  async addTask(taskData: CreateTaskData): Promise<string> {
    console.log(`Plugin ${this._pluginId} requested to add task:`, taskData);
    return this._pluginBridge.addTask(taskData);
  }

  async getAllProjects(): Promise<ProjectCopy[]> {
    console.log(`Plugin ${this._pluginId} requested all projects`);
    return this._pluginBridge.getAllProjects();
  }

  async addProject(projectData: Partial<ProjectCopy>): Promise<string> {
    console.log(`Plugin ${this._pluginId} requested to add project:`, projectData);
    return this._pluginBridge.addProject(projectData);
  }

  async updateProject(projectId: string, updates: Partial<ProjectCopy>): Promise<void> {
    console.log(
      `Plugin ${this._pluginId} requested to update project ${projectId}:`,
      updates,
    );
    return this._pluginBridge.updateProject(projectId, updates);
  }

  async getAllTags(): Promise<TagCopy[]> {
    console.log(`Plugin ${this._pluginId} requested all tags`);
    return this._pluginBridge.getAllTags();
  }

  async addTag(tagData: Partial<TagCopy>): Promise<string> {
    console.log(`Plugin ${this._pluginId} requested to add tag:`, tagData);
    return this._pluginBridge.addTag(tagData);
  }

  async updateTag(tagId: string, updates: Partial<TagCopy>): Promise<void> {
    console.log(`Plugin ${this._pluginId} requested to update tag ${tagId}:`, updates);
    return this._pluginBridge.updateTag(tagId, updates);
  }

  showSnack(snackCfg: SnackCfgLimited): void {
    this._pluginBridge.showSnack(snackCfg);
  }

  notify(notifyCfg: NotifyCfg): void {
    console.log(`Plugin ${this._pluginId} requested notification:`, notifyCfg);
    this._pluginBridge.notify(notifyCfg);
  }

  persistDataSynced(dataStr: string): void {
    console.log(`Plugin ${this._pluginId} requested to persist data:`, dataStr);
    this._pluginBridge.persistDataSynced(dataStr);
  }

  async openDialog(dialogCfg: DialogCfg): Promise<void> {
    console.log(`Plugin ${this._pluginId} requested to open dialog:`, dialogCfg);
    return this._pluginBridge.openDialog(dialogCfg);
  }

  addActionBeforeCloseApp(action: () => Promise<void>): void {
    this._actionsBeforeClose.push(action);
    console.log(`Plugin ${this._pluginId} added action before close`);
    this._pluginBridge.addActionBeforeCloseApp(action);
  }

  async getCfg<T>(): Promise<T> {
    console.log(`Plugin ${this._pluginId} requested configuration`);
    return this._pluginBridge.getCfg<T>();
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
