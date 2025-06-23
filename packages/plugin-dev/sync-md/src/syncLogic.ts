import { Task, MarkdownTask, SyncDirection, SyncResult, SyncConflict } from './types';

/**
 * Bidirectional Sync Logic for Markdown <-> SuperProductivity
 *
 * This module handles the complex task of syncing between a markdown file
 * and SuperProductivity project tasks, supporting bidirectional sync with
 * conflict detection and resolution.
 */

export interface SyncState {
  lastSyncTime: Date | null;
  fileChecksum: string | null;
  taskChecksums: Map<string, string>;
}

export class BidirectionalSync {
  private syncState: SyncState = {
    lastSyncTime: null,
    fileChecksum: null,
    taskChecksums: new Map(),
  };

  /**
   * Main sync function that orchestrates the bidirectional sync process
   */
  async sync(
    markdownContent: string,
    projectTasks: Task[],
    syncDirection: SyncDirection,
    lastSyncState?: SyncState,
  ): Promise<SyncResult> {
    // Restore previous sync state if available
    if (lastSyncState) {
      this.syncState = lastSyncState;
    }

    const result: SyncResult = {
      tasksAdded: 0,
      tasksUpdated: 0,
      tasksDeleted: 0,
      conflicts: [],
    };

    // Parse markdown into structured tasks
    const markdownTasks = this.parseMarkdown(markdownContent);

    // Create lookup maps for efficient comparison
    const mdTaskMap = this.createMarkdownTaskMap(markdownTasks);
    const projectTaskMap = this.createProjectTaskMap(projectTasks);

    // Detect changes and conflicts based on sync direction
    if (syncDirection === 'fileToProject') {
      return this.syncFileToProject(mdTaskMap, projectTaskMap);
    } else if (syncDirection === 'projectToFile') {
      return this.syncProjectToFile(mdTaskMap, projectTaskMap);
    } else {
      // Bidirectional sync - most complex case
      return this.syncBidirectional(mdTaskMap, projectTaskMap, markdownContent);
    }
  }

  /**
   * Parse markdown content into structured task hierarchy
   */
  private parseMarkdown(content: string): MarkdownTask[] {
    const lines = content.split('\n');
    const tasks: MarkdownTask[] = [];
    const stack: { task: MarkdownTask; level: number }[] = [];

    lines.forEach((line, lineNumber) => {
      // Calculate indentation level
      const indentMatch = line.match(/^(\s*)/);
      const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0;

      // Match checkbox or bullet format
      const checkboxMatch = line.trim().match(/^[-*]\s*\[([ x])\]\s*(.+)$/);
      const bulletMatch = !checkboxMatch ? line.trim().match(/^[-*]\s+(.+)$/) : null;

      if (checkboxMatch || bulletMatch) {
        const isDone = checkboxMatch ? checkboxMatch[1] === 'x' : false;
        const title = checkboxMatch ? checkboxMatch[2].trim() : bulletMatch![1].trim();

        const task: MarkdownTask = {
          title,
          isDone,
          lineNumber: lineNumber + 1,
          indentLevel,
          subTasks: [],
        };

        // Find parent based on indentation
        while (stack.length > 0 && stack[stack.length - 1].level >= indentLevel) {
          stack.pop();
        }

        if (stack.length === 0) {
          // Root level task
          tasks.push(task);
        } else {
          // Subtask
          stack[stack.length - 1].task.subTasks.push(task);
        }

        stack.push({ task, level: indentLevel });
      }
    });

    return tasks;
  }

  /**
   * Sync from file to project (one-way)
   */
  private syncFileToProject(
    mdTaskMap: Map<string, MarkdownTask>,
    projectTaskMap: Map<string, Task>,
  ): SyncResult {
    const result: SyncResult = {
      tasksAdded: 0,
      tasksUpdated: 0,
      tasksDeleted: 0,
      conflicts: [],
    };

    // Add or update tasks from markdown
    mdTaskMap.forEach((mdTask, key) => {
      const projectTask = projectTaskMap.get(key);

      if (!projectTask) {
        // Task exists in markdown but not in project - add it
        result.tasksAdded++;
      } else if (this.hasTaskChanged(mdTask, projectTask)) {
        // Task exists in both but has changed - update it
        result.tasksUpdated++;
      }
    });

    // Mark tasks for deletion that exist in project but not in markdown
    projectTaskMap.forEach((projectTask, key) => {
      if (!mdTaskMap.has(key)) {
        result.tasksDeleted++;
      }
    });

    return result;
  }

  /**
   * Sync from project to file (one-way)
   */
  private syncProjectToFile(
    mdTaskMap: Map<string, MarkdownTask>,
    projectTaskMap: Map<string, Task>,
  ): SyncResult {
    const result: SyncResult = {
      tasksAdded: 0,
      tasksUpdated: 0,
      tasksDeleted: 0,
      conflicts: [],
    };

    // Add or update tasks from project
    projectTaskMap.forEach((projectTask, key) => {
      const mdTask = mdTaskMap.get(key);

      if (!mdTask) {
        // Task exists in project but not in markdown - add it
        result.tasksAdded++;
      } else if (this.hasTaskChanged(mdTask, projectTask)) {
        // Task exists in both but has changed - update it
        result.tasksUpdated++;
      }
    });

    // Remove tasks that exist in markdown but not in project
    mdTaskMap.forEach((mdTask, key) => {
      if (!projectTaskMap.has(key)) {
        result.tasksDeleted++;
      }
    });

    return result;
  }

