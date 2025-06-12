import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SnackService } from '../core/snack/snack.service';
import { NotifyService } from '../core/notify/notify.service';
import {
  CreateTaskData,
  DialogCfg,
  Hooks,
  NotifyCfg,
  SnackCfgLimited,
} from './plugin-api.model';
import { PluginHooksService } from './plugin-hooks';
import { TaskCopy } from '../features/tasks/task.model';
import { TaskService } from '../features/tasks/task.service';
import { WorkContextService } from '../features/work-context/work-context.service';
import { ProjectService } from '../features/project/project.service';
import { ProjectCopy } from '../features/project/project.model';
import { TagService } from '../features/tag/tag.service';
import { TagCopy } from '../features/tag/tag.model';
import typia from 'typia';
import { first } from 'rxjs/operators';
import { PluginPersistenceService } from './plugin-persistence.service';
import { PluginHeaderBtnCfg } from './ui/plugin-header-btns.component';

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
  private _pluginHooksService = inject(PluginHooksService);
  private _taskService = inject(TaskService);
  private _workContextService = inject(WorkContextService);
  private _projectService = inject(ProjectService);
  private _tagService = inject(TagService);
  private _pluginPersistenceService = inject(PluginPersistenceService);

  // Track which plugin is currently making calls to prevent cross-plugin access
  private _currentPluginId: string | null = null;

  // Track header buttons registered by plugins
  private _headerButtons$ = new BehaviorSubject<PluginHeaderBtnCfg[]>([]);
  public readonly headerButtons$ = this._headerButtons$.asObservable();

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
   * Open a dialog
   */
  async openDialog(dialogCfg: DialogCfg): Promise<void> {
    typia.assert<DialogCfg>(dialogCfg);

    // For now, use a simple browser dialog
    // TODO: Integrate with Angular Material Dialog or custom dialog service
    if (dialogCfg.htmlContent) {
      // Strip HTML for simple text display
      const textContent = dialogCfg.htmlContent.replace(/<[^>]*>/g, '');
      alert(textContent);
    }

    // Execute button actions if provided
    if (dialogCfg.buttons && dialogCfg.buttons.length > 0) {
      const firstButton = dialogCfg.buttons[0];
      if (firstButton.onClick) {
        await firstButton.onClick();
      }
    }
  }

  showIndexHtmlAsView(): void {
    // TODO implement via routing
  }

  /**
   * Get all tasks
   */
  async getAllTasks(): Promise<TaskCopy[]> {
    const tasks = await this._taskService.allTasks$.pipe(first()).toPromise();
    return tasks || [];
  }

  /**
   * Get archived tasks
   */
  async getArchivedTasks(): Promise<TaskCopy[]> {
    // TaskService doesn't have allArchivedTasks$, so we'll return empty for now
    // TODO: Implement archived tasks retrieval when available
    console.log('PluginBridge: getArchivedTasks called - not yet implemented');
    return [];
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
  async addTask(taskData: CreateTaskData): Promise<string> {
    typia.assert<CreateTaskData>(taskData);

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
      await this._pluginPersistenceService.persistPluginData(
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
      return await this._pluginPersistenceService.loadPluginData(this._currentPluginId);
    } catch (error) {
      console.error('PluginBridge: Failed to get persisted plugin data:', error);
      return null;
    }
  }

  /**
   * Register a hook handler for a plugin
   */
  registerHook(
    pluginId: string,
    hook: Hooks,
    handler: (...args: any[]) => void | Promise<void>,
  ): void {
    typia.assert<string>(pluginId);
    typia.assert<Hooks>(hook);
    typia.assert<(...args: any[]) => void | Promise<void>>(handler);

    this._pluginHooksService.registerHookHandler(pluginId, hook, handler);
  }

  /**
   * Unregister all hooks for a plugin
   */
  unregisterPluginHooks(pluginId: string): void {
    typia.assert<string>(pluginId);

    this._pluginHooksService.unregisterPluginHooks(pluginId);
    this._removePluginHeaderButtons(pluginId);
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

      const projectExists = projects?.some((project: any) => project.id === projectId);
      if (!projectExists) {
        errors.push(`Project with ID '${projectId}' does not exist`);
      }
    }

    // Validate tags exist if provided
    if (tagIds && tagIds.length > 0) {
      const tags = await this._tagService.tags$.pipe(first()).toPromise();

      const existingTagIds = tags?.map((tag: any) => tag.id) || [];
      const nonExistentTags = tagIds.filter((tagId) => !existingTagIds.includes(tagId));

      if (nonExistentTags.length > 0) {
        errors.push(`Tags with IDs '${nonExistentTags.join(', ')}' do not exist`);
      }
    }

    // Validate parent task exists if provided
    if (parentId) {
      const tasks = await this._taskService.allTasks$.pipe(first()).toPromise();

      const parentExists = tasks?.some((task: any) => task.id === parentId);
      if (!parentExists) {
        errors.push(`Parent task with ID '${parentId}' does not exist`);
      }
    }

    // Throw error if any validation failed
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join('; ')}`);
    }
  }
}
