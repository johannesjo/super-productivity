import {
  BatchUpdateRequest,
  BatchUpdateResult,
  DialogCfg,
  Hooks,
  NotifyCfg,
  PluginAPI as PluginAPIInterface,
  PluginBaseCfg,
  PluginCreateTaskData,
  PluginHeaderBtnCfg,
  PluginHookHandler,
  PluginHooks,
  PluginManifest,
  PluginMenuEntryCfg,
  PluginNodeScriptRequest,
  PluginNodeScriptResult,
  PluginShortcutCfg,
  PluginSidePanelBtnCfg,
  Project,
  SnackCfg,
  Tag,
  Task,
} from '@super-productivity/plugin-api';
import { PluginBridgeService } from './plugin-bridge.service';
import { PluginLog } from '../core/log';
import {
  projectCopyToProjectData,
  projectDataToPartialProjectCopy,
  tagCopyToTagData,
  tagDataToPartialTagCopy,
  taskCopyToTaskData,
  taskDataToPartialTaskCopy,
} from './plugin-api-mapper';

/**
 * PluginAPI implementation that uses direct bridge service injection
 * This provides a clean intermediary layer between plugins and app services
 */
export class PluginAPI implements PluginAPIInterface {
  readonly Hooks = PluginHooks;
  private _hookHandlers = new Map<string, Map<Hooks, Array<PluginHookHandler<Hooks>>>>();
  private _headerButtons: Array<PluginHeaderBtnCfg> = [];
  private _menuEntries: Array<PluginMenuEntryCfg> = [];
  private _shortcuts: Array<PluginShortcutCfg> = [];
  private _sidePanelButtons: Array<PluginSidePanelBtnCfg> = [];
  private _messageHandler?: (message: unknown) => Promise<unknown>;
  private _boundMethods: ReturnType<
    typeof PluginBridgeService.prototype.createBoundMethods
  >;

  /**
   * Logger instance for this plugin
   */
  readonly log: ReturnType<
    typeof PluginBridgeService.prototype.createBoundMethods
  >['log'];
  executeNodeScript?: (
    request: PluginNodeScriptRequest,
  ) => Promise<PluginNodeScriptResult>;

  constructor(
    public cfg: PluginBaseCfg,
    private _pluginId: string,
    private _pluginBridge: PluginBridgeService,
    private _manifest?: PluginManifest,
  ) {
    // Get bound methods for this plugin
    this._boundMethods = this._pluginBridge.createBoundMethods(
      this._pluginId,
      this._manifest,
    );

    // Set executeNodeScript if available
    if (this._boundMethods.executeNodeScript) {
      this.executeNodeScript = this._boundMethods.executeNodeScript;
    }

    // Set up logging for this plugin
    this.log = this._boundMethods.log;
  }

  registerHook<T extends Hooks>(hook: T, fn: PluginHookHandler<T>): void {
    if (!this._hookHandlers.has(this._pluginId)) {
      this._hookHandlers.set(this._pluginId, new Map());
    }

    const pluginHooks = this._hookHandlers.get(this._pluginId)!;
    if (!pluginHooks.has(hook)) {
      pluginHooks.set(hook, []);
    }

    pluginHooks.get(hook)!.push(fn as PluginHookHandler<Hooks>);
    PluginLog.log(`Plugin ${this._pluginId} registered hook: ${hook}`);

    // Register hook with bridge
    this._pluginBridge.registerHook(this._pluginId, hook, fn as PluginHookHandler<Hooks>);
  }

  registerHeaderButton(headerBtnCfg: PluginHeaderBtnCfg): void {
    this._headerButtons.push({ ...headerBtnCfg, pluginId: this._pluginId });
    PluginLog.log(`Plugin ${this._pluginId} registered header button`, headerBtnCfg);
    this._boundMethods.registerHeaderButton(headerBtnCfg);
  }

