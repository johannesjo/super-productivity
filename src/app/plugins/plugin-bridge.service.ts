import { inject, Injectable } from '@angular/core';
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
import { GlobalConfigService } from '../features/config/global-config.service';
import { ProjectService } from '../features/project/project.service';
import { ProjectCopy } from '../features/project/project.model';
import { TagService } from '../features/tag/tag.service';
import { TagCopy } from '../features/tag/tag.model';
import typia from 'typia';
import { first } from 'rxjs/operators';
import { nanoid } from 'nanoid';

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
  private _globalConfigService = inject(GlobalConfigService);
  private _projectService = inject(ProjectService);
  private _tagService = inject(TagService);

  constructor() {}

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
    try {
      const tasks = await this._taskService.allTasks$.pipe(first()).toPromise();
      return tasks || [];
    } catch (error) {
      console.error('PluginBridge: Failed to get all tasks:', error);
      return [];
    }
  }

  /**
   * Get archived tasks
   */
  async getArchivedTasks(): Promise<TaskCopy[]> {
    try {
      // TaskService doesn't have allArchivedTasks$, so we'll return empty for now
      // TODO: Implement archived tasks retrieval when available
      console.log('PluginBridge: getArchivedTasks called - not yet implemented');
      return [];
    } catch (error) {
      console.error('PluginBridge: Failed to get archived tasks:', error);
      return [];
    }
  }

  /**
   * Get current context tasks
   */
  async getCurrentContextTasks(): Promise<TaskCopy[]> {
    try {
      const contextTasks = await this._workContextService.todaysTasks$
        .pipe(first())
        .toPromise();
      return contextTasks || [];
    } catch (error) {
      console.error('PluginBridge: Failed to get current context tasks:', error);
      return [];
    }
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, updates: Partial<TaskCopy>): Promise<void> {
    typia.assert<string>(taskId);
    typia.assert<Partial<TaskCopy>>(updates);

    try {
      // Validate that referenced project, tags, and parent task exist if they are being updated
      await this._validateTaskReferences(
        updates.projectId,
        updates.tagIds,
        updates.parentId,
      );

      // Update the task using TaskService (TaskCopy is compatible with Task)
      this._taskService.update(taskId, updates);

      console.log('PluginBridge: Task updated successfully', { taskId, updates });
    } catch (error) {
      console.error('PluginBridge: Failed to update task:', error);
      throw error;
    }
  }

  /**
   * Add a new task
   */
  async addTask(taskData: CreateTaskData): Promise<string> {
    typia.assert<CreateTaskData>(taskData);

    try {
      // Validate that referenced project, tags, and parent task exist
      await this._validateTaskReferences(
        taskData.projectId,
        taskData.tagIds,
        taskData.parentId,
      );

      // TaskService.add expects (title, isAddToBacklog, additional, isAddToBottom)
      const additional: Partial<any> = {
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
    } catch (error) {
      console.error('PluginBridge: Failed to add task:', error);
      throw error;
    }
  }

  /**
   * Get all projects
   */
  async getAllProjects(): Promise<ProjectCopy[]> {
    try {
      const projects = await this._projectService.list$.pipe(first()).toPromise();
      return projects || [];
    } catch (error) {
      console.error('PluginBridge: Failed to get all projects:', error);
      return [];
    }
  }

  /**
   * Add a new project
   */
  async addProject(projectData: Partial<ProjectCopy>): Promise<string> {
    typia.assert<Partial<ProjectCopy>>(projectData);

    try {
      // Generate ID and add project (ProjectCopy is compatible with Project)
      const projectId = nanoid();
      const projectToAdd = {
        id: projectId,
        title: projectData.title || 'New Project',
        ...projectData,
      };

      // Add the project using ProjectService
      this._projectService.add(projectToAdd);

      console.log('PluginBridge: Project added successfully', { projectId, projectData });
      return projectId;
    } catch (error) {
      console.error('PluginBridge: Failed to add project:', error);
      throw error;
    }
  }

  /**
   * Update a project
   */
  async updateProject(projectId: string, updates: Partial<ProjectCopy>): Promise<void> {
    typia.assert<string>(projectId);
    typia.assert<Partial<ProjectCopy>>(updates);

    try {
      // Update the project using ProjectService (ProjectCopy is compatible with Project)
      this._projectService.update(projectId, updates);

      console.log('PluginBridge: Project updated successfully', { projectId, updates });
    } catch (error) {
      console.error('PluginBridge: Failed to update project:', error);
      throw error;
    }
  }

  /**
   * Get all tags
   */
  async getAllTags(): Promise<TagCopy[]> {
    try {
      const tags = await this._tagService.tags$.pipe(first()).toPromise();
      return tags || [];
    } catch (error) {
      console.error('PluginBridge: Failed to get all tags:', error);
      return [];
    }
  }

  /**
   * Add a new tag
   */
  async addTag(tagData: Partial<TagCopy>): Promise<string> {
    typia.assert<Partial<TagCopy>>(tagData);

    try {
      // Add the tag using TagService (TagCopy is compatible with Tag)
      const tagId = this._tagService.addTag(tagData as any);

      console.log('PluginBridge: Tag added successfully', { tagId, tagData });
      return tagId;
    } catch (error) {
      console.error('PluginBridge: Failed to add tag:', error);
      throw error;
    }
  }

  /**
   * Update a tag
   */
  async updateTag(tagId: string, updates: Partial<TagCopy>): Promise<void> {
    typia.assert<string>(tagId);
    typia.assert<Partial<TagCopy>>(updates);

    try {
      // Update the tag using TagService (TagCopy is compatible with Tag)
      this._tagService.updateTag(tagId, updates);

      console.log('PluginBridge: Tag updated successfully', { tagId, updates });
    } catch (error) {
      console.error('PluginBridge: Failed to update tag:', error);
      throw error;
    }
  }

  /**
   * Persist plugin data
   */
  async persistDataSynced(dataStr: string): Promise<void> {
    typia.assert<string>(dataStr);

    // TODO use pfapi for this
    try {
      localStorage.setItem('plugin-data', dataStr);
      console.log('PluginBridge: Plugin data persisted successfully');
    } catch (error) {
      console.error('PluginBridge: Failed to persist plugin data:', error);
      throw new Error('Unable to persist plugin data');
    }
  }

  /**
   * Get persisted plugin data
   */
  async loadPersistedData(): Promise<string | null> {
    // TODO use pfapi for this
    try {
      return localStorage.getItem('plugin-data');
    } catch (error) {
      console.error('PluginBridge: Failed to get persisted plugin data:', error);
      return null;
    }
  }

  /**
   * Add action to execute before app close (placeholder implementation)
   */
  addActionBeforeCloseApp(action: () => Promise<void>): void {
    typia.assert<() => Promise<void>>(action);

    // TODO: Integrate with app lifecycle service
    console.log('PluginBridge: addActionBeforeCloseApp called', action);
  }

  /**
   * Get configuration for plugins
   */
  async getCfg<T>(): Promise<T> {
    try {
      const config = await this._globalConfigService.cfg$.pipe(first()).toPromise();
      return (config as T) || ({} as T);
    } catch (error) {
      console.error('PluginBridge: Failed to get configuration:', error);
      return {} as T;
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
    if (projectId && projectId !== null && projectId !== undefined) {
      try {
        const projects = await this._projectService.list$.pipe(first()).toPromise();

        const projectExists = projects?.some((project: any) => project.id === projectId);
        if (!projectExists) {
          errors.push(`Project with ID '${projectId}' does not exist`);
        }
      } catch (error) {
        console.error('PluginBridge: Failed to validate project:', error);
        errors.push(`Failed to validate project '${projectId}'`);
      }
    }

    // Validate tags exist if provided
    if (tagIds && tagIds.length > 0) {
      try {
        const tags = await this._tagService.tags$.pipe(first()).toPromise();

        const existingTagIds = tags?.map((tag: any) => tag.id) || [];
        const nonExistentTags = tagIds.filter((tagId) => !existingTagIds.includes(tagId));

        if (nonExistentTags.length > 0) {
          errors.push(`Tags with IDs '${nonExistentTags.join(', ')}' do not exist`);
        }
      } catch (error) {
        console.error('PluginBridge: Failed to validate tags:', error);
        errors.push(`Failed to validate tags '${tagIds.join(', ')}'`);
      }
    }

    // Validate parent task exists if provided
    if (parentId && parentId !== null && parentId !== undefined) {
      try {
        const tasks = await this._taskService.allTasks$.pipe(first()).toPromise();

        const parentExists = tasks?.some((task: any) => task.id === parentId);
        if (!parentExists) {
          errors.push(`Parent task with ID '${parentId}' does not exist`);
        }
      } catch (error) {
        console.error('PluginBridge: Failed to validate parent task:', error);
        errors.push(`Failed to validate parent task '${parentId}'`);
      }
    }

    // Throw error if any validation failed
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join('; ')}`);
    }
  }
}