  /**
   * Bidirectional sync with conflict detection
   */
  private syncBidirectional(
    mdTaskMap: Map<string, MarkdownTask>,
    projectTaskMap: Map<string, Task>,
    markdownContent: string,
  ): SyncResult {
    const result: SyncResult = {
      tasksAdded: 0,
      tasksUpdated: 0,
      tasksDeleted: 0,
      conflicts: [],
    };

    const currentFileChecksum = this.calculateChecksum(markdownContent);
    const fileChanged = currentFileChecksum !== this.syncState.fileChecksum;

    // Check each task for changes and conflicts
    const allKeys = new Set([...mdTaskMap.keys(), ...projectTaskMap.keys()]);

    allKeys.forEach((key) => {
      const mdTask = mdTaskMap.get(key);
      const projectTask = projectTaskMap.get(key);
      const lastChecksum = this.syncState.taskChecksums.get(key);

      if (mdTask && projectTask) {
        // Task exists in both places
        const mdChecksum = this.calculateTaskChecksum(mdTask);
        const projectChecksum = this.calculateTaskChecksum(projectTask);

        if (mdChecksum !== projectChecksum) {
          // Tasks are different
          if (lastChecksum) {
            // We have sync history
            const mdChanged = mdChecksum !== lastChecksum;
            const projectChanged = projectChecksum !== lastChecksum;

            if (mdChanged && projectChanged) {
              // Both changed - conflict!
              result.conflicts.push({
                taskId: projectTask.id,
                taskTitle: projectTask.title,
                fileValue: mdTask,
                projectValue: projectTask,
              });
            } else if (mdChanged) {
              // Only markdown changed - update project
              result.tasksUpdated++;
            } else if (projectChanged) {
              // Only project changed - update markdown
              result.tasksUpdated++;
            }
          } else {
            // No sync history - treat as conflict to be safe
            result.conflicts.push({
              taskId: projectTask.id,
              taskTitle: projectTask.title,
              fileValue: mdTask,
              projectValue: projectTask,
            });
          }
        }
      } else if (mdTask && !projectTask) {
        // Task only in markdown
        if (fileChanged) {
          // File changed, so this is a new task
          result.tasksAdded++;
        } else {
          // File didn't change, so task was deleted from project
          result.tasksDeleted++;
        }
      } else if (!mdTask && projectTask) {
        // Task only in project
        if (this.syncState.taskChecksums.has(key)) {
          // Task was previously synced, so it was deleted from markdown
          result.tasksDeleted++;
        } else {
          // New task in project
          result.tasksAdded++;
        }
      }
    });

    return result;
  }

  /**
   * Create a map of markdown tasks for efficient lookup
   */
  private createMarkdownTaskMap(tasks: MarkdownTask[]): Map<string, MarkdownTask> {
    const map = new Map<string, MarkdownTask>();

    const addToMap = (task: MarkdownTask, parentKey = '') => {
      const key = this.generateTaskKey(task.title, parentKey);
      map.set(key, task);

      // Recursively add subtasks
      task.subTasks.forEach((subTask) => {
        addToMap(subTask, key);
      });
    };

    tasks.forEach((task) => addToMap(task));
    return map;
  }

  /**
   * Create a map of project tasks for efficient lookup
   */
  private createProjectTaskMap(tasks: Task[]): Map<string, Task> {
    const map = new Map<string, Task>();

    // First, create a map of all tasks by ID
    const taskById = new Map<string, Task>();
    tasks.forEach((task) => taskById.set(task.id, task));

    // Then create the lookup map with consistent keys
    const addToMap = (task: Task, parentKey = '') => {
      const key = this.generateTaskKey(task.title, parentKey);
      map.set(key, task);

      // Process subtasks if they exist
      if (task.subTaskIds && task.subTaskIds.length > 0) {
        task.subTaskIds.forEach((subTaskId) => {
          const subTask = taskById.get(subTaskId);
          if (subTask) {
            addToMap(subTask, key);
          }
        });
      }
    };

    // Add only root tasks (no parentId)
    tasks.filter((task) => !task.parentId).forEach((task) => addToMap(task));
    return map;
  }

  /**
   * Generate a consistent key for task identification
   */
  private generateTaskKey(title: string, parentKey: string): string {
    const normalizedTitle = title.toLowerCase().trim().replace(/\s+/g, ' ');
    return parentKey ? `${parentKey}::${normalizedTitle}` : normalizedTitle;
  }

  /**
   * Check if a task has changed between markdown and project representations
   */
  private hasTaskChanged(mdTask: MarkdownTask, projectTask: Task): boolean {
    return mdTask.title !== projectTask.title || mdTask.isDone !== projectTask.isDone;
  }

  /**
   * Calculate checksum for a task (for change detection)
   */
  private calculateTaskChecksum(task: MarkdownTask | Task): string {
    const content = `${task.title}|${task.isDone}`;
    return this.simpleHash(content);
  }

  /**
   * Calculate checksum for entire file content
   */
  private calculateChecksum(content: string): string {
    return this.simpleHash(content);
  }

  /**
   * Simple hash function for checksums
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Update sync state after successful sync
   */
  updateSyncState(markdownContent: string, tasks: Task[]): SyncState {
    this.syncState.lastSyncTime = new Date();
    this.syncState.fileChecksum = this.calculateChecksum(markdownContent);
    this.syncState.taskChecksums.clear();

    // Update task checksums
    const projectTaskMap = this.createProjectTaskMap(tasks);
    projectTaskMap.forEach((task, key) => {
      this.syncState.taskChecksums.set(key, this.calculateTaskChecksum(task));
    });

    return this.syncState;
  }

  /**
   * Get current sync state
   */
  getSyncState(): SyncState {
    return this.syncState;
  }
}