  registerMenuEntry(menuEntryCfg: Omit<PluginMenuEntryCfg, 'pluginId'>): void {
    const fullMenuEntry = { ...menuEntryCfg, pluginId: this._pluginId };
    this._menuEntries.push(fullMenuEntry);
    PluginLog.log(`Plugin ${this._pluginId} registered menu entry`, menuEntryCfg);
    this._boundMethods.registerMenuEntry(menuEntryCfg);
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
    PluginLog.log(`Plugin ${this._pluginId} registered shortcut`, shortcutCfg);

    // Register shortcut with bridge
    this._boundMethods.registerShortcut(shortcut);
  }

  registerSidePanelButton(
    sidePanelBtnCfg: Omit<PluginSidePanelBtnCfg, 'pluginId'>,
  ): void {
    this._sidePanelButtons.push({ ...sidePanelBtnCfg, pluginId: this._pluginId });
    PluginLog.log(
      `Plugin ${this._pluginId} registered side panel button`,
      sidePanelBtnCfg,
    );
    this._boundMethods.registerSidePanelButton(sidePanelBtnCfg);
  }

  showIndexHtmlAsView(): void {
    PluginLog.log(`Plugin ${this._pluginId} requested to show index.html`);
    return this._boundMethods.showIndexHtmlAsView();
  }

  async getTasks(): Promise<Task[]> {
    PluginLog.log(`Plugin ${this._pluginId} requested all tasks`);
    const tasks = await this._pluginBridge.getTasks();
    return tasks.map(taskCopyToTaskData);
  }

  async getArchivedTasks(): Promise<Task[]> {
    PluginLog.log(`Plugin ${this._pluginId} requested archived tasks`);
    const tasks = await this._pluginBridge.getArchivedTasks();
    return tasks.map(taskCopyToTaskData);
  }

  async getCurrentContextTasks(): Promise<Task[]> {
    PluginLog.log(`Plugin ${this._pluginId} requested current context tasks`);
    const tasks = await this._pluginBridge.getCurrentContextTasks();
    return tasks.map(taskCopyToTaskData);
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    PluginLog.log(
      `Plugin ${this._pluginId} requested to update task ${taskId}:`,
      updates,
    );
    const taskCopyUpdates = taskDataToPartialTaskCopy(updates);
    return this._pluginBridge.updateTask(taskId, taskCopyUpdates);
  }

  async addTask(taskData: PluginCreateTaskData): Promise<string> {
    PluginLog.log(`Plugin ${this._pluginId} requested to add task:`, taskData);
    return this._pluginBridge.addTask(taskData);
  }

  async deleteTask(taskId: string): Promise<void> {
    PluginLog.log(`Plugin ${this._pluginId} requested to delete task ${taskId}`);
    return this._pluginBridge.deleteTask(taskId);
  }

  async getAllProjects(): Promise<Project[]> {
    PluginLog.log(`Plugin ${this._pluginId} requested all projects`);
    const projects = await this._pluginBridge.getAllProjects();
    return projects.map(projectCopyToProjectData);
  }

  async addProject(projectData: Partial<Project>): Promise<string> {
    PluginLog.log(`Plugin ${this._pluginId} requested to add project:`, projectData);
    const projectCopyData = projectDataToPartialProjectCopy(projectData);
    return this._pluginBridge.addProject(projectCopyData);
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    PluginLog.log(
      `Plugin ${this._pluginId} requested to update project ${projectId}:`,
      updates,
    );
    const projectCopyUpdates = projectDataToPartialProjectCopy(updates);
    return this._pluginBridge.updateProject(projectId, projectCopyUpdates);
  }

  async getAllTags(): Promise<Tag[]> {
    PluginLog.log(`Plugin ${this._pluginId} requested all tags`);
    const tags = await this._pluginBridge.getAllTags();
    return tags.map(tagCopyToTagData);
  }

  async addTag(tagData: Partial<Tag>): Promise<string> {
    PluginLog.log(`Plugin ${this._pluginId} requested to add tag:`, tagData);
    const tagCopyData = tagDataToPartialTagCopy(tagData);
    return this._pluginBridge.addTag(tagCopyData);
  }

