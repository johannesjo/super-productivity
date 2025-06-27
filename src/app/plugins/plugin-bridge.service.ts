import { inject, Injectable, OnDestroy, Injector } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { SnackService } from '../core/snack/snack.service';
import { NotifyService } from '../core/notify/notify.service';
import {
  DialogCfg,
  Hooks,
  NotifyCfg,
  PluginCreateTaskData,
  PluginHookHandler,
  PluginMenuEntryCfg,
  PluginShortcutCfg,
  PluginHeaderBtnCfg,
  PluginSidePanelBtnCfg,
  PluginNodeScriptRequest,
  PluginNodeScriptResult,
} from './plugin-api.model';
import { Task as TaskCopy } from '../features/tasks/task.model';
import { Project as ProjectCopy } from '../features/project/project.model';
import { Tag as TagCopy } from '../features/tag/tag.model';
import { SnackCfg, PluginManifest } from '@super-productivity/plugin-api';
import { snackCfgToSnackParams } from './plugin-api-mapper';
import { PluginHooksService } from './plugin-hooks';
import { TaskService } from '../features/tasks/task.service';
import { addSubTask } from '../features/tasks/store/task.actions';
import { WorkContextService } from '../features/work-context/work-context.service';
import { ProjectService } from '../features/project/project.service';
import { TagService } from '../features/tag/tag.service';
import typia from 'typia';
import { first } from 'rxjs/operators';
import { PluginUserPersistenceService } from './plugin-user-persistence.service';
import { TaskArchiveService } from '../features/time-tracking/task-archive.service';
import { Router } from '@angular/router';
import { PluginDialogComponent } from './ui/plugin-dialog/plugin-dialog.component';
import { IS_ELECTRON } from '../app.constants';
import { isAllowedPluginAction } from './allowed-plugin-actions.const';
import { TranslateService } from '@ngx-translate/core';
import { T } from '../t.const';
import { SyncWrapperService } from '../imex/sync/sync-wrapper.service';

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
  private _taskArchiveService = inject(TaskArchiveService);
  private _router = inject(Router);
  private _injector = inject(Injector);
  private _translateService = inject(TranslateService);
  private _syncWrapperService = inject(SyncWrapperService);
  private _pluginRunner?: any; // Lazy loaded to avoid circular dependency

  // Track which plugin is currently making calls to prevent cross-plugin access
  private _currentPluginId: string | null = null;
  private _currentPluginManifest: PluginManifest | null = null;

  // Track header buttons registered by plugins
  private _headerButtons$ = new BehaviorSubject<PluginHeaderBtnCfg[]>([]);
  public readonly headerButtons$ = this._headerButtons$.asObservable();

  // Track menu entries registered by plugins
  private _menuEntries$ = new BehaviorSubject<PluginMenuEntryCfg[]>([]);
  public readonly menuEntries$ = this._menuEntries$.asObservable();

  // Track shortcuts registered by plugins
  shortcuts$ = new BehaviorSubject<PluginShortcutCfg[]>([]);

  // Track side panel buttons registered by plugins
  private _sidePanelButtons$ = new BehaviorSubject<PluginSidePanelBtnCfg[]>([]);
  public readonly sidePanelButtons$ = this._sidePanelButtons$.asObservable();

  /**
   * Set the current plugin context for secure operations
   */
  _setCurrentPlugin(pluginId: string, manifest?: PluginManifest): void {
    this._currentPluginId = pluginId;
    this._currentPluginManifest = manifest || null;
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

    console.log('PluginBridge: Notification sent successfully', notifyCfg);
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
          console.log('PluginBridge: Dialog closed with result:', result);
          resolve();
        });
      } catch (error) {
        console.error('PluginBridge: Failed to open dialog:', error);
        reject(error);
      }
    });
  }

  /**
   * Show the plugin's index.html as a view by navigating to the plugin index route
   */
  showIndexHtmlAsView(pluginId?: string): void {
    // Use provided pluginId or fall back to current context
    const targetPluginId = pluginId || this._currentPluginId;
    if (!targetPluginId) {
      throw new Error(
        this._translateService.instant(T.PLUGINS.NO_PLUGIN_ID_PROVIDED_FOR_HTML),
      );
    }
    console.log('PluginBridge: Navigating to plugin index view', {
      pluginId: targetPluginId,
    });
    // Navigate to the plugin index route
    this._router.navigate(['/plugins', targetPluginId, 'index']);
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

      console.log('PluginBridge: Retrieved archived tasks', {
        count: archivedTasks.length,
      });
      return archivedTasks;
    } catch (error) {
      console.error('PluginBridge: Failed to load archived tasks:', error);
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

    console.log('PluginBridge: Task updated successfully', { taskId, updates });
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
          isDone: (taskData as any).isDone || false,
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

      console.log('PluginBridge: Subtask added successfully', {
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
        isDone: (taskData as any).isDone || false,
      };

      // Add the task using TaskService
      const taskId = this._taskService.add(
        taskData.title,
        false, // isAddToBacklog
        additional,
        false, // isAddToBottom
      );

      console.log('PluginBridge: Task added successfully', { taskId, taskData });
      return taskId;
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

    console.log('PluginBridge: Project add', { projectData });
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

    console.log('PluginBridge: Project updated successfully', { projectId, updates });
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
    console.log('PluginBridge: Tag added successfully', { tagId, tagData });
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
    console.log('PluginBridge: Tag updated successfully', { tagId, updates });
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

      console.log('PluginBridge: Validating task reorder', {
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

      console.log('PluginBridge: Project tasks reordered successfully', {
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

      console.log('PluginBridge: Subtasks reordered successfully', {
        parentTaskId: contextId,
        newOrder: taskIds,
      });
    }
  }

  /**
   * Persist plugin data - uses current plugin context for security
   */
  async persistDataSynced(dataStr: string): Promise<void> {
    typia.assert<string>(dataStr);

    if (!this._currentPluginId) {
      throw new Error(
        this._translateService.instant(T.PLUGINS.NO_PLUGIN_CONTEXT_PERSISTENCE),
      );
    }

    try {
      await this._pluginUserPersistenceService.persistPluginUserData(
        this._currentPluginId,
        dataStr,
      );
      console.log('PluginBridge: Plugin data persisted successfully', {
        pluginId: this._currentPluginId,
      });
    } catch (error) {
      console.error('PluginBridge: Failed to persist plugin data:', error);
      throw new Error(this._translateService.instant(T.PLUGINS.UNABLE_TO_PERSIST_DATA));
    }
  }

  /**
   * Get persisted plugin data - uses current plugin context for security
   */
  async loadPersistedData(): Promise<string | null> {
    if (!this._currentPluginId) {
      throw new Error(
        this._translateService.instant(T.PLUGINS.NO_PLUGIN_CONTEXT_LOADING),
      );
    }

    try {
      return await this._pluginUserPersistenceService.loadPluginUserData(
        this._currentPluginId,
      );
    } catch (error) {
      console.error('PluginBridge: Failed to get persisted plugin data:', error);
      return null;
    }
  }

  /**
   * Trigger a sync operation
   */
  async triggerSync(): Promise<void> {
    if (!this._currentPluginId) {
      throw new Error(this._translateService.instant(T.PLUGINS.NO_PLUGIN_CONTEXT_SYNC));
    }

    try {
      console.log('PluginBridge: Triggering sync for plugin', this._currentPluginId);
      await this._syncWrapperService.sync();
      console.log('PluginBridge: Sync completed successfully');
    } catch (error) {
      console.error('PluginBridge: Sync failed:', error);
      throw error;
    }
  }

  /**
   * Register a hook handler for a plugin
   */
  registerHook(pluginId: string, hook: Hooks, handler: PluginHookHandler): void {
    typia.assert<string>(pluginId);
    typia.assert<Hooks>(hook);
    typia.assert<PluginHookHandler>(handler);

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

    console.log('PluginBridge: All hooks unregistered for plugin', { pluginId });
  }

  /**
   * Register a header button for a plugin
   */
  registerHeaderButton(headerBtnCfg: PluginHeaderBtnCfg): void {
    if (!this._currentPluginId) {
      throw new Error(
        this._translateService.instant(T.PLUGINS.NO_PLUGIN_CONTEXT_HEADER_BUTTON),
      );
    }
    typia.assert<Omit<PluginHeaderBtnCfg, 'pluginId'>>(headerBtnCfg);

    const newButton: PluginHeaderBtnCfg = {
      ...headerBtnCfg,
      pluginId: this._currentPluginId,
    };

    const currentButtons = this._headerButtons$.value;
    this._headerButtons$.next([...currentButtons, newButton]);

    console.log('PluginBridge: Header button registered', {
      pluginId: this._currentPluginId,
      headerBtnCfg,
    });
  }

  /**
   * Register a menu entry for a plugin
   */
  registerMenuEntry(menuEntryCfg: Omit<PluginMenuEntryCfg, 'pluginId'>): void {
    if (!this._currentPluginId) {
      throw new Error(
        this._translateService.instant(T.PLUGINS.NO_PLUGIN_CONTEXT_MENU_ENTRY),
      );
    }

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
      pluginId: this._currentPluginId,
    };

    const currentEntries = this._menuEntries$.value;

    // Check for duplicate entry (same plugin ID and label)
    const isDuplicate = currentEntries.some(
      (entry) =>
        entry.pluginId === this._currentPluginId && entry.label === menuEntryCfg.label,
    );

    if (isDuplicate) {
      console.warn('PluginBridge: Duplicate menu entry detected, skipping registration', {
        pluginId: this._currentPluginId,
        label: menuEntryCfg.label,
      });
      return;
    }

    this._menuEntries$.next([...currentEntries, newMenuEntry]);

    console.log('PluginBridge: Menu entry registered', {
      pluginId: this._currentPluginId,
      menuEntryCfg,
    });
  }

  /**
   * Remove all header buttons for a specific plugin
   */
  private _removePluginHeaderButtons(pluginId: string): void {
    const currentButtons = this._headerButtons$.value;
    const filteredButtons = currentButtons.filter(
      (button) => button.pluginId !== pluginId,
    );
    this._headerButtons$.next(filteredButtons);

    console.log('PluginBridge: Header buttons removed for plugin', { pluginId });
  }

  /**
   * Remove all menu entries for a specific plugin
   */
  private _removePluginMenuEntries(pluginId: string): void {
    const currentEntries = this._menuEntries$.value;
    const filteredEntries = currentEntries.filter((entry) => entry.pluginId !== pluginId);
    this._menuEntries$.next(filteredEntries);

    console.log('PluginBridge: Menu entries removed for plugin', { pluginId });
  }

  /**
   * Register a side panel button for a plugin
   */
  registerSidePanelButton(
    sidePanelBtnCfg: Omit<PluginSidePanelBtnCfg, 'pluginId'>,
  ): void {
    if (!this._currentPluginId) {
      throw new Error(
        this._translateService.instant(T.PLUGINS.NO_PLUGIN_CONTEXT_SIDE_PANEL),
      );
    }

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
      pluginId: this._currentPluginId,
    };

    const currentButtons = this._sidePanelButtons$.value;

    // Check for duplicate button (same plugin ID)
    const isDuplicate = currentButtons.some(
      (button) => button.pluginId === this._currentPluginId,
    );

    if (isDuplicate) {
      console.warn(
        'PluginBridge: Duplicate side panel button detected, skipping registration',
        {
          pluginId: this._currentPluginId,
          label: sidePanelBtnCfg.label,
        },
      );
      return;
    }

    this._sidePanelButtons$.next([...currentButtons, newButton]);

    console.log('PluginBridge: Side panel button registered', {
      pluginId: this._currentPluginId,
      sidePanelBtnCfg,
    });
  }

  /**
   * Remove all side panel buttons for a specific plugin
   */
  private _removePluginSidePanelButtons(pluginId: string): void {
    const currentButtons = this._sidePanelButtons$.value;
    const filteredButtons = currentButtons.filter(
      (button) => button.pluginId !== pluginId,
    );
    this._sidePanelButtons$.next(filteredButtons);

    console.log('PluginBridge: Side panel buttons removed for plugin', { pluginId });
  }

  /**
   * Register a keyboard shortcut for a plugin
   */
  registerShortcut(shortcutCfg: PluginShortcutCfg): void {
    if (!this._currentPluginId) {
      throw new Error(
        this._translateService.instant(T.PLUGINS.NO_PLUGIN_CONTEXT_SHORTCUT),
      );
    }

    const shortcutWithPluginId: PluginShortcutCfg = {
      ...shortcutCfg,
      pluginId: this._currentPluginId,
    };

    const currentShortcuts = this.shortcuts$.value;
    this.shortcuts$.next([...currentShortcuts, shortcutWithPluginId]);

    console.log('PluginBridge: Shortcut registered', {
      pluginId: this._currentPluginId,
      shortcut: shortcutWithPluginId,
    });
  }

  /**
   * Execute a shortcut by its ID (pluginId:id)
   */
  async executeShortcut(shortcutId: string): Promise<boolean> {
    const shortcuts = this.shortcuts$.value;
    const shortcut = shortcuts.find((s) => `${s.pluginId}:${s.id}` === shortcutId);

    if (shortcut) {
      try {
        await Promise.resolve(shortcut.onExec());
        console.log(
          `Executed shortcut "${shortcut.label}" from plugin ${shortcut.pluginId}`,
        );
        return true;
      } catch (error) {
        console.error(`Failed to execute shortcut "${shortcut.label}":`, error);
        return false;
      }
    }

    return false;
  }

  /**
   * Unregister all shortcuts for a specific plugin
   */
  unregisterPluginShortcuts(pluginId: string): void {
    const currentShortcuts = this.shortcuts$.value;
    const filteredShortcuts = currentShortcuts.filter(
      (shortcut) => shortcut.pluginId !== pluginId,
    );

    if (filteredShortcuts.length !== currentShortcuts.length) {
      this.shortcuts$.next(filteredShortcuts);
      console.log(
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
   * Execute an NgRx action if it's in the allowed list
   */
  dispatchAction(action: any): void {
    if (!this._currentPluginId) {
      throw new Error(this._translateService.instant(T.PLUGINS.NO_PLUGIN_CONTEXT_ACTION));
    }

    // Check if the action is in the allowed list
    if (!isAllowedPluginAction(action)) {
      console.error(
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
    console.log(`PluginBridge: Dispatched action for plugin ${this._currentPluginId}`, {
      actionType: action.type,
      payload: action,
    });
  }

  /**
   * Execute Node.js script (only available in Electron)
   */
  async executeNodeScript(
    request: PluginNodeScriptRequest,
  ): Promise<PluginNodeScriptResult> {
    if (!IS_ELECTRON) {
      return {
        success: false,
        error: this._translateService.instant(T.PLUGINS.NODE_ONLY_DESKTOP),
      };
    }

    if (!this._currentPluginId) {
      return {
        success: false,
        error: this._translateService.instant(T.PLUGINS.NO_PLUGIN_CONTEXT_NODE),
      };
    }

    try {
      typia.assert<PluginNodeScriptRequest>(request);

      if (!this._currentPluginManifest) {
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
      const result = await window.ea.pluginExecNodeScript(
        this._currentPluginId,
        this._currentPluginManifest,
        request,
      );

      return result;
    } catch (error) {
      console.error('PluginBridge: Failed to execute Node.js script:', error);
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
  async sendMessageToPlugin(pluginId: string, message: any): Promise<any> {
    // Import and get the plugin runner service
    // Using dynamic import to avoid circular dependency at compile time
    const { PluginRunner } = await import('./plugin-runner');
    const pluginRunner = this._injector.get(PluginRunner);
    return pluginRunner.sendMessageToPlugin(pluginId, message);
  }

  /**
   * Clean up all resources when service is destroyed
   */
  ngOnDestroy(): void {
    console.log('PluginBridgeService: Cleaning up resources');

    // Complete all BehaviorSubjects
    this._headerButtons$.complete();
    this._menuEntries$.complete();
    this.shortcuts$.complete();
    this._sidePanelButtons$.complete();

    console.log('PluginBridgeService: Cleanup complete');
  }
}
