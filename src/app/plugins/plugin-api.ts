import {
  PluginCreateTaskData,
  DialogCfg,
  Hooks,
  NotifyCfg,
  PluginAPI as IPluginAPI,
  PluginBaseCfg,
  PluginHookHandler,
  PluginHooks,
  PluginMenuEntryCfg,
  PluginShortcutCfg,
  ProjectCopy,
  SnackCfgLimited,
  TagCopy,
  TaskCopy,
  PluginHeaderBtnCfg,
  PluginNodeScriptRequest,
  PluginNodeScriptResult,
  PluginSidePanelBtnCfg,
} from './plugin-api.model';
import { PluginBridgeService } from './plugin-bridge.service';

/**
 * PluginAPI implementation that uses direct bridge service injection
 * This provides a clean intermediary layer between plugins and app services
 */
export class PluginAPI implements IPluginAPI {
  readonly Hooks = PluginHooks;
  private _hookHandlers = new Map<string, Map<Hooks, Array<PluginHookHandler>>>();
  private _headerButtons: Array<PluginHeaderBtnCfg> = [];
  private _menuEntries: Array<PluginMenuEntryCfg> = [];
  private _shortcuts: Array<PluginShortcutCfg> = [];
  private _sidePanelButtons: Array<PluginSidePanelBtnCfg> = [];
  executeNodeScript?: (
    request: PluginNodeScriptRequest,
  ) => Promise<PluginNodeScriptResult>;

  constructor(
    public cfg: PluginBaseCfg,
    private _pluginId: string,
    private _pluginBridge: PluginBridgeService,
  ) {
    // Set the plugin context for secure operations
    this._pluginBridge._setCurrentPlugin(this._pluginId);
  }

  registerHook(hook: Hooks, fn: PluginHookHandler): void {
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

  registerMenuEntry(menuEntryCfg: Omit<PluginMenuEntryCfg, 'pluginId'>): void {
    const fullMenuEntry = { ...menuEntryCfg, pluginId: this._pluginId };
    this._menuEntries.push(fullMenuEntry);
    console.log(`Plugin ${this._pluginId} registered menu entry`, menuEntryCfg);
    this._pluginBridge.registerMenuEntry(menuEntryCfg);
  }

  registerShortcut(
    shortcutCfg: Omit<PluginShortcutCfg, 'pluginId'> & { id?: string },
  ): void {
    // Generate ID if not provided - use sanitized label as fallback
    const id =
      shortcutCfg.id || shortcutCfg.label.toLowerCase().replace(/[^a-z0-9-_]/g, '_');

    const shortcut: PluginShortcutCfg = {
      ...shortcutCfg,
      id,
      pluginId: this._pluginId,
    };

    this._shortcuts.push(shortcut);
    console.log(`Plugin ${this._pluginId} registered shortcut`, shortcutCfg);

    // Register shortcut with bridge
    this._pluginBridge.registerShortcut(shortcut);
  }

  registerSidePanelButton(
    sidePanelBtnCfg: Omit<PluginSidePanelBtnCfg, 'pluginId'>,
  ): void {
    this._sidePanelButtons.push({ ...sidePanelBtnCfg, pluginId: this._pluginId });
    console.log(`Plugin ${this._pluginId} registered side panel button`, sidePanelBtnCfg);
    this._pluginBridge.registerSidePanelButton(sidePanelBtnCfg);
  }

  showIndexHtmlAsView(): void {
    console.log(`Plugin ${this._pluginId} requested to show index.html`);
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

  async addTask(taskData: PluginCreateTaskData): Promise<string> {
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
  __getHookHandlers(): Map<string, Map<Hooks, Array<PluginHookHandler>>> {
    return this._hookHandlers;
  }
}
