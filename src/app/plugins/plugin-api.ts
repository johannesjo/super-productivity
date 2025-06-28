import {
  PluginCreateTaskData,
  DialogCfg,
  Hooks,
  NotifyCfg,
  PluginBaseCfg,
  PluginHookHandler,
  PluginHooks,
  PluginMenuEntryCfg,
  PluginShortcutCfg,
  PluginHeaderBtnCfg,
  PluginNodeScriptRequest,
  PluginNodeScriptResult,
  PluginSidePanelBtnCfg,
  Task,
  Project,
  Tag,
  SnackCfg,
  PluginAPI as PluginAPIInterface,
  PluginManifest,
} from '@super-productivity/plugin-api';
import { PluginBridgeService } from './plugin-bridge.service';
import {
  taskCopyToTaskData,
  projectCopyToProjectData,
  tagCopyToTagData,
  taskDataToPartialTaskCopy,
  projectDataToPartialProjectCopy,
  tagDataToPartialTagCopy,
} from './plugin-api-mapper';

/**
 * PluginAPI implementation that uses direct bridge service injection
 * This provides a clean intermediary layer between plugins and app services
 */
export class PluginAPI implements PluginAPIInterface {
  readonly Hooks = PluginHooks;
  private _hookHandlers = new Map<string, Map<Hooks, Array<PluginHookHandler>>>();
  private _headerButtons: Array<PluginHeaderBtnCfg> = [];
  private _menuEntries: Array<PluginMenuEntryCfg> = [];
  private _shortcuts: Array<PluginShortcutCfg> = [];
  private _sidePanelButtons: Array<PluginSidePanelBtnCfg> = [];
  private _messageHandler?: (message: any) => Promise<any>;
  executeNodeScript?: (
    request: PluginNodeScriptRequest,
  ) => Promise<PluginNodeScriptResult>;

  constructor(
    public cfg: PluginBaseCfg,
    private _pluginId: string,
    private _pluginBridge: PluginBridgeService,
    private _manifest?: PluginManifest,
  ) {
    // Set the plugin context for secure operations
    this._pluginBridge._setCurrentPlugin(this._pluginId, this._manifest);
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
    return this._pluginBridge.showIndexHtmlAsView(this._pluginId);
  }

  async getTasks(): Promise<Task[]> {
    console.log(`Plugin ${this._pluginId} requested all tasks`);
    const tasks = await this._pluginBridge.getTasks();
    return tasks.map(taskCopyToTaskData);
  }

  async getArchivedTasks(): Promise<Task[]> {
    console.log(`Plugin ${this._pluginId} requested archived tasks`);
    const tasks = await this._pluginBridge.getArchivedTasks();
    return tasks.map(taskCopyToTaskData);
  }

  async getCurrentContextTasks(): Promise<Task[]> {
    console.log(`Plugin ${this._pluginId} requested current context tasks`);
    const tasks = await this._pluginBridge.getCurrentContextTasks();
    return tasks.map(taskCopyToTaskData);
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    console.log(`Plugin ${this._pluginId} requested to update task ${taskId}:`, updates);
    const taskCopyUpdates = taskDataToPartialTaskCopy(updates);
    return this._pluginBridge.updateTask(taskId, taskCopyUpdates);
  }

  async addTask(taskData: PluginCreateTaskData): Promise<string> {
    console.log(`Plugin ${this._pluginId} requested to add task:`, taskData);
    return this._pluginBridge.addTask(taskData);
  }

  async getAllProjects(): Promise<Project[]> {
    console.log(`Plugin ${this._pluginId} requested all projects`);
    const projects = await this._pluginBridge.getAllProjects();
    return projects.map(projectCopyToProjectData);
  }

  async addProject(projectData: Partial<Project>): Promise<string> {
    console.log(`Plugin ${this._pluginId} requested to add project:`, projectData);
    const projectCopyData = projectDataToPartialProjectCopy(projectData);
    return this._pluginBridge.addProject(projectCopyData);
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    console.log(
      `Plugin ${this._pluginId} requested to update project ${projectId}:`,
      updates,
    );
    const projectCopyUpdates = projectDataToPartialProjectCopy(updates);
    return this._pluginBridge.updateProject(projectId, projectCopyUpdates);
  }

  async getAllTags(): Promise<Tag[]> {
    console.log(`Plugin ${this._pluginId} requested all tags`);
    const tags = await this._pluginBridge.getAllTags();
    return tags.map(tagCopyToTagData);
  }

  async addTag(tagData: Partial<Tag>): Promise<string> {
    console.log(`Plugin ${this._pluginId} requested to add tag:`, tagData);
    const tagCopyData = tagDataToPartialTagCopy(tagData);
    return this._pluginBridge.addTag(tagCopyData);
  }

  async updateTag(tagId: string, updates: Partial<Tag>): Promise<void> {
    console.log(`Plugin ${this._pluginId} requested to update tag ${tagId}:`, updates);
    const tagCopyUpdates = tagDataToPartialTagCopy(updates);
    return this._pluginBridge.updateTag(tagId, tagCopyUpdates);
  }

  async reorderTasks(
    taskIds: string[],
    contextId: string,
    contextType: 'project' | 'task',
  ): Promise<void> {
    console.log(
      `Plugin ${this._pluginId} requested to reorder tasks in ${contextType} ${contextId}:`,
      taskIds,
    );
    return this._pluginBridge.reorderTasks(taskIds, contextId, contextType);
  }

  showSnack(snackCfg: SnackCfg): void {
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

  async triggerSync(): Promise<void> {
    console.log(`Plugin ${this._pluginId} requested to trigger sync`);
    return this._pluginBridge.triggerSync();
  }

  /**
   * Register a message handler for the plugin
   * This allows the plugin's iframe to communicate with the plugin code
   */
  onMessage(handler: (message: any) => Promise<any>): void {
    this._messageHandler = handler;
    console.log(`Plugin ${this._pluginId} registered message handler`);
  }

  /**
   * Send a message to the plugin's message handler
   * Used internally by the plugin system
   */
  async __sendMessage(message: any): Promise<any> {
    if (!this._messageHandler) {
      throw new Error(`Plugin ${this._pluginId} has no message handler registered`);
    }

    // Set plugin context before handling message
    this._pluginBridge._setCurrentPlugin(this._pluginId, this._manifest);

    try {
      return await this._messageHandler(message);
    } finally {
      // Clear context after handling
      this._pluginBridge._setCurrentPlugin('', undefined);
    }
  }

  // Internal methods for the plugin system
  __getHookHandlers(): Map<string, Map<Hooks, Array<PluginHookHandler>>> {
    return this._hookHandlers;
  }

  /**
   * Execute an NgRx action if it's in the allowed list
   */
  dispatchAction(action: any): void {
    console.log(`Plugin ${this._pluginId} requested to execute action:`, action);
    return this._pluginBridge.dispatchAction(action);
  }

  /**
   * Clean up all resources associated with this plugin API instance
   * Called when the plugin is being unloaded
   */
  cleanup(): void {
    console.log(`Cleaning up PluginAPI for plugin ${this._pluginId}`);

    // Clear all hook handlers
    this._hookHandlers.clear();

    // Clear all UI registrations
    this._headerButtons.length = 0;
    this._menuEntries.length = 0;
    this._shortcuts.length = 0;
    this._sidePanelButtons.length = 0;

    // Notify bridge service to clean up its registrations
    // This is handled by the plugin runner calling unregisterPluginHooks
  }
}
