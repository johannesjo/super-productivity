import { PluginAPI } from './plugin';
import { replicateMD, ExtendedSyncResult, parseMarkdownToTree } from './syncLogic';
import { Task, SyncConfig } from './types';

export interface FileWatcherOptions {
  config: SyncConfig;
  onSync?: (result: ExtendedSyncResult) => void;
  onError?: (error: Error) => void;
}

export class FileWatcher {
  private watchInterval: number | null = null;
  private lastFileContent: string | null = null;
  private lastSyncTime: number = 0;
  private isWatching: boolean = false;

  constructor(private options: FileWatcherOptions) {}

  async start(): Promise<void> {
    if (this.isWatching) {
      console.log('File watcher already running');
      return;
    }

    this.isWatching = true;
    console.log('Starting file watcher for:', this.options.config.filePath);

    // Initial sync
    await this.performSync();

    // Set up polling interval (every 30 seconds for better performance)
    this.watchInterval = window.setInterval(async () => {
      try {
        await this.checkAndSync();
      } catch (error) {
        console.error('Error in file watcher:', error);
        if (this.options.onError) {
          this.options.onError(error as Error);
        }
      }
    }, 30000);
  }

  stop(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
    this.isWatching = false;
    console.log('File watcher stopped');
  }

  private async checkAndSync(): Promise<void> {
    if (!this.options.config.enabled) {
      return;
    }

    try {
      // Read the file using node script execution
      const fileContent = await this.readFile(this.options.config.filePath);

      // Check if file has changed
      if (fileContent !== this.lastFileContent) {
        console.log('File changed, syncing...');
        this.lastFileContent = fileContent;
        await this.performSync();
      }
    } catch (error) {
      console.error('Error checking file:', error);
      throw error;
    }
  }

  private async performSync(): Promise<void> {
    try {
      const { config } = this.options;

      // Read current file content
      const fileContent = await this.readFile(config.filePath);
      this.lastFileContent = fileContent;

      // Get tasks from the project
      const allTasks = await PluginAPI.getTasks();
      const projectTasks = allTasks.filter((task) => task.projectId === config.projectId);

      // Get project data to see if we have taskIds
      const projects = await PluginAPI.getAllProjects();
      const currentProject = projects.find((p) => p.id === config.projectId);

      // Reorder tasks based on project.taskIds if available
      let orderedProjectTasks = projectTasks;
      if (currentProject?.taskIds) {
        const taskMap = new Map(projectTasks.map((t) => [t.id, t]));
        orderedProjectTasks = currentProject.taskIds
          .map((id) => taskMap.get(id))
          .filter((task): task is Task => task !== undefined);
      }

      // Perform replication
      const result = replicateMD(fileContent, orderedProjectTasks, config.syncDirection);

      if (!result.success) {
        throw new Error(result.error || 'Sync failed');
      }

      // Apply operations based on sync direction
      if (
        config.syncDirection === 'fileToProject' ||
        config.syncDirection === 'bidirectional'
      ) {
        await this.applyTaskOperations(result, config.projectId);
      }

      if (
        config.syncDirection === 'projectToFile' ||
        config.syncDirection === 'bidirectional'
      ) {
        if (result.updatedMarkdown !== fileContent) {
          await this.writeFile(config.filePath, result.updatedMarkdown);
          this.lastFileContent = result.updatedMarkdown;
        }
      }

      this.lastSyncTime = Date.now();

      if (this.options.onSync) {
        this.options.onSync(result);
      }
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    }
  }

