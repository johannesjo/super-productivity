import {
  CreateTaskData,
  DialogCfg,
  Hooks,
  NotifyCfg,
  PluginAPI as IPluginAPI,
  PluginBaseCfg,
  PluginHooks,
  ProjectCopy,
  SnackCfgLimited,
  TagCopy,
  TaskCopy,
} from './plugin-api.model';
import { PluginBridgeService } from './plugin-bridge.service';
import { PluginHeaderBtnCfg } from './ui/plugin-header-btns.component';
import { PluginMenuEntryCfg } from './plugin-api.model';

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
  private _headerButtons: Array<PluginHeaderBtnCfg> = [];
  private _menuEntries: Array<PluginMenuEntryCfg> = [];
  private _shortcuts: Array<{ label: string; onExec: () => void }> = [];

  constructor(
    public cfg: PluginBaseCfg,
    private _pluginId: string,
    private _pluginBridge: PluginBridgeService,
  ) {
    // Set the plugin context for secure operations
    this._pluginBridge._setCurrentPlugin(this._pluginId);
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

  registerHeaderButton(headerBtnCfg: PluginHeaderBtnCfg): void {
    this._headerButtons.push({ ...headerBtnCfg, pluginId: this._pluginId });
    console.log(`Plugin ${this._pluginId} registered header button`, headerBtnCfg);
    this._pluginBridge.registerHeaderButton(headerBtnCfg);
  }

  registerMenuEntry(menuEntryCfg: PluginMenuEntryCfg): void {
    this._menuEntries.push({ ...menuEntryCfg, pluginId: this._pluginId });
    console.log(`Plugin ${this._pluginId} registered menu entry`, menuEntryCfg);
    this._pluginBridge.registerMenuEntry(menuEntryCfg);
  }

  registerShortcut(label: string, onExec: () => void): void {
    this._shortcuts.push({ label, onExec });
    console.log(`Plugin ${this._pluginId} registered shortcut: ${label}`);
    // TODO: Implement shortcut registration in bridge
    console.warn('Shortcut registration not yet implemented in bridge');
  }

  showIndexHtmlAsView(): void {
    console.log(`Plugin ${this._pluginId} requested to show index.html`);
    // TODO: Implement show index html in bridge
    console.warn('Show index html not yet implemented in bridge');
    return this._pluginBridge.showIndexHtmlAsView();
  }

  async getTasks(): Promise<TaskCopy[]> {
    console.log(`Plugin ${this._pluginId} requested all tasks`);
    return this._pluginBridge.getTasks();
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

  async notify(notifyCfg: NotifyCfg): Promise<void> {
    console.log(`Plugin ${this._pluginId} requested notification:`, notifyCfg);
    return this._pluginBridge.notify(notifyCfg);
  }

  persistDataSynced(dataStr: string): Promise<void> {
    console.log(`Plugin ${this._pluginId} requested to persist data:`, dataStr);
    return this._pluginBridge.persistDataSynced(dataStr);
  }

  loadSyncedData(): Promise<string | null> {
    console.log(`Plugin ${this._pluginId} requested to load persisted data:`);
    return this._pluginBridge.loadPersistedData();
  }

  async openDialog(dialogCfg: DialogCfg): Promise<void> {
    console.log(`Plugin ${this._pluginId} requested to open dialog:`, dialogCfg);
    return this._pluginBridge.openDialog(dialogCfg);
  }

  // Internal methods for the plugin system
  __getHookHandlers(): Map<
    string,
    Map<Hooks, Array<(...args: any[]) => void | Promise<void>>>
  > {
    return this._hookHandlers;
  }
}