  async updateTag(tagId: string, updates: Partial<Tag>): Promise<void> {
    PluginLog.log(`Plugin ${this._pluginId} requested to update tag ${tagId}:`, updates);
    const tagCopyUpdates = tagDataToPartialTagCopy(updates);
    return this._pluginBridge.updateTag(tagId, tagCopyUpdates);
  }

  async reorderTasks(
    taskIds: string[],
    contextId: string,
    contextType: 'project' | 'task',
  ): Promise<void> {
    PluginLog.log(
      `Plugin ${this._pluginId} requested to reorder tasks in ${contextType} ${contextId}:`,
      taskIds,
    );
    return this._pluginBridge.reorderTasks(taskIds, contextId, contextType);
  }

  async batchUpdateForProject(request: BatchUpdateRequest): Promise<BatchUpdateResult> {
    PluginLog.log(
      `Plugin ${this._pluginId} requested batch update for project ${(request as { projectId: string }).projectId}`,
      request,
    );
    return this._pluginBridge.batchUpdateForProject(request);
  }

  showSnack(snackCfg: SnackCfg): void {
    this._pluginBridge.showSnack(snackCfg);
  }

  async notify(notifyCfg: NotifyCfg): Promise<void> {
    PluginLog.log(`Plugin ${this._pluginId} requested notification:`, notifyCfg);
    return this._pluginBridge.notify(notifyCfg);
  }

  persistDataSynced(dataStr: string): Promise<void> {
    PluginLog.log(`Plugin ${this._pluginId} requested to persist data:`, dataStr);
    return this._boundMethods.persistDataSynced(dataStr);
  }

  loadSyncedData(): Promise<string | null> {
    PluginLog.log(`Plugin ${this._pluginId} requested to load persisted data:`);
    return this._boundMethods.loadPersistedData();
  }

  async getConfig<T>(): Promise<T> {
    PluginLog.log(`Plugin ${this._pluginId} requested configuration`);
    return this._boundMethods.getConfig();
  }

  async openDialog(dialogCfg: DialogCfg): Promise<void> {
    PluginLog.log(`Plugin ${this._pluginId} requested to open dialog:`, dialogCfg);
    return this._pluginBridge.openDialog(dialogCfg);
  }

  async triggerSync(): Promise<void> {
    PluginLog.log(`Plugin ${this._pluginId} requested to trigger sync`);
    return this._boundMethods.triggerSync();
  }

  /**
   * Register a message handler for the plugin
   * This allows the plugin's iframe to communicate with the plugin code
   */
  onMessage(handler: (message: unknown) => Promise<unknown>): void {
    this._messageHandler = handler;
    PluginLog.log(`Plugin ${this._pluginId} registered message handler`);
  }

  /**
   * Send a message to the plugin's message handler
   * Used internally by the plugin system
   */
  async __sendMessage(message: unknown): Promise<unknown> {
    if (!this._messageHandler) {
      throw new Error(`Plugin ${this._pluginId} has no message handler registered`);
    }

    return await this._messageHandler(message);
  }

  // Internal methods for the plugin system
  __getHookHandlers(): Map<string, Map<Hooks, Array<PluginHookHandler>>> {
    return this._hookHandlers;
  }

  /**
   * Execute an NgRx action if it's in the allowed list
   */
  dispatchAction(action: { type: string; [key: string]: unknown }): void {
    PluginLog.log(`Plugin ${this._pluginId} requested to execute action:`, action);
    return this._boundMethods.dispatchAction(action);
  }

  /**
   * Check if the application window is currently focused
   */
  isWindowFocused(): boolean {
    return this._pluginBridge.isWindowFocused();
  }

  /**
   * Register a handler for window focus changes
   */
  onWindowFocusChange(handler: (isFocused: boolean) => void): void {
    this._pluginBridge.onWindowFocusChange(this._pluginId, handler);
  }

  /**
   * Clean up all resources associated with this plugin API instance
   * Called when the plugin is being unloaded
   */
  cleanup(): void {
    PluginLog.log(`Cleaning up PluginAPI for plugin ${this._pluginId}`);

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
