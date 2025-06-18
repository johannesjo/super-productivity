import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
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
  SnackCfgLimited,
  PluginHeaderBtnCfg,
  PluginSidePanelBtnCfg,
  TaskCopy,
  ProjectCopy,
  TagCopy,
  PluginNodeScriptRequest,
  PluginNodeScriptResult,
} from './plugin-api.model';
import { PluginHooksService } from './plugin-hooks';
import { TaskService } from '../features/tasks/task.service';
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
import '../core/window-ea';

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
export class PluginBridgeService {
  private _snackService = inject(SnackService);
  private _notifyService = inject(NotifyService);
  private _dialog = inject(MatDialog);
  private _pluginHooksService = inject(PluginHooksService);
  private _taskService = inject(TaskService);
  private _workContextService = inject(WorkContextService);
  private _projectService = inject(ProjectService);
  private _tagService = inject(TagService);
  private _pluginUserPersistenceService = inject(PluginUserPersistenceService);
  private _taskArchiveService = inject(TaskArchiveService);
  private _router = inject(Router);

  // Track which plugin is currently making calls to prevent cross-plugin access
  private _currentPluginId: string | null = null;

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
  _setCurrentPlugin(pluginId: string): void {
    this._currentPluginId = pluginId;
  }

  /**
   * Show a snack message to the user
   */
  showSnack(snackCfg: SnackCfgLimited): void {
    typia.assert<SnackCfgLimited>(snackCfg);
    this._snackService.open(snackCfg);
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
  showIndexHtmlAsView(): void {
    if (!this._currentPluginId) {
      throw new Error('No plugin context set for showing index HTML view');
    }
    console.log('PluginBridge: Navigating to plugin index view', {
      pluginId: this._currentPluginId,
    });
    // Navigate to the plugin index route
    this._router.navigate(['/plugins', this._currentPluginId, 'index']);
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

    // TaskService.add expects (title, isAddToBacklog, additional, isAddToBottom)
    const additional: Partial<TaskCopy> = {
      projectId: taskData.projectId || undefined,
      tagIds: taskData.tagIds || [],
      notes: taskData.notes || '',
      timeEstimate: taskData.timeEstimate || 0,
      parentId: taskData.parentId || undefined,
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
   * Persist plugin data - uses current plugin context for security
   */
  async persistDataSynced(dataStr: string): Promise<void> {
    typia.assert<string>(dataStr);

    if (!this._currentPluginId) {
      throw new Error('No plugin context set for data persistence');
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
      throw new Error('Unable to persist plugin data');
    }
  }

  /**
   * Get persisted plugin data - uses current plugin context for security
   */
  async loadPersistedData(): Promise<string | null> {
    if (!this._currentPluginId) {
      throw new Error('No plugin context set for data loading');
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
      throw new Error('No plugin context set for header button registration');
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
      throw new Error('No plugin context set for menu entry registration');
    }

    // Validate required fields manually since typia has issues with optional fields
    if (!menuEntryCfg.label || typeof menuEntryCfg.label !== 'string') {
      throw new Error('Menu entry must have a valid label string');
    }
    if (!menuEntryCfg.onClick || typeof menuEntryCfg.onClick !== 'function') {
      throw new Error('Menu entry must have a valid onClick function');
    }
    if (menuEntryCfg.icon !== undefined && typeof menuEntryCfg.icon !== 'string') {
      throw new Error('Menu entry icon must be a string if provided');
    }

    const newMenuEntry: PluginMenuEntryCfg = {
      ...menuEntryCfg,
      pluginId: this._currentPluginId,
    };

    const currentEntries = this._menuEntries$.value;
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
      throw new Error('No plugin context set for side panel button registration');
    }

    // Validate required fields
    if (!sidePanelBtnCfg.label || typeof sidePanelBtnCfg.label !== 'string') {
      throw new Error('Side panel button must have a valid label string');
    }
    if (!sidePanelBtnCfg.onClick || typeof sidePanelBtnCfg.onClick !== 'function') {
      throw new Error('Side panel button must have a valid onClick function');
    }

    const newButton: PluginSidePanelBtnCfg = {
      ...sidePanelBtnCfg,
      pluginId: this._currentPluginId,
    };

    const currentButtons = this._sidePanelButtons$.value;
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
      throw new Error('No plugin context set for shortcut registration');
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
        errors.push(`Project with ID '${projectId}' does not exist`);
      }
    }

    // Validate tags exist if provided
    if (tagIds && tagIds.length > 0) {
      const tags = await this._tagService.tags$.pipe(first()).toPromise();

      const existingTagIds = tags?.map((tag) => tag.id) || [];
      const nonExistentTags = tagIds.filter((tagId) => !existingTagIds.includes(tagId));

      if (nonExistentTags.length > 0) {
        errors.push(`Tags with IDs '${nonExistentTags.join(', ')}' do not exist`);
      }
    }

    // Validate parent task exists if provided
    if (parentId) {
      const tasks = await this._taskService.allTasks$.pipe(first()).toPromise();

      const parentExists = tasks?.some((task) => task.id === parentId);
      if (!parentExists) {
        errors.push(`Parent task with ID '${parentId}' does not exist`);
      }
    }

    // Throw error if any validation failed
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join('; ')}`);
    }
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
        error: 'Node.js execution is only available in the desktop version',
      };
    }

    if (!this._currentPluginId) {
      return {
        success: false,
        error: 'No plugin context set for Node.js execution',
      };
    }

    try {
      typia.assert<PluginNodeScriptRequest>(request);

      // Call Electron main process via IPC
      const result = await window.ea!.pluginExecNodeScript(
        this._currentPluginId,
        request,
      );

      return result;
    } catch (error) {
      console.error('PluginBridge: Failed to execute Node.js script:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute script',
      };
    }
  }
}
