import { inject, Injectable } from '@angular/core';
import { SnackService } from '../core/snack/snack.service';
import { NotifyService } from '../core/notify/notify.service';
import {
  DialogCfg,
  Hooks,
  NotifyCfg,
  SnackCfgLimited,
  CreateTaskData,
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
import { map, first } from 'rxjs/operators';
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
  notify(notifyCfg: NotifyCfg): void {
    typia.assert<NotifyCfg>(notifyCfg);

    if ('Notification' in window) {
      // Use browser notifications
      if (Notification.permission === 'granted') {
        new Notification(notifyCfg.title, {
          body: notifyCfg.body,
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(notifyCfg.title, {
              body: notifyCfg.body,
            });
          }
        });
      }
    } else {
      // Fallback to snack message if notifications aren't supported
      this.showSnack({
        msg: `${notifyCfg.title}: ${notifyCfg.body}`,
        type: 'CUSTOM',
      });
    }
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

  /**
   * Get all tasks
   */
  async getAllTasks(): Promise<TaskCopy[]> {
    try {
      const tasks = await this._taskService.allTasks$
        .pipe(
          map((taskList: any[]) =>
            taskList.map((task: any) => this._convertTaskToTaskCopy(task)),
          ),
          first(),
        )
        .toPromise();
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
        .pipe(
          map((taskList: any[]) =>
            taskList.map((task: any) => this._convertTaskToTaskCopy(task)),
          ),
          first(),
        )
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
      // Convert TaskCopy updates to Task updates format
      const taskUpdates = this._convertTaskCopyUpdatesToTaskUpdates(updates);

      // Update the task using TaskService
      this._taskService.update(taskId, taskUpdates);

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
      const projects = await this._projectService.list$
        .pipe(
          map((projectList: any[]) =>
            projectList.map((project: any) => this._convertProjectToProjectCopy(project)),
          ),
          first(),
        )
        .toPromise();
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
      // Generate ID and convert ProjectCopy to Project format expected by ProjectService
      const projectId = nanoid();
      const projectToAdd = {
        ...this._convertProjectCopyToProject(projectData),
        id: projectId,
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
      // Convert ProjectCopy updates to Project updates format
      const projectUpdates = this._convertProjectCopyUpdatesToProjectUpdates(updates);

      // Update the project using ProjectService
      this._projectService.update(projectId, projectUpdates);

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
      const tags = await this._tagService.tags$
        .pipe(
          map((tagList: any[]) =>
            tagList.map((tag: any) => this._convertTagToTagCopy(tag)),
          ),
          first(),
        )
        .toPromise();
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
      // Convert TagCopy to Tag format expected by TagService
      const tagToAdd = this._convertTagCopyToTag(tagData);

      // Add the tag using TagService
      const tagId = this._tagService.addTag(tagToAdd);

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
      // Convert TagCopy updates to Tag updates format
      const tagUpdates = this._convertTagCopyUpdatesToTagUpdates(updates);

      // Update the tag using TagService
      this._tagService.updateTag(tagId, tagUpdates);

      console.log('PluginBridge: Tag updated successfully', { tagId, updates });
    } catch (error) {
      console.error('PluginBridge: Failed to update tag:', error);
      throw error;
    }
  }

  /**
   * Persist plugin data
   */
  persistDataSynced(dataStr: string): void {
    typia.assert<string>(dataStr);

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
  getPersistedData(): string | null {
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
   * Convert Project to ProjectCopy for plugin consumption
   */
  private _convertProjectToProjectCopy(project: any): ProjectCopy {
    return {
      id: project.id || '',
      title: project.title || '',
      isArchived: project.isArchived || false,
      isHiddenFromMenu: project.isHiddenFromMenu || false,
      isEnableBacklog: project.isEnableBacklog || false,
      taskIds: project.taskIds || [],
      backlogTaskIds: project.backlogTaskIds || [],
      noteIds: project.noteIds || [],
      advancedCfg: project.advancedCfg || { worklogExportSettings: {} },
      theme: project.theme || {},
      icon: project.icon || null,
      breakTime: project.breakTime || {},
      breakNr: project.breakNr || {},
      workStart: project.workStart || {},
      workEnd: project.workEnd || {},
      issueIntegrationCfgs: project.issueIntegrationCfgs || {},
    };
  }

  /**
   * Convert ProjectCopy to Project format for app consumption
   */
  private _convertProjectCopyToProject(projectData: Partial<ProjectCopy>): any {
    return {
      title: projectData.title || 'New Project',
      isArchived: projectData.isArchived || false,
      isHiddenFromMenu: projectData.isHiddenFromMenu || false,
      isEnableBacklog: projectData.isEnableBacklog || false,
      taskIds: projectData.taskIds || [],
      backlogTaskIds: projectData.backlogTaskIds || [],
      noteIds: projectData.noteIds || [],
      advancedCfg: projectData.advancedCfg || { worklogExportSettings: {} },
      theme: projectData.theme || {},
      icon: projectData.icon || null,
      breakTime: projectData.breakTime || {},
      breakNr: projectData.breakNr || {},
      workStart: projectData.workStart || {},
      workEnd: projectData.workEnd || {},
      issueIntegrationCfgs: projectData.issueIntegrationCfgs || {},
    };
  }

  /**
   * Convert ProjectCopy updates to Project updates format
   */
  private _convertProjectCopyUpdatesToProjectUpdates(updates: Partial<ProjectCopy>): any {
    const cleanUpdates: any = {};

    Object.keys(updates).forEach((key) => {
      const value = (updates as any)[key];
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    });

    return cleanUpdates;
  }

  /**
   * Convert Tag to TagCopy for plugin consumption
   */
  private _convertTagToTagCopy(tag: any): TagCopy {
    return {
      id: tag.id || '',
      title: tag.title || '',
      icon: tag.icon || null,
      color: tag.color || null,
      created: tag.created || Date.now(),
      taskIds: tag.taskIds || [],
      advancedCfg: tag.advancedCfg || { worklogExportSettings: {} },
      theme: tag.theme || {},
      breakTime: tag.breakTime || {},
      breakNr: tag.breakNr || {},
      workStart: tag.workStart || {},
      workEnd: tag.workEnd || {},
    };
  }

  /**
   * Convert TagCopy to Tag format for app consumption
   */
  private _convertTagCopyToTag(tagData: Partial<TagCopy>): any {
    return {
      title: tagData.title || 'New Tag',
      icon: tagData.icon || null,
      color: tagData.color || null,
      taskIds: tagData.taskIds || [],
      advancedCfg: tagData.advancedCfg || { worklogExportSettings: {} },
      theme: tagData.theme || {},
      breakTime: tagData.breakTime || {},
      breakNr: tagData.breakNr || {},
      workStart: tagData.workStart || {},
      workEnd: tagData.workEnd || {},
    };
  }

  /**
   * Convert TagCopy updates to Tag updates format
   */
  private _convertTagCopyUpdatesToTagUpdates(updates: Partial<TagCopy>): any {
    const cleanUpdates: any = {};

    Object.keys(updates).forEach((key) => {
      const value = (updates as any)[key];
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    });

    return cleanUpdates;
  }

  /**
   * Convert Task to TaskCopy for plugin consumption
   * This ensures plugins only get safe, serializable data
   */
  private _convertTaskToTaskCopy(task: any): TaskCopy {
    return {
      id: task.id || '',
      title: task.title || '',
      isDone: task.isDone || false,
      created: task.created || Date.now(),
      timeSpent: task.timeSpent || 0,
      timeSpentOnDay: task.timeSpentOnDay || {},
      timeEstimate: task.timeEstimate || 0,
      projectId: task.projectId || null,
      tagIds: task.tagIds || [],
      parentId: task.parentId || null,
      subTaskIds: task.subTaskIds || [],
      notes: task.notes || '',
      attachments: task.attachments || [],
      // Add other safe properties as needed
      // Exclude functions, circular references, etc.
    };
  }

  /**
   * Convert TaskCopy updates to Task updates format
   * This ensures plugin updates are properly formatted for the app
   */
  private _convertTaskCopyUpdatesToTaskUpdates(updates: Partial<TaskCopy>): any {
    // Filter out undefined values and ensure proper types
    const cleanUpdates: any = {};

    Object.keys(updates).forEach((key) => {
      const value = (updates as any)[key];
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    });

    return cleanUpdates;
  }
}