  private async applyTaskOperations(
    result: ExtendedSyncResult,
    projectId: string,
  ): Promise<void> {
    // Keep track of task ID mappings for new tasks
    const taskIdMap = new Map<string, string>(); // tempId -> realId

    for (const operation of result.operations) {
      if (operation.target !== 'task') continue;

      try {
        switch (operation.type) {
          case 'add':
            if (operation.data) {
              const newTask = {
                title: operation.data.title || '',
                isDone: operation.data.isDone || false,
                projectId: projectId,
                parentId: operation.parentId || undefined,
                notes: operation.data.notes || undefined,
              };
              const createdTaskId = await PluginAPI.addTask(newTask);
              console.log('Created task:', createdTaskId);

              // Store mapping if we have a temporary ID
              if (operation.tempId) {
                taskIdMap.set(operation.tempId, createdTaskId);
              }
            }
            break;

          case 'update':
            if (operation.taskId && operation.data) {
              await PluginAPI.updateTask(operation.taskId, {
                title: operation.data.title,
                isDone: operation.data.isDone,
              });
              console.log('Updated task:', operation.taskId);
            }
            break;

          case 'delete':
            if (operation.taskId) {
              // Note: deleteTask is not available in the plugin API
              // We'll mark the task as done instead and add a note
              await PluginAPI.updateTask(operation.taskId, {
                isDone: true,
                title: `[DELETED] ${operation.data?.title || 'Task'}`,
              });
              console.log(
                'Marked task as deleted (deleteTask not available):',
                operation.taskId,
              );
            }
            break;
        }
      } catch (error) {
        console.error(`Failed to ${operation.type} task:`, error);
      }
    }

    // After all operations are complete, set the task order based on markdown
    await this.updateTaskOrder(projectId);
  }

  private async updateTaskOrder(projectId: string): Promise<void> {
    try {
      // Read the current markdown file to get the order
      const fileContent = await this.readFile(this.options.config.filePath);
      const markdownTree = parseMarkdownToTree(fileContent);

      // Get all current tasks
      const allTasks = await PluginAPI.getTasks();
      const projectTasks = allTasks.filter((task) => task.projectId === projectId);

      // Build ordered task IDs from markdown structure (root tasks only)
      const orderedTaskIds: string[] = [];
      markdownTree.forEach((node) => {
        // Find the corresponding task
        const task = projectTasks.find(
          (t) => (node.id && t.id === node.id) || t.title === node.title,
        );
        if (task && !task.parentId) {
          // Only include root tasks
          orderedTaskIds.push(task.id);
        }
      });

      // Add any tasks not in markdown at the end
      projectTasks.forEach((task) => {
        if (!task.parentId && !orderedTaskIds.includes(task.id)) {
          orderedTaskIds.push(task.id);
        }
      });

      // Apply the order
      if (orderedTaskIds.length > 0) {
        await PluginAPI.reorderTasks(orderedTaskIds, projectId, 'project');
        console.log('Reordered tasks to match markdown order:', orderedTaskIds);
      }
    } catch (error) {
      console.error('Failed to update task order:', error);
    }
  }

  private async readFile(filePath: string): Promise<string> {
    if (!PluginAPI.executeNodeScript) {
      throw new Error('Node script execution not available');
    }

    const result = await PluginAPI.executeNodeScript({
      script: `
        const fs = require('fs');
        const path = require('path');
        
        try {
          const absolutePath = path.resolve(args[0]);
          const content = fs.readFileSync(absolutePath, 'utf8');
          return { success: true, content };
        } catch (error) {
          return { success: false, error: error.message };
        }
      `,
      args: [filePath],
      timeout: 5000,
    });

    if (!result.success) {
      throw new Error(`Failed to read file: ${result.error}`);
    }

    if (!result.result?.success) {
      throw new Error(`Cannot read file: ${result.result?.error || 'Unknown error'}`);
    }

    return result.result.content;
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    if (!PluginAPI.executeNodeScript) {
      throw new Error('Node script execution not available');
    }

    const result = await PluginAPI.executeNodeScript({
      script: `
        const fs = require('fs');
        const path = require('path');
        
        try {
          const absolutePath = path.resolve(args[0]);
          const content = args[1];
          
          // Create backup
          if (fs.existsSync(absolutePath)) {
            const backupPath = absolutePath + '.backup';
            fs.copyFileSync(absolutePath, backupPath);
          }
          
          // Write new content
          fs.writeFileSync(absolutePath, content, 'utf8');
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      `,
      args: [filePath, content],
      timeout: 5000,
    });

    if (!result.success) {
      throw new Error(`Failed to write file: ${result.error}`);
    }

    if (!result.result?.success) {
      throw new Error(`Cannot write file: ${result.result?.error || 'Unknown error'}`);
    }
  }

  async getSyncInfo(): Promise<{
    lastSyncTime: number;
    taskCount: number;
    isWatching: boolean;
  }> {
    const allTasks = await PluginAPI.getTasks();
    const projectTasks = allTasks.filter(
      (task) => task.projectId === this.options.config.projectId,
    );

    return {
      lastSyncTime: this.lastSyncTime,
      taskCount: projectTasks.length,
      isWatching: this.isWatching,
    };
  }
}
