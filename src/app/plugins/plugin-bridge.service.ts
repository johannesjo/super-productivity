import { inject, Injectable, Injector, OnDestroy, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { SnackService } from '../core/snack/snack.service';
import { NotifyService } from '../core/notify/notify.service';
import {
  DialogCfg,
  Hooks,
  NotifyCfg,
  PluginCreateTaskData,
  PluginHeaderBtnCfg,
  PluginHookHandler,
  PluginMenuEntryCfg,
  PluginNodeScriptRequest,
  PluginNodeScriptResult,
  PluginShortcutCfg,
  PluginSidePanelBtnCfg,
} from './plugin-api.model';

import {
  BatchTaskCreate,
  BatchUpdateRequest,
  BatchUpdateResult,
  PluginManifest,
  SnackCfg,
} from '@super-productivity/plugin-api';
import { snackCfgToSnackParams } from './plugin-api-mapper';
import { PluginHooksService } from './plugin-hooks';
import { TaskService } from '../features/tasks/task.service';
import { addSubTask } from '../features/tasks/store/task.actions';
import { TaskSharedActions } from '../root-store/meta/task-shared.actions';
import { nanoid } from 'nanoid';
import { WorkContextService } from '../features/work-context/work-context.service';
import { ProjectService } from '../features/project/project.service';
import { TagService } from '../features/tag/tag.service';
import typia from 'typia';
import { first } from 'rxjs/operators';
import { selectTaskByIdWithSubTaskData } from '../features/tasks/store/task.selectors';
import { PluginUserPersistenceService } from './plugin-user-persistence.service';
import { PluginConfigService } from './plugin-config.service';
import { TaskArchiveService } from '../features/time-tracking/task-archive.service';
import { Router } from '@angular/router';
import { PluginDialogComponent } from './ui/plugin-dialog/plugin-dialog.component';
import { IS_ELECTRON } from '../app.constants';
import { isAllowedPluginAction } from './allowed-plugin-actions.const';
import { TranslateService } from '@ngx-translate/core';
import { T } from '../t.const';
import { SyncWrapperService } from '../imex/sync/sync-wrapper.service';
import { Log, PluginLog } from '../core/log';
import { TaskCopy } from '../features/tasks/task.model';
import { ProjectCopy } from '../features/project/project.model';
import { TagCopy } from '../features/tag/tag.model';

/**
 * PluginBridge acts as an intermediary layer between plugins and the main application services.
 * This provides:
 * - Clean separation of concerns
 * - Controlled access to app functionality
 * - Easy testing and mocking
 * - Centralized plugin-to-app communication
 */
@Injectable({
  providedIn: 'root',
})
export class PluginBridgeService implements OnDestroy {
  private _snackService = inject(SnackService);
  private _notifyService = inject(NotifyService);
  private _dialog = inject(MatDialog);
  private _store = inject(Store);
  private _pluginHooksService = inject(PluginHooksService);
  private _taskService = inject(TaskService);
  private _workContextService = inject(WorkContextService);
  private _projectService = inject(ProjectService);
  private _tagService = inject(TagService);
  private _pluginUserPersistenceService = inject(PluginUserPersistenceService);
  private _pluginConfigService = inject(PluginConfigService);
  private _taskArchiveService = inject(TaskArchiveService);
  private _router = inject(Router);
  private _injector = inject(Injector);
  private _translateService = inject(TranslateService);
  private _syncWrapperService = inject(SyncWrapperService);

  // Track header buttons registered by plugins
  private readonly _headerButtons = signal<PluginHeaderBtnCfg[]>([]);
  public readonly headerButtons = this._headerButtons.asReadonly();

  // Track menu entries registered by plugins
  private readonly _menuEntries = signal<PluginMenuEntryCfg[]>([]);
  public readonly menuEntries = this._menuEntries.asReadonly();

  // Track shortcuts registered by plugins
  readonly shortcuts = signal<PluginShortcutCfg[]>([]);

  // Track side panel buttons registered by plugins
  private readonly _sidePanelButtons = signal<PluginSidePanelBtnCfg[]>([]);
  public readonly sidePanelButtons = this._sidePanelButtons.asReadonly();

  constructor() {
    // Initialize window focus tracking
    this._initWindowFocusTracking();
  }

  /**
   * Create bound methods for a specific plugin
   * This ensures each plugin has its own set of methods with the pluginId already bound
   */
  createBoundMethods(
    pluginId: string,
    manifest?: PluginManifest,
  ): {
    persistDataSynced: (dataStr: string) => Promise<void>;
    loadPersistedData: () => Promise<string | null>;
    getConfig: <T>() => Promise<T>;
    registerHeaderButton: (cfg: PluginHeaderBtnCfg) => void;
    registerMenuEntry: (cfg: Omit<PluginMenuEntryCfg, 'pluginId'>) => void;
    registerSidePanelButton: (cfg: Omit<PluginSidePanelBtnCfg, 'pluginId'>) => void;
    registerShortcut: (cfg: PluginShortcutCfg) => void;
    showIndexHtmlAsView: () => void;
    triggerSync: () => Promise<void>;
    dispatchAction: (action: { type: string; [key: string]: unknown }) => void;
    executeNodeScript: (
      request: PluginNodeScriptRequest,
    ) => Promise<PluginNodeScriptResult>;
    log: ReturnType<typeof Log.withContext>;
  } {
    return {
      // Data persistence
      persistDataSynced: (dataStr: string) => this._persistDataSynced(pluginId, dataStr),
      loadPersistedData: () => this._loadPersistedData(pluginId),
      getConfig: () => this._getConfig(pluginId),

      // UI registration
      registerHeaderButton: (cfg: PluginHeaderBtnCfg) =>
        this._registerHeaderButton(pluginId, cfg),
      registerMenuEntry: (cfg: Omit<PluginMenuEntryCfg, 'pluginId'>) =>
        this._registerMenuEntry(pluginId, cfg),
      registerSidePanelButton: (cfg: Omit<PluginSidePanelBtnCfg, 'pluginId'>) =>
        this._registerSidePanelButton(pluginId, cfg),
      registerShortcut: (cfg: PluginShortcutCfg) => this._registerShortcut(pluginId, cfg),

      // Navigation
      showIndexHtmlAsView: () => this._showIndexHtmlAsView(pluginId),

      // Sync
      triggerSync: () => this._triggerSync(pluginId),

      // Actions
      dispatchAction: (action: { type: string; [key: string]: unknown }) =>
        this._dispatchAction(pluginId, action),

      // Node execution
      executeNodeScript: (request: PluginNodeScriptRequest) =>
        this._executeNodeScript(pluginId, manifest || null, request),

      // Logging
      log: Log.withContext(`${pluginId}`),
    };
  }

  /**
   * Show a snack message to the user
   */
  showSnack(snackCfg: SnackCfg): void {
    typia.assert<SnackCfg>(snackCfg);
    const snackParams = snackCfgToSnackParams(snackCfg);
    this._snackService.open(snackParams);
  }

  /**
   * Show a notification to the user
   */
  async notify(notifyCfg: NotifyCfg): Promise<void> {
    typia.assert<NotifyCfg>(notifyCfg);

    // Use the app's NotifyService for better integration
    await this._notifyService.notify({
      title: notifyCfg.title,
      body: notifyCfg.body,
      icon: 'assets/icons/icon-128x128.png',
      duration: 5000, // 5 seconds default duration
    });

    PluginLog.log('PluginBridge: Notification sent successfully', notifyCfg);
  }

  /**
   * Open a dialog using Angular Material
   */
  async openDialog(dialogCfg: DialogCfg): Promise<void> {
    typia.assert<DialogCfg>(dialogCfg);

    return new Promise<void>((resolve, reject) => {
      try {
        const dialogRef = this._dialog.open(PluginDialogComponent, {
          data: dialogCfg,
          // TODO make configurable
          // width: '500px',
          // maxWidth: '90vw',
          // maxHeight: '80vh',
          autoFocus: true,
          restoreFocus: true,
          disableClose: false,
        });

        dialogRef.afterClosed().subscribe((result) => {
          PluginLog.log('PluginBridge: Dialog closed with result:', result);
          resolve();
        });
      } catch (error) {
        PluginLog.err('PluginBridge: Failed to open dialog:', error);
        reject(error);
      }
    });
  }

  /**
   * Internal method to show plugin index.html as view
   */
  private _showIndexHtmlAsView(pluginId: string): void {
    console.log('PluginBridge: Navigating to plugin index view', {
      pluginId,
    });
    // Navigate to the plugin index route
    this._router.navigate(['/plugins', pluginId, 'index']);
  }

  /**
   * Get all tasks
   */
  async getTasks(): Promise<TaskCopy[]> {
    const tasks = await this._taskService.allTasks$.pipe(first()).toPromise();
    return tasks || [];
  }

  /**
   * Get archived tasks
   */
  async getArchivedTasks(): Promise<TaskCopy[]> {
    try {
      const taskArchive = await this._taskArchiveService.load();

      // Convert the archive format to TaskCopy array
      const archivedTasks: TaskCopy[] = taskArchive.ids.map((id) => {
        const task = taskArchive.entities[id];
        if (!task) {
          throw new Error(`Archived task with id ${id} not found in entities`);
        }
        return task as TaskCopy;
      });

      PluginLog.log('PluginBridge: Retrieved archived tasks', {
        count: archivedTasks.length,
      });
      return archivedTasks;
    } catch (error) {
      PluginLog.err('PluginBridge: Failed to load archived tasks:', error);
      return [];
    }
  }

  /**
   * Get current context tasks
   */
  async getCurrentContextTasks(): Promise<TaskCopy[]> {
    const contextTasks = await this._workContextService.todaysTasks$
      .pipe(first())
      .toPromise();
    return contextTasks || [];
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, updates: Partial<TaskCopy>): Promise<void> {
    typia.assert<string>(taskId);
    typia.assert<Partial<TaskCopy>>(updates);

    // Validate that referenced project, tags, and parent task exist if they are being updated
    await this._validateTaskReferences(
      updates.projectId,
      updates.tagIds,
      updates.parentId,
    );

    // Update the task using TaskService (TaskCopy is compatible with Task)
    this._taskService.update(taskId, updates);

    PluginLog.log('PluginBridge: Task updated successfully', { taskId, updates });
  }

  /**
   * Add a new task
   */
  async addTask(taskData: PluginCreateTaskData): Promise<string> {
    typia.assert<PluginCreateTaskData>(taskData);

    // Validate that referenced project, tags, and parent task exist
    await this._validateTaskReferences(
      taskData.projectId,
      taskData.tagIds,
      taskData.parentId,
    );

    // Check if this is a subtask
    if (taskData.parentId) {
      // For subtasks, we need to use the addSubTask action to properly update parent
      const task = this._taskService.createNewTaskWithDefaults({
        title: taskData.title,
        additional: {
          notes: taskData.notes || '',
          timeEstimate: taskData.timeEstimate || 0,
          isDone: (taskData as { isDone?: boolean }).isDone || false,
          tagIds: [], // Subtasks don't have tags
          projectId: taskData.projectId || undefined,
        },
      });

      // Dispatch the addSubTask action which properly updates parent's subTaskIds
      this._store.dispatch(
        addSubTask({
          task,
          parentId: taskData.parentId,
        }),
      );

      PluginLog.log('PluginBridge: Subtask added successfully', {
        taskId: task.id,
        taskData,
      });
      return task.id;
    } else {
      // For main tasks, use the regular add method
      const additional: Partial<TaskCopy> = {
        projectId: taskData.projectId || undefined,
        tagIds: taskData.tagIds || [],
        notes: taskData.notes || '',
        timeEstimate: taskData.timeEstimate || 0,
        isDone: (taskData as { isDone?: boolean }).isDone || false,
      };

      // Add the task using TaskService
      const taskId = this._taskService.add(
        taskData.title,
        false, // isAddToBacklog
        additional,
        false, // isAddToBottom
      );

      PluginLog.log('PluginBridge: Task added successfully', { taskId, taskData });
      return taskId;
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    typia.assert<string>(taskId);

    try {
      // Get the task with its subtasks
      const taskWithSubTasks = await this._store
        .select(selectTaskByIdWithSubTaskData, { id: taskId })
        .pipe(first())
        .toPromise();

      if (!taskWithSubTasks) {
        throw new Error(
          this._translateService.instant(T.PLUGINS.TASK_NOT_FOUND, { taskId }),
        );
      }

      // Use the TaskService remove method which handles deletion properly
      this._taskService.remove(taskWithSubTasks);

      console.log('PluginBridge: Task deleted successfully', {
        taskId,
        hadSubTasks: taskWithSubTasks.subTasks.length > 0,
      });
    } catch (error) {
      console.error('PluginBridge: Failed to delete task:', error);
      throw error;
    }
  }

  /**
   * Get all projects
   */
  async getAllProjects(): Promise<ProjectCopy[]> {
    const projects = await this._projectService.list$.pipe(first()).toPromise();
    return projects || [];
  }

  /**
   * Add a new project
   */
  async addProject(projectData: Partial<ProjectCopy>): Promise<string> {
    typia.assert<Partial<ProjectCopy>>(projectData);

    PluginLog.log('PluginBridge: Project add', { projectData });
    return this._projectService.add(projectData);
  }

  /**
   * Update a project
   */
  async updateProject(projectId: string, updates: Partial<ProjectCopy>): Promise<void> {
    typia.assert<string>(projectId);
    typia.assert<Partial<ProjectCopy>>(updates);

    // Update the project using ProjectService (ProjectCopy is compatible with Project)
    this._projectService.update(projectId, updates);

    PluginLog.log('PluginBridge: Project updated successfully', { projectId, updates });
  }

  /**
   * Get all tags
   */
  async getAllTags(): Promise<TagCopy[]> {
    const tags = await this._tagService.tags$.pipe(first()).toPromise();
    return tags || [];
  }

  /**
   * Add a new tag
   */
  async addTag(tagData: Partial<TagCopy>): Promise<string> {
    typia.assert<Partial<TagCopy>>(tagData);

    // Add the tag using TagService (TagCopy is compatible with Tag)
    const tagId = this._tagService.addTag(tagData);
    PluginLog.log('PluginBridge: Tag added successfully', { tagId, tagData });
    return tagId;
  }

  /**
   * Update a tag
   */
  async updateTag(tagId: string, updates: Partial<TagCopy>): Promise<void> {
    typia.assert<string>(tagId);
    typia.assert<Partial<TagCopy>>(updates);

    // Update the tag using TagService (TagCopy is compatible with Tag)
    this._tagService.updateTag(tagId, updates);
    PluginLog.log('PluginBridge: Tag updated successfully', { tagId, updates });
  }

  /**
   * Reorder tasks in a project or parent task
   * @param taskIds - Array of task IDs in the new order
   * @param contextId - Project ID or parent task ID
   * @param contextType - 'project' or 'task' to indicate if contextId is a project or parent task
   */
  async reorderTasks(
    taskIds: string[],
    contextId: string,
    contextType: 'project' | 'task',
  ): Promise<void> {
    typia.assert<string[]>(taskIds);
    typia.assert<string>(contextId);
    typia.assert<'project' | 'task'>(contextType);

    if (contextType === 'project') {
      // Update project's taskIds to reflect new order
      const project = await this._projectService
        .getByIdOnce$(contextId)
        .pipe(first())
        .toPromise();

      if (!project) {
        throw new Error(
          this._translateService.instant(T.PLUGINS.PROJECT_NOT_FOUND, { contextId }),
        );
      }

      // Validate all taskIds belong to the project
      const allProjectTaskIds = [
        ...(project.taskIds || []),
        ...(project.backlogTaskIds || []),
      ];

      // Also check if tasks actually belong to this project by their projectId
      const allTasks = await this._taskService.allTasks$.pipe(first()).toPromise();
      const tasksInProject =
        allTasks?.filter((t) => t.projectId === contextId && !t.parentId) || [];
      const taskIdsInProject = tasksInProject.map((t) => t.id);

      PluginLog.log('PluginBridge: Validating task reorder', {
        requestedTaskIds: taskIds,
        projectTaskIds: allProjectTaskIds,
        actualTasksInProject: taskIdsInProject,
        projectId: contextId,
      });

      // Use a more lenient validation - check if tasks have the correct projectId
      const invalidTaskIds = taskIds.filter((id) => {
        const task = allTasks?.find((t) => t.id === id);
        return !task || task.projectId !== contextId || task.parentId;
      });

      if (invalidTaskIds.length > 0) {
        throw new Error(
          this._translateService.instant(T.PLUGINS.TASKS_NOT_IN_PROJECT, {
            taskIds: invalidTaskIds.join(', '),
            contextId,
          }),
        );
      }

      // Update the project with new task order
      // Note: This assumes all tasks are in the regular list, not backlog
      this._projectService.update(contextId, { taskIds });

      PluginLog.log('PluginBridge: Project tasks reordered successfully', {
        projectId: contextId,
        newOrder: taskIds,
      });
    } else {
      // Update parent task's subTaskIds to reflect new order
      const parentTask = await this._taskService
        .getByIdOnce$(contextId)
        .pipe(first())
        .toPromise();

      if (!parentTask) {
        throw new Error(
          this._translateService.instant(T.PLUGINS.PARENT_TASK_NOT_FOUND, { contextId }),
        );
      }

      // Validate all taskIds are subtasks of the parent
      const invalidSubTaskIds = taskIds.filter(
        (id) => !parentTask.subTaskIds.includes(id),
      );

      if (invalidSubTaskIds.length > 0) {
        throw new Error(
          this._translateService.instant(T.PLUGINS.TASKS_NOT_SUBTASKS, {
            taskIds: invalidSubTaskIds.join(', '),
            contextId,
          }),
        );
      }

      // Update the task with new subtask order
      this._taskService.update(contextId, { subTaskIds: taskIds });

      PluginLog.log('PluginBridge: Subtasks reordered successfully', {
        parentTaskId: contextId,
        newOrder: taskIds,
      });
    }
  }

  /**
   * Batch update tasks for a project
   * Only generate IDs here - let the reducer handle all validation
   */
  async batchUpdateForProject(request: BatchUpdateRequest): Promise<BatchUpdateResult> {
    typia.assert<BatchUpdateRequest>(request);

    // Generate IDs for all create operations
    // We need to do this here so we can return them to the plugin immediately
    const createdTaskIds: { [tempId: string]: string } = {};
    request.operations.forEach((op) => {
      if (op.type === 'create') {
        const createOp = op as BatchTaskCreate;
        createdTaskIds[createOp.tempId] = nanoid();
      }
    });

    // Dispatch the batch update action - let the reducer handle all validation
    this._store.dispatch(
      TaskSharedActions.batchUpdateForProject({
        projectId: request.projectId,
        operations: request.operations,
        createdTaskIds,
      }),
    );

    // Return the generated IDs immediately
    // The reducer will validate everything including project existence
    return {
      success: true,
      createdTaskIds,
    };
  }

  /**
   * Internal method to persist plugin data
   */
  private async _persistDataSynced(pluginId: string, dataStr: string): Promise<void> {
    typia.assert<string>(dataStr);

    try {
      await this._pluginUserPersistenceService.persistPluginUserData(pluginId, dataStr);
      console.log('PluginBridge: Plugin data persisted successfully', {
        pluginId,
      });
    } catch (error) {
      PluginLog.err('PluginBridge: Failed to persist plugin data:', error);
      throw new Error(this._translateService.instant(T.PLUGINS.UNABLE_TO_PERSIST_DATA));
    }
  }

  /**
   * Internal method to load persisted plugin data
   */
  private async _loadPersistedData(pluginId: string): Promise<string | null> {
    try {
      return await this._pluginUserPersistenceService.loadPluginUserData(pluginId);
    } catch (error) {
      PluginLog.err('PluginBridge: Failed to get persisted plugin data:', error);
      return null;
    }
  }

  /**
   * Internal method to get plugin configuration
   */
  private async _getConfig(pluginId: string): Promise<any> {
    try {
      return await this._pluginConfigService.getPluginConfig(pluginId);
    } catch (error) {
      PluginLog.err('PluginBridge: Failed to get plugin config:', error);
      return null;
    }
  }

  /**
   * Internal method to trigger sync
   */
  private async _triggerSync(pluginId: string): Promise<void> {
    try {
      console.log('PluginBridge: Triggering sync for plugin', pluginId);
      await this._syncWrapperService.sync();
      PluginLog.log('PluginBridge: Sync completed successfully');
    } catch (error) {
      PluginLog.err('PluginBridge: Sync failed:', error);
      throw error;
    }
  }

  /**
   * Register a hook handler for a plugin
   */
  registerHook<T extends Hooks>(
    pluginId: string,
    hook: T,
    handler: PluginHookHandler<T>,
  ): void {
    typia.assert<string>(pluginId);
    typia.assert<Hooks>(hook);
    // Note: Can't assert generic function type with typia

    this._pluginHooksService.registerHookHandler(pluginId, hook, handler);
  }

  /**
   * Unregister all hooks for a plugin
   */
  unregisterPluginHooks(pluginId: string): void {
    typia.assert<string>(pluginId);

    this._pluginHooksService.unregisterPluginHooks(pluginId);
    this._removePluginHeaderButtons(pluginId);
    this._removePluginMenuEntries(pluginId);
    this._removePluginSidePanelButtons(pluginId);
    this.unregisterPluginShortcuts(pluginId);

    // Clean up window focus handler
    this._windowFocusHandlers.delete(pluginId);

    console.log('PluginBridge: All hooks unregistered for plugin', { pluginId });
  }

  /**
   * Internal method to register header button
   */
  private _registerHeaderButton(
    pluginId: string,
    headerBtnCfg: PluginHeaderBtnCfg,
  ): void {
    typia.assert<Omit<PluginHeaderBtnCfg, 'pluginId'>>(headerBtnCfg);

    const newButton: PluginHeaderBtnCfg = {
      ...headerBtnCfg,
      pluginId,
    };

    const currentButtons = this._headerButtons();
    this._headerButtons.set([...currentButtons, newButton]);

    console.log('PluginBridge: Header button registered', {
      pluginId,
      headerBtnCfg,
    });
  }

  /**
   * Internal method to register menu entry
   */
  private _registerMenuEntry(
    pluginId: string,
    menuEntryCfg: Omit<PluginMenuEntryCfg, 'pluginId'>,
  ): void {
    // Validate required fields manually since typia has issues with optional fields
    if (!menuEntryCfg.label || typeof menuEntryCfg.label !== 'string') {
      throw new Error(
        this._translateService.instant(T.PLUGINS.MENU_ENTRY_LABEL_REQUIRED),
      );
    }
    if (!menuEntryCfg.onClick || typeof menuEntryCfg.onClick !== 'function') {
      throw new Error(
        this._translateService.instant(T.PLUGINS.MENU_ENTRY_ONCLICK_REQUIRED),
      );
    }
    if (menuEntryCfg.icon !== undefined && typeof menuEntryCfg.icon !== 'string') {
      throw new Error(this._translateService.instant(T.PLUGINS.MENU_ENTRY_ICON_STRING));
    }

    const newMenuEntry: PluginMenuEntryCfg = {
      ...menuEntryCfg,
      pluginId,
    };

    const currentEntries = this._menuEntries();

    // Check for duplicate entry (same plugin ID and label)
    const isDuplicate = currentEntries.some(
      (entry) => entry.pluginId === pluginId && entry.label === menuEntryCfg.label,
    );

    if (isDuplicate) {
      PluginLog.err(
        'PluginBridge: Duplicate menu entry detected, skipping registration',
        {
          pluginId,
          label: menuEntryCfg.label,
        },
      );
      return;
    }

    this._menuEntries.set([...currentEntries, newMenuEntry]);

    PluginLog.log('PluginBridge: Menu entry registered', {
      pluginId,
      menuEntryCfg,
    });
  }

  /**
   * Remove all header buttons for a specific plugin
   */
  private _removePluginHeaderButtons(pluginId: string): void {
    const currentButtons = this._headerButtons();
    const filteredButtons = currentButtons.filter(
      (button) => button.pluginId !== pluginId,
    );
    this._headerButtons.set(filteredButtons);

    PluginLog.log('PluginBridge: Header buttons removed for plugin', { pluginId });
  }

  /**
   * Remove all menu entries for a specific plugin
   */
  private _removePluginMenuEntries(pluginId: string): void {
    const currentEntries = this._menuEntries();
    const filteredEntries = currentEntries.filter((entry) => entry.pluginId !== pluginId);
    this._menuEntries.set(filteredEntries);

    PluginLog.log('PluginBridge: Menu entries removed for plugin', { pluginId });
  }

  /**
   * Internal method to register side panel button
   */
  private _registerSidePanelButton(
    pluginId: string,
    sidePanelBtnCfg: Omit<PluginSidePanelBtnCfg, 'pluginId'>,
  ): void {
    // Validate required fields
    if (!sidePanelBtnCfg.label || typeof sidePanelBtnCfg.label !== 'string') {
      throw new Error(
        this._translateService.instant(T.PLUGINS.SIDE_PANEL_LABEL_REQUIRED),
      );
    }
    if (!sidePanelBtnCfg.onClick || typeof sidePanelBtnCfg.onClick !== 'function') {
      throw new Error(
        this._translateService.instant(T.PLUGINS.SIDE_PANEL_ONCLICK_REQUIRED),
      );
    }

    const newButton: PluginSidePanelBtnCfg = {
      ...sidePanelBtnCfg,
      pluginId,
    };

    const currentButtons = this._sidePanelButtons();

    // Check for duplicate button (same plugin ID)
    const isDuplicate = currentButtons.some((button) => button.pluginId === pluginId);

    if (isDuplicate) {
      PluginLog.err(
        'PluginBridge: Duplicate side panel button detected, skipping registration',
        {
          pluginId,
          label: sidePanelBtnCfg.label,
        },
      );
      return;
    }

    this._sidePanelButtons.set([...currentButtons, newButton]);

    PluginLog.log('PluginBridge: Side panel button registered', {
      pluginId,
      sidePanelBtnCfg,
    });
  }

  /**
   * Remove all side panel buttons for a specific plugin
   */
  private _removePluginSidePanelButtons(pluginId: string): void {
    const currentButtons = this._sidePanelButtons();
    const filteredButtons = currentButtons.filter(
      (button) => button.pluginId !== pluginId,
    );
    this._sidePanelButtons.set(filteredButtons);

    PluginLog.log('PluginBridge: Side panel buttons removed for plugin', { pluginId });
  }

  /**
   * Internal method to register shortcut
   */
  private _registerShortcut(pluginId: string, shortcutCfg: PluginShortcutCfg): void {
    const shortcutWithPluginId: PluginShortcutCfg = {
      ...shortcutCfg,
      pluginId,
    };

    const currentShortcuts = this.shortcuts();
    this.shortcuts.set([...currentShortcuts, shortcutWithPluginId]);

    PluginLog.log('PluginBridge: Shortcut registered', {
      pluginId,
      shortcut: shortcutWithPluginId,
    });
  }

  /**
   * Execute a shortcut by its ID (pluginId:id)
   */
  async executeShortcut(shortcutId: string): Promise<boolean> {
    const shortcuts = this.shortcuts();
    const shortcut = shortcuts.find((s) => `${s.pluginId}:${s.id}` === shortcutId);

    if (shortcut) {
      try {
        await Promise.resolve(shortcut.onExec());
        PluginLog.log(
          `Executed shortcut "${shortcut.label}" from plugin ${shortcut.pluginId}`,
        );
        return true;
      } catch (error) {
        PluginLog.err(`Failed to execute shortcut "${shortcut.label}":`, error);
        return false;
      }
    }

    return false;
  }

  /**
   * Unregister all shortcuts for a specific plugin
   */
  unregisterPluginShortcuts(pluginId: string): void {
    const currentShortcuts = this.shortcuts();
    const filteredShortcuts = currentShortcuts.filter(
      (shortcut) => shortcut.pluginId !== pluginId,
    );

    if (filteredShortcuts.length !== currentShortcuts.length) {
      this.shortcuts.set(filteredShortcuts);
      PluginLog.log(
        `Unregistered ${currentShortcuts.length - filteredShortcuts.length} shortcuts for plugin ${pluginId}`,
      );
    }
  }

  /**
   * Validate that referenced project, tags, and parent task exist
   */
  private async _validateTaskReferences(
    projectId?: string | null,
    tagIds?: string[],
    parentId?: string | null,
  ): Promise<void> {
    const errors: string[] = [];

    // Validate project exists if provided
    if (projectId) {
      const projects = await this._projectService.list$.pipe(first()).toPromise();

      const projectExists = projects?.some((project) => project.id === projectId);
      if (!projectExists) {
        errors.push(
          this._translateService.instant(T.PLUGINS.PROJECT_DOES_NOT_EXIST, { projectId }),
        );
      }
    }

    // Validate tags exist if provided
    if (tagIds && tagIds.length > 0) {
      const tags = await this._tagService.tags$.pipe(first()).toPromise();

      const existingTagIds = tags?.map((tag) => tag.id) || [];
      const nonExistentTags = tagIds.filter((tagId) => !existingTagIds.includes(tagId));

      if (nonExistentTags.length > 0) {
        errors.push(
          this._translateService.instant(T.PLUGINS.TAGS_DO_NOT_EXIST, {
            tagIds: nonExistentTags.join(', '),
          }),
        );
      }
    }

    // Validate parent task exists if provided
    if (parentId) {
      const tasks = await this._taskService.allTasks$.pipe(first()).toPromise();

      const parentExists = tasks?.some((task) => task.id === parentId);
      if (!parentExists) {
        errors.push(
          this._translateService.instant(T.PLUGINS.PARENT_TASK_DOES_NOT_EXIST, {
            parentId,
          }),
        );
      }
    }

    // Throw error if any validation failed
    if (errors.length > 0) {
      throw new Error(
        this._translateService.instant(T.PLUGINS.VALIDATION_FAILED, {
          errors: errors.join('; '),
        }),
      );
    }
  }

  /**
   * Internal method to dispatch action
   */
  private _dispatchAction(
    pluginId: string,
    action: { type: string; [key: string]: unknown },
  ): void {
    // Check if the action is in the allowed list
    if (!isAllowedPluginAction(action)) {
      PluginLog.err(
        `PluginBridge: Action type '${action.type}' is not allowed for plugins`,
      );
      throw new Error(
        this._translateService.instant(T.PLUGINS.ACTION_TYPE_NOT_ALLOWED, {
          actionType: action.type,
        }),
      );
    }

    // Dispatch the action
    this._store.dispatch(action);
    PluginLog.log(`PluginBridge: Dispatched action for plugin ${pluginId}`, {
      actionType: action.type,
      payload: action,
    });
  }

  /**
   * Internal method to execute Node.js script
   */
  private async _executeNodeScript(
    pluginId: string,
    manifest: PluginManifest | null,
    request: PluginNodeScriptRequest,
  ): Promise<PluginNodeScriptResult> {
    if (!IS_ELECTRON) {
      return {
        success: false,
        error: this._translateService.instant(T.PLUGINS.NODE_ONLY_DESKTOP),
      };
    }

    try {
      typia.assert<PluginNodeScriptRequest>(request);

      if (!manifest) {
        return {
          success: false,
          error: this._translateService.instant(T.PLUGINS.NO_PLUGIN_MANIFEST_NODE),
        };
      }

      // Check if Electron API is available
      if (!window.ea || typeof window.ea.pluginExecNodeScript !== 'function') {
        return {
          success: false,
          error: this._translateService.instant(T.PLUGINS.ELECTRON_API_NOT_AVAILABLE),
        };
      }

      // Call Electron main process via IPC
      const result = await window.ea.pluginExecNodeScript(pluginId, manifest, request);

      return result;
    } catch (error) {
      PluginLog.err('PluginBridge: Failed to execute Node.js script:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : this._translateService.instant(T.PLUGINS.FAILED_TO_EXECUTE_SCRIPT),
      };
    }
  }

  /**
   * Send a message to a plugin's message handler
   */
  async sendMessageToPlugin(pluginId: string, message: unknown): Promise<unknown> {
    // Import and get the plugin runner service
    // Using dynamic import to avoid circular dependency at compile time
    const { PluginRunner } = await import('./plugin-runner');
    const pluginRunner = this._injector.get(PluginRunner);
    return pluginRunner.sendMessageToPlugin(pluginId, message);
  }

  /**
   * Track window focus state
   */
  private _isWindowFocused = true;
  private _windowFocusHandlers = new Map<string, (isFocused: boolean) => void>();

  /**
   * Initialize window focus tracking
   */
  private _initWindowFocusTracking(): void {
    // Track window focus/blur events
    window.addEventListener('focus', () => {
      this._isWindowFocused = true;
      this._notifyFocusHandlers(true);
    });

    window.addEventListener('blur', () => {
      this._isWindowFocused = false;
      this._notifyFocusHandlers(false);
    });

    // Also track document visibility changes
    document.addEventListener('visibilitychange', () => {
      const isFocused = !document.hidden;
      this._isWindowFocused = isFocused;
      this._notifyFocusHandlers(isFocused);
    });
  }

  /**
   * Notify all registered focus handlers
   */
  private _notifyFocusHandlers(isFocused: boolean): void {
    this._windowFocusHandlers.forEach((handler) => {
      try {
        handler(isFocused);
      } catch (error) {
        console.error('Error in window focus handler:', error);
      }
    });
  }

  /**
   * Check if the window is currently focused
   */
  isWindowFocused(): boolean {
    return this._isWindowFocused;
  }

  /**
   * Register a handler for window focus changes
   */
  onWindowFocusChange(pluginId: string, handler: (isFocused: boolean) => void): void {
    this._windowFocusHandlers.set(pluginId, handler);

    // Immediately notify the handler of the current state
    handler(this._isWindowFocused);
  }

  /**
   * Clean up all resources when service is destroyed
   */
  ngOnDestroy(): void {
    PluginLog.log('PluginBridgeService: Cleaning up resources');
    // Note: Signals don't need explicit cleanup like BehaviorSubjects
    PluginLog.log('PluginBridgeService: Cleanup complete');
  }
}
