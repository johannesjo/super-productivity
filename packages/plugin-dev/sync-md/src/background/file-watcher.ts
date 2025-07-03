import { SyncConfig } from '../shared/types';
import { generateTaskId, ParsedTask, parseMarkdownTasks } from './markdown-parser';
import { Debouncer } from './helper/debouncer';
import { PluginFileOperations } from './helper/file-operations';
import { FileOperations } from './helper/file-operations';

// Types are now imported from utils

export interface FileWatcherOptions {
  config: SyncConfig;
  onSync?: (result: any) => void;
  onError?: (error: Error) => void;
}

// ParsedTask is now imported from utils

export class FileWatcherBatch {
  private fileWatchHandle: any = null;
  private lastFileContent: string | null = null;
  private lastSyncTime: number = 0;
  private isWatching: boolean = false;
  private syncInProgress: boolean = false;
  private debouncer = new Debouncer();
  private fileOps: FileOperations;
  private pendingIdUpdates: Array<{
    tempId: string;
    actualId: string;
    mdId: string;
    line: number;
    task: any;
  }> = [];
  private tempIdCounter = 0;
  private pendingWriteTimer: any = null;

  constructor(
    private options: FileWatcherOptions,
    fileOps?: FileOperations,
  ) {
    // Use injected file operations or default to plugin-based ones
    this.fileOps = fileOps || new PluginFileOperations(PluginAPI);

    // Set up window focus listener to trigger immediate sync
    if (typeof PluginAPI !== 'undefined' && PluginAPI?.onWindowFocusChange) {
      PluginAPI.onWindowFocusChange((isFocused: boolean) => {
        if (isFocused) {
          console.log('🎯 App focused - checking for pending file changes in 2 seconds');
          // Wait 2 seconds to allow file change detection to catch up
          setTimeout(() => {
            if (this.debouncer.isPending('fileChange')) {
              console.log('📋 Found pending file sync - executing immediately');
              // Cancel the existing debounce and execute immediately
              this.debouncer.cancel('fileChange');
              this.performSync(undefined, undefined, 'file').catch((error) => {
                console.error('Error in focus-triggered file sync:', error);
                if (this.options.onError) {
                  this.options.onError(error as Error);
                }
              });
            } else {
              console.log('📋 No pending file sync found');
            }
          }, 2000);
        } else {
          // App lost focus - immediately write any pending markdown changes
          console.log('👋 App lost focus - checking for pending markdown writes');
          if (this.pendingWriteTimer) {
            console.log('📝 Found pending markdown write - executing immediately');
            clearTimeout(this.pendingWriteTimer);
            this.pendingWriteTimer = null;
            // Execute the pending write immediately
            this.executePendingWrite();
          }
        }
      });
    }
  }

  private generateTempId(): string {
    return `temp_${this.tempIdCounter++}`;
  }

  private generateTaskId(): string {
    // No longer generating custom IDs - using SP task IDs directly
    throw new Error('generateTaskId should not be called - use SP task IDs directly');
  }

  private parseMarkdownTasks(content: string): ParsedTask[] {
    const result = parseMarkdownTasks(content);

    // Log any parsing errors
    if (result.errors.length > 0) {
      console.warn('Markdown parsing errors:', result.errors);
    }

    return result.tasks;
  }

  async start(skipInitialSync: boolean = false): Promise<void> {
    if (this.isWatching) {
      console.log('File watcher already running');
      return;
    }

    this.isWatching = true;
    console.log('🚀 FileWatcherBatch: Starting with batch API support');
    console.log('📁 File path:', this.options.config.filePath);
    console.log('🎯 Project ID:', this.options.config.projectId);
    console.log('↔️ Sync direction:', this.options.config.syncDirection);

    // Log sync direction
    console.log('📋 Starting with sync direction:', this.options.config.syncDirection);

    // Check if we're in desktop mode before attempting any file operations
    if (typeof PluginAPI?.executeNodeScript !== 'function') {
      console.warn('⚠️ Sync-MD plugin requires desktop mode for file operations');
      PluginAPI.showSnack({
        msg: 'Sync-MD requires the desktop version of Super Productivity',
        type: 'ERROR',
      });
      this.isWatching = false;
      return;
    }

    // If skipInitialSync is false, perform initial sync
    if (!skipInitialSync) {
      console.log('📋 Performing initial sync...');
      await this.performSync();
    } else {
      console.log('📋 Sync configured. Ready to sync when triggered.');
      PluginAPI.showSnack({
        msg: 'Sync-MD ready. Click "Sync Now" to start syncing',
        type: 'INFO',
      });
    }
  }

  stop(): void {
    if (this.fileWatchHandle) {
      this.stopFileWatching();
    }
    this.debouncer.cancelAll();
    this.pendingIdUpdates = [];
    this.isWatching = false;
    console.log('File watcher stopped');
  }

  private async startFileWatching(): Promise<void> {
    // Check if we're in desktop mode first
    if (typeof PluginAPI?.executeNodeScript !== 'function') {
      console.warn(
        '⚠️ File watching not available - Node.js execution not supported in web mode',
      );
      return;
    }

    try {
      const result = await PluginAPI.executeNodeScript({
        script: `
          const fs = require('fs');
          const path = require('path');

          try {
            const absolutePath = path.resolve(args[0]);

            // Check if file exists
            if (!fs.existsSync(absolutePath)) {
              return { success: false, error: 'File not found' };
            }

            // Just check if file exists, actual watching will be done by polling
            const stats = fs.statSync(absolutePath);
            return {
              success: true,
              mtime: stats.mtime.getTime()
            };
          } catch (error) {
            return { success: false, error: error.message };
          }
        `,
        args: [this.options.config.filePath],
        timeout: 5000,
      });

      if (!result.success || !result.result?.success) {
        console.warn('Failed to set up file watching, falling back to manual checks');
        return;
      }

      console.log('📁 File system watching enabled for:', this.options.config.filePath);

      // Store the last modification time
      let lastModTime = 0;

      // Poll for file changes by checking modification time
      this.fileWatchHandle = setInterval(async () => {
        try {
          const checkResult = await PluginAPI.executeNodeScript({
            script: `
              const fs = require('fs');
              const path = require('path');

              try {
                const absolutePath = path.resolve(args[0]);

                if (!fs.existsSync(absolutePath)) {
                  return { success: false, error: 'File not found' };
                }

                const stats = fs.statSync(absolutePath);
                return {
                  success: true,
                  mtime: stats.mtime.getTime()
                };
              } catch (error) {
                return { success: false, error: error.message };
              }
            `,
            args: [this.options.config.filePath],
            timeout: 2000,
          });

          if (checkResult.success && checkResult.result?.success) {
            const currentModTime = checkResult.result.mtime;

            // Check if file was modified
            if (lastModTime > 0 && currentModTime > lastModTime) {
              console.log('📝 File modification detected');
              this.debouncedFileChange();
            }

            lastModTime = currentModTime;
          }
        } catch (error) {
          console.warn('Error checking file modification:', error);
        }
      }, 2000); // Check every 2 seconds
    } catch (error) {
      console.error('Error setting up file watching:', error);

      // Check if it's a permission error
      if (
        error &&
        (error as any).message &&
        (error as any).message.includes('permission')
      ) {
        console.error(
          '⚠️ Permission error detected. The plugin needs permission to execute Node.js scripts.',
        );
        console.error(
          '⚠️ Please ensure you are running the desktop version of Super Productivity.',
        );

        PluginAPI.showSnack({
          msg: 'File watching requires the desktop version of Super Productivity with Node.js permissions',
          type: 'ERROR',
        });
      }
    }
  }

  private stopFileWatching(): void {
    if (this.fileWatchHandle) {
      clearInterval(this.fileWatchHandle);
      this.fileWatchHandle = null;
      console.log('📁 File watching stopped');
    }
  }

  private debouncedFileChange(): void {
    console.log('📄 File changed - waiting 10 seconds before sync (debounced)');

    this.debouncer.debounce(
      'fileChange',
      async () => {
        try {
          console.log('🔄 Starting sync after 10-second debounce');
          await this.performSync(undefined, undefined, 'file');
        } catch (error) {
          console.error('Error in file change sync:', error);
          if (this.options.onError) {
            this.options.onError(error as Error);
          }
        }
      },
      10000, // 10 second debounce
    );
  }

  private scheduleDelayedIdWriting(): void {
    if (this.debouncer.isPending('idWriting')) {
      console.log('⏰ Resetting ID writing timer (10 seconds from now)');
    } else {
      console.log('⏰ Scheduling ID writing in 10 seconds');
    }

    this.debouncer.debounce(
      'idWriting',
      async () => {
        try {
          await this.performDelayedIdWriting();
        } catch (error) {
          console.error('Error in delayed ID writing:', error);
        }
      },
      10000, // 10 second delay for ID writing
    );
  }

  private async performDelayedIdWriting(): Promise<void> {
    if (this.pendingIdUpdates.length === 0) {
      return;
    }

    console.log(
      `📝 Writing ${this.pendingIdUpdates.length} pending task IDs to markdown (after 10s delay)`,
    );

    try {
      // Check if file was modified during the delay (indicating active editing)
      const currentContent = await this.readFile();
      const currentLines = currentContent.split('\n');

      // Track if we made any changes
      let hasChanges = false;

      // Apply all pending ID updates
      for (const update of this.pendingIdUpdates) {
        if (update.line < currentLines.length) {
          const currentLine = currentLines[update.line];

          // Only update if the line still looks like a task and doesn't already have an ID
          if (
            currentLine.match(/^\s*- \[([ x])\]\s*[^<]*$/) &&
            !currentLine.includes('<!-- sp:')
          ) {
            const indent = ' '.repeat(update.task.indent);
            const check = update.task.completed ? 'x' : ' ';
            currentLines[update.line] =
              `${indent}- [${check}] <!-- sp:${update.mdId} --> ${update.task.title}`;
            hasChanges = true;
          }
        }
      }

      // Write back only if we made changes
      if (hasChanges) {
        const newContent = currentLines.join('\n');
        await this.writeFile(newContent);
        this.lastFileContent = newContent;
        console.log('✅ Successfully wrote task IDs to markdown');
      } else {
        console.log(
          '⏭️ Skipped ID writing - tasks already have IDs or file structure changed',
        );
      }

      // Clear pending updates
      this.pendingIdUpdates = [];
    } catch (error) {
      console.error('Failed to write task IDs:', error);
      // Retry in another 10 seconds
      this.scheduleDelayedIdWriting();
    }
  }

  /**
   * Manually trigger immediate ID writing (useful for debugging or manual triggers)
   */
  async forceIdWriting(): Promise<void> {
    this.debouncer.cancel('idWriting');
    await this.performDelayedIdWriting();
  }

  private async readFile(): Promise<string> {
    return await this.fileOps.readFile(this.options.config.filePath);
  }

  private async writeFile(content: string): Promise<void> {
    return await this.fileOps.writeFile(this.options.config.filePath, content);
  }

  async performSync(
    taskState?: any,
    projectState?: any,
    syncSource?: 'file' | 'sp' | 'manual',
  ): Promise<void> {
    if (this.syncInProgress) return;

    this.syncInProgress = true;
    this.lastSyncTime = Date.now();

    try {
      console.log('\n🔄 === BATCH SYNC START ===');
      console.log(`📌 Sync triggered by: ${syncSource || 'unknown'}`);

      // Read current file content
      const fileContent = await this.readFile();
      this.lastFileContent = fileContent;

      // Parse markdown tasks
      const mdTasks = this.parseMarkdownTasks(fileContent);

      // Get SuperProductivity tasks for the project
      const spTasks =
        taskState && projectState
          ? this.getTasksFromState(taskState, projectState)
          : await this.getSuperProductivityTasks();

      console.log(`📄 Markdown tasks: ${mdTasks.length}`);
      console.log(`🏢 SP tasks: ${spTasks.length}`);

      // Perform sync based on direction
      if (this.options.config.syncDirection === 'projectToFile') {
        await this.syncProjectToFile(mdTasks, spTasks, syncSource);
      } else if (this.options.config.syncDirection === 'fileToProject') {
        await this.syncFileToProjectBatch(mdTasks, spTasks, syncSource);
      } else if (this.options.config.syncDirection === 'bidirectional') {
        // For bidirectional sync, sync direction depends on what triggered it
        if (syncSource === 'file') {
          // File changed, sync to SP
          console.log('🔄 Bidirectional: File changed, syncing to SP');
          await this.syncFileToProjectBatch(mdTasks, spTasks, syncSource);
        } else if (syncSource === 'sp') {
          // SP changed, sync to file
          console.log('🔄 Bidirectional: SP changed, syncing to file');
          await this.syncProjectToFile(mdTasks, spTasks, syncSource);
        } else {
          // Manual sync or unknown source - do file to project first
          console.log('🔄 Bidirectional: Manual sync, file → SP');
          await this.syncFileToProjectBatch(mdTasks, spTasks, syncSource);
        }
      }

      console.log('✅ === BATCH SYNC COMPLETE ===\n');

      // If this is the first successful sync and file watching is needed,
      // start it now (after permission has been granted)
      if (
        !this.fileWatchHandle &&
        (this.options.config.syncDirection === 'fileToProject' ||
          this.options.config.syncDirection === 'bidirectional')
      ) {
        console.log('📁 Starting file watching after successful sync...');
        await this.startFileWatching();
      }

      if (this.options.onSync) {
        this.options.onSync({ success: true, taskCount: mdTasks.length });
      }
    } catch (error) {
      console.error('Sync error:', error);

      if (this.options.onError) {
        this.options.onError(error as Error);
      }

      PluginAPI.showSnack({
        msg: 'Sync failed: ' + (error as Error).message,
        type: 'ERROR',
      });
    } finally {
      this.syncInProgress = false;
    }
  }

  private getTasksFromState(taskState: any, projectState: any): any[] {
    const project = projectState.entities[this.options.config.projectId];

    if (!project) {
      throw new Error('Project not found');
    }

    // Get all tasks (including subtasks) that belong to this project
    const projectTasks: any[] = [];
    const allTasks = Object.values(taskState.entities) as any[];
    const taskMap = new Map(allTasks.map((t: any) => [t.id, t]));

    // Helper function to collect task and all its subtasks
    const collectTaskAndSubtasks = (task: any) => {
      projectTasks.push(task);
      if (task.subTaskIds && task.subTaskIds.length > 0) {
        for (const subTaskId of task.subTaskIds) {
          const subTask = taskMap.get(subTaskId);
          if (subTask) {
            collectTaskAndSubtasks(subTask);
          }
        }
      }
    };

    // Start with project's top-level tasks
    if (project.taskIds) {
      for (const taskId of project.taskIds) {
        const task = taskState.entities[taskId];
        if (task && !task.parentId) {
          collectTaskAndSubtasks(task);
        }
      }
    }

    return projectTasks;
  }

  private async getSuperProductivityTasks(): Promise<any[]> {
    const allTasks = await PluginAPI.getTasks();
    const project = (await PluginAPI.getAllProjects()).find(
      (p: any) => p.id === this.options.config.projectId,
    );

    if (!project) {
      throw new Error('Project not found');
    }

    // Get all tasks (including subtasks) that belong to this project
    const projectTasks: any[] = [];
    const taskMap = new Map(allTasks.map((t: any) => [t.id, t]));

    // Helper function to collect task and all its subtasks
    const collectTaskAndSubtasks = (task: any) => {
      projectTasks.push(task);
      if (task.subTaskIds && task.subTaskIds.length > 0) {
        for (const subTaskId of task.subTaskIds) {
          const subTask = taskMap.get(subTaskId);
          if (subTask) {
            collectTaskAndSubtasks(subTask);
          }
        }
      }
    };

    // Start with project's top-level tasks
    if (project.taskIds) {
      for (const taskId of project.taskIds) {
        const task = allTasks.find((t: any) => t.id === taskId);
        if (task && !task.parentId) {
          collectTaskAndSubtasks(task);
        }
      }
    }

    return projectTasks;
  }

  private async syncProjectToFile(
    mdTasks: ParsedTask[],
    spTasks: any[],
    syncSource?: 'file' | 'sp' | 'manual',
  ): Promise<void> {
    console.log('📤 Syncing: SuperProductivity → Markdown');

    // Simply rewrite the markdown file to exactly match SP
    const lines: string[] = [];
    const usedIds = new Set<string>();

    const addTaskToMarkdown = (task: any, indent: number = 0) => {
      const check = task.isDone ? 'x' : ' ';
      const indentStr = ' '.repeat(indent);

      // Use SP task ID directly
      const spId = task.id;

      // Check if ID is already used (duplicate)
      if (usedIds.has(spId)) {
        console.warn(
          `⚠️ Duplicate SP ID detected: ${spId} for task "${task.title}". This should not happen.`,
        );
      }

      usedIds.add(spId);
      lines.push(`${indentStr}- [${check}] <!-- sp:${spId} --> ${task.title}`);

      // Add subtasks
      if (task.subTaskIds && task.subTaskIds.length > 0) {
        for (const subTaskId of task.subTaskIds) {
          const subTask = spTasks.find((t: any) => t.id === subTaskId);
          if (subTask) {
            addTaskToMarkdown(subTask, indent + 2);
          }
        }
      } else if (task.notes && task.notes.trim()) {
        // Add notes content for leaf tasks (tasks without subtasks)
        const noteLines = task.notes.split('\n');
        noteLines.forEach((noteLine: string) => {
          // Check if this line is a checklist item
          const checklistMatch = noteLine.match(/^(\s*)- \[([ x])\]/);
          if (checklistMatch) {
            const currentIndent = checklistMatch[1].length;
            if (currentIndent < 4) {
              // Ensure minimum 4 spaces for checklist items to prevent them being parsed as tasks
              const additionalSpaces = ' '.repeat(4 - currentIndent);
              lines.push(additionalSpaces + noteLine);
            } else {
              // Already has enough indentation
              lines.push(noteLine);
            }
          } else {
            // Not a checklist item, write as-is
            lines.push(noteLine);
          }
        });
      }
    };

    // Get project to preserve task order
    const project = (await PluginAPI.getAllProjects()).find(
      (p: any) => p.id === this.options.config.projectId,
    );

    // Add root tasks in the order defined by the project
    if (project && project.taskIds) {
      console.log(`📝 Writing tasks in project order`);

      // Create a map for quick lookup
      const taskMap = new Map(spTasks.map((t) => [t.id, t]));

      // Add tasks in project order
      for (const taskId of project.taskIds) {
        const task = taskMap.get(taskId);
        if (task && !task.parentId) {
          addTaskToMarkdown(task);
        }
      }

      // Add any root tasks that aren't in the project order (shouldn't happen, but just in case)
      const addedIds = new Set(project.taskIds);
      const orphanedRootTasks = spTasks.filter(
        (t: any) => !t.parentId && !addedIds.has(t.id),
      );
      if (orphanedRootTasks.length > 0) {
        console.warn(
          `⚠️ Found ${orphanedRootTasks.length} root tasks not in project order`,
        );
        for (const task of orphanedRootTasks) {
          addTaskToMarkdown(task);
        }
      }
    } else {
      // Fallback if no project order available
      const rootTasks = spTasks.filter((t: any) => !t.parentId);
      console.log(
        `📝 Writing ${rootTasks.length} root tasks to markdown (no project order)`,
      );
      for (const task of rootTasks) {
        addTaskToMarkdown(task);
      }
    }

    // Check if content has actually changed
    const newContent = lines.join('\n');
    const currentContent = await this.readFile();

    if (currentContent === newContent) {
      console.log('📋 No changes detected, skipping markdown write');
      return;
    }

    console.log(
      `📋 Queueing markdown update with ${lines.length} lines (projectToFile sync)`,
    );

    // Store the write operation for potential immediate execution
    this.storePendingWrite(newContent, currentContent, lines.length);

    // For projectToFile sync, we write after a short delay to avoid conflicts
    this.pendingWriteTimer = setTimeout(async () => {
      try {
        // Double-check content hasn't changed during the delay
        const latestContent = await this.readFile();
        if (latestContent !== currentContent) {
          console.log(
            '📋 File was modified during delay, skipping write to avoid conflicts',
          );
          return;
        }

        await this.writeFile(newContent);
        this.lastFileContent = newContent;
        console.log(`✅ Wrote ${lines.length} total lines to markdown`);

        // Show user feedback
        PluginAPI.showSnack({
          msg: `Markdown sync: Updated ${lines.length} task${lines.length !== 1 ? 's' : ''}`,
          type: 'SUCCESS',
        });
      } catch (error) {
        console.error('Error writing projectToFile content:', error);
        PluginAPI.showSnack({
          msg: 'Failed to write tasks to markdown file',
          type: 'ERROR',
        });
      }
      this.pendingWriteTimer = null;
    }, 2000); // Shorter delay for complete rewrites (2 seconds)
  }

  private pendingWriteData: {
    newContent: string;
    currentContent: string;
    lineCount: number;
  } | null = null;

  private storePendingWrite(
    newContent: string,
    currentContent: string,
    lineCount: number,
  ): void {
    this.pendingWriteData = { newContent, currentContent, lineCount };
  }

  private async executePendingWrite(): Promise<void> {
    if (!this.pendingWriteData) {
      console.log('📋 No pending write data to execute');
      return;
    }

    const { newContent, currentContent, lineCount } = this.pendingWriteData;
    this.pendingWriteData = null;

    try {
      // Double-check content hasn't changed
      const latestContent = await this.readFile();
      if (latestContent !== currentContent) {
        console.log(
          '📋 File was modified since write was queued, skipping write to avoid conflicts',
        );
        return;
      }

      await this.writeFile(newContent);
      this.lastFileContent = newContent;
      console.log(
        `✅ Wrote ${lineCount} total lines to markdown (immediate on focus loss)`,
      );

      // Show user feedback
      PluginAPI.showSnack({
        msg: `Markdown sync: Updated ${lineCount} task${lineCount !== 1 ? 's' : ''}`,
        type: 'SUCCESS',
      });
    } catch (error) {
      console.error('Error writing immediate projectToFile content:', error);
      PluginAPI.showSnack({
        msg: 'Failed to write tasks to markdown file',
        type: 'ERROR',
      });
    }
  }

  private async syncFileToProjectBatch(
    mdTasks: ParsedTask[],
    spTasks: any[],
    syncSource?: 'file' | 'sp' | 'manual',
  ): Promise<void> {
    console.log('📥 Syncing: Markdown → SuperProductivity (BATCH MODE v2.1)');

    // Build a map of SP tasks by their IDs
    const spById = new Map<string, any>();

    spTasks.forEach((task) => {
      spById.set(task.id, task);

      // Clean up any remaining IDs in notes field
      if (task.notes && task.notes.includes('<!-- sp:')) {
        console.log(`🧹 Cleaning up notes for task "${task.title}"`);
        PluginAPI.updateTask(task.id, { notes: '' });
      }
    });

    // Build operations for batch update
    const operations: any[] = [];
    const tempIdMap = new Map<string, string>(); // Map markdown IDs to temp IDs for new tasks
    const taskLineToTempId = new Map<number, string>(); // Map line numbers to temp IDs for new tasks
    const mdIdToLine = new Map<string, number>(); // Track which line each task is on
    let orphanedMarkdownIdCount = 0; // Track orphaned markdown IDs
    const duplicateIds = new Set<string>(); // Track duplicate IDs we've seen
    const firstOccurrence = new Map<string, number>(); // Track first occurrence of each ID

    // Log all SP tasks and their parent relationships
    console.log('📋 Current SP tasks:');
    spTasks.forEach((task) => {
      console.log(`  - "${task.title}" (${task.id}): parentId=${task.parentId}`);
    });

    // First pass: detect duplicate IDs using originalId
    mdTasks.forEach((mdTask) => {
      const checkId = mdTask.originalId || mdTask.id;
      if (checkId) {
        if (firstOccurrence.has(checkId)) {
          duplicateIds.add(checkId);
          console.warn(
            `⚠️ Duplicate ID "${checkId}" found at line ${mdTask.line + 1} (first seen at line ${firstOccurrence.get(checkId)! + 1})`,
          );
        } else {
          firstOccurrence.set(checkId, mdTask.line);
        }
      }
    });

    // Show warning about duplicate IDs
    if (duplicateIds.size > 0) {
      const duplicateList = Array.from(duplicateIds).join(', ');
      PluginAPI.showSnack({
        msg: `Found duplicate task IDs: ${duplicateList}. These tasks will be treated as new tasks.`,
        type: 'WARNING',
      });
    }

    // Second pass: create/update operations
    mdTasks.forEach((mdTask) => {
      mdIdToLine.set(mdTask.id || `line-${mdTask.line}`, mdTask.line);

      console.log(
        `📝 Processing MD task "${mdTask.title}" (${mdTask.id || 'no-id'}): ` +
          `indent=${mdTask.indent}, parentId=${mdTask.parentId}, isSubtask=${mdTask.isSubtask}`,
      );

      // Treat tasks with duplicate IDs as if they have no ID (except the first occurrence)
      const checkId = mdTask.originalId || mdTask.id;
      const effectiveId =
        checkId &&
        (!duplicateIds.has(checkId) || firstOccurrence.get(checkId) === mdTask.line)
          ? mdTask.id
          : null;

      if (effectiveId) {
        const spTask = spById.get(effectiveId);

        if (spTask) {
          console.log(
            `📍 Found SP task "${spTask.title}" (${spTask.id}): ` +
              `SP parentId=${spTask.parentId}`,
          );

          // Task exists in SP - check if update needed
          const updates: any = {};
          if (spTask.title !== mdTask.title) {
            updates.title = mdTask.title;
          }
          if (spTask.isDone !== mdTask.completed) {
            updates.isDone = mdTask.completed;
          }

          // Sync notes from parsed noteLines
          if (mdTask.noteLines && mdTask.noteLines.length > 0) {
            const newNotes = mdTask.noteLines.join('\n');
            if (spTask.notes !== newNotes) {
              updates.notes = newNotes;
            }
          } else if (spTask.notes) {
            // Clear notes if no noteLines in markdown
            updates.notes = '';
          }

          // Check if parent-child relationship changed
          const currentMdParentId = mdTask.parentId || null;
          const currentSpParentId = spTask.parentId || null;

          // Map the markdown parent ID to SP parent ID
          let expectedSpParentId = null;
          if (currentMdParentId) {
            const parentSpTask = spById.get(currentMdParentId);
            if (parentSpTask) {
              expectedSpParentId = parentSpTask.id;
            }
          }

          // Check if parent changed
          if (currentSpParentId !== expectedSpParentId) {
            console.log(
              `🔄 Parent change detected for "${spTask.title}": ${currentSpParentId} → ${expectedSpParentId}`,
            );

            // Validate if task can change parent
            if (spTask.repeatCfgId || spTask.issueId) {
              // Task with repeatCfgId or issueId can only be a parent task
              if (expectedSpParentId !== null) {
                console.warn(
                  `⚠️ Cannot convert task "${spTask.title}" to subtask - it has ${
                    spTask.repeatCfgId ? 'repeatCfgId' : 'issueId'
                  }`,
                );
                PluginAPI.showSnack({
                  msg: `Cannot convert "${spTask.title}" to subtask - ${
                    spTask.repeatCfgId ? 'repeating tasks' : 'issue-linked tasks'
                  } must remain as parent tasks`,
                  type: 'WARNING',
                });
                // Skip this parent change
              } else {
                // Converting from subtask to parent is allowed
                updates.parentId = null;
              }
            } else {
              // No restrictions, update parent
              updates.parentId = expectedSpParentId;
            }
          }

          if (Object.keys(updates).length > 0) {
            operations.push({
              type: 'update',
              taskId: spTask.id,
              updates,
            });
          }
        } else {
          // Task has ID but doesn't exist in SP - this is an orphaned task
          console.warn(
            `⚠️ Found orphaned task with ID ${mdTask.id}: "${mdTask.title}" - converting to new task`,
          );

          // Count orphaned markdown IDs for summary message
          if (mdTask.id?.startsWith('md-')) {
            orphanedMarkdownIdCount++;
          }

          // Instead of skipping, create as a new task
          const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          taskLineToTempId.set(mdTask.line, tempId);
          tempIdMap.set(mdTask.id, tempId); // Track this orphaned task's temp ID

          // If this was a subtask, check if its parent still exists
          let newParentId = null;
          if (mdTask.parentId) {
            const parentSpTask = spById.get(mdTask.parentId);
            if (parentSpTask) {
              // Parent exists in SP, keep the relationship
              newParentId = parentSpTask.id;
            } else {
              // Parent doesn't exist in SP, check if it's being created as an orphaned task
              const parentTempId = tempIdMap.get(mdTask.parentId);
              if (parentTempId) {
                // Parent is also an orphaned task being created, use its temp ID
                newParentId = parentTempId;
                console.log(
                  `📋 Parent ${mdTask.parentId} is also orphaned, linking to temp ID ${parentTempId}`,
                );
              } else {
                // Parent doesn't exist and isn't being created, make this a root task
                console.log(
                  `📋 Parent ${mdTask.parentId} also missing and not in current batch, creating as root task`,
                );
                newParentId = null;
              }
            }
          }

          // If we still don't have a parent but this is a subtask, find by indentation
          if (!newParentId && mdTask.isSubtask) {
            for (let i = mdTasks.indexOf(mdTask) - 1; i >= 0; i--) {
              const potentialParent = mdTasks[i];
              if (potentialParent.indent < mdTask.indent) {
                // This is the parent based on indentation
                const parentTempId = taskLineToTempId.get(potentialParent.line);
                if (parentTempId) {
                  newParentId = parentTempId;
                  console.log(
                    `🔗 Orphaned subtask "${mdTask.title}" linked to parent via indentation (temp ID: ${parentTempId})`,
                  );
                  break;
                } else if (potentialParent.id) {
                  // Check if parent has a valid ID
                  const parentCheckId = potentialParent.originalId || potentialParent.id;
                  if (
                    !duplicateIds.has(parentCheckId) ||
                    firstOccurrence.get(parentCheckId) === potentialParent.line
                  ) {
                    newParentId = potentialParent.id;
                    console.log(
                      `🔗 Orphaned subtask "${mdTask.title}" linked to parent via indentation (ID: ${potentialParent.id})`,
                    );
                    break;
                  }
                }
              }
            }
          }

          const createData: any = {
            title: mdTask.title,
            isDone: mdTask.completed,
            parentId: newParentId,
          };

          // Add notes if present
          if (mdTask.noteLines && mdTask.noteLines.length > 0) {
            createData.notes = mdTask.noteLines.join('\n');
          }

          operations.push({
            type: 'create',
            tempId,
            data: createData,
          });
        }
      } else {
        // New task without ID (or duplicate ID)
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        taskLineToTempId.set(mdTask.line, tempId);

        // For duplicate IDs, also track by original ID for parent resolution
        const checkId = mdTask.originalId || mdTask.id;
        if (checkId && duplicateIds.has(checkId)) {
          // Store mapping from line to temp ID for duplicate resolution
          const lineKey = `${checkId}_line_${mdTask.line}`;
          tempIdMap.set(lineKey, tempId);
        }

        // Map parentId from markdown ID to SP task ID
        let mappedParentId = null;

        // For tasks with duplicate IDs, we need to find parent by indentation structure
        if (checkId && duplicateIds.has(checkId) && mdTask.isSubtask) {
          // Find parent by looking at previous tasks with lower indentation
          for (let i = mdTasks.indexOf(mdTask) - 1; i >= 0; i--) {
            const potentialParent = mdTasks[i];
            if (potentialParent.indent < mdTask.indent) {
              // This is the parent based on indentation
              const parentTempId = taskLineToTempId.get(potentialParent.line);
              if (parentTempId) {
                mappedParentId = parentTempId;
                console.log(
                  `🔗 Duplicate ID task "${mdTask.title}" linked to parent via indentation (temp ID: ${parentTempId})`,
                );
                break;
              } else if (potentialParent.id) {
                // Check if parent has a valid ID (not duplicate or is first occurrence)
                const parentCheckId = potentialParent.originalId || potentialParent.id;
                if (
                  !duplicateIds.has(parentCheckId) ||
                  firstOccurrence.get(parentCheckId) === potentialParent.line
                ) {
                  mappedParentId = potentialParent.id;
                  console.log(
                    `🔗 Duplicate ID task "${mdTask.title}" linked to parent via indentation (ID: ${potentialParent.id})`,
                  );
                  break;
                }
              }
            }
          }
        } else if (mdTask.parentId) {
          // Normal parent ID resolution for non-duplicate tasks
          const parentSpTask = spById.get(mdTask.parentId);
          if (parentSpTask) {
            mappedParentId = parentSpTask.id;
          } else {
            // Parent might be a new task - check tempIdMap
            const parentTempId = tempIdMap.get(mdTask.parentId);
            if (parentTempId) {
              mappedParentId = parentTempId;
            }
          }
        }

        // If we still don't have a parent but this is a subtask, find by indentation
        if (!mappedParentId && mdTask.isSubtask) {
          for (let i = mdTasks.indexOf(mdTask) - 1; i >= 0; i--) {
            const potentialParent = mdTasks[i];
            if (potentialParent.indent < mdTask.indent) {
              // This is the parent based on indentation
              const parentTempId = taskLineToTempId.get(potentialParent.line);
              if (parentTempId) {
                mappedParentId = parentTempId;
                console.log(
                  `🔗 Subtask "${mdTask.title}" linked to parent via indentation (temp ID: ${parentTempId})`,
                );
                break;
              } else if (potentialParent.id) {
                // Check if parent has a valid ID
                const parentCheckId = potentialParent.originalId || potentialParent.id;
                if (
                  !duplicateIds.has(parentCheckId) ||
                  firstOccurrence.get(parentCheckId) === potentialParent.line
                ) {
                  mappedParentId = potentialParent.id;
                  console.log(
                    `🔗 Subtask "${mdTask.title}" linked to parent via indentation (ID: ${potentialParent.id})`,
                  );
                  break;
                }
              }
            }
          }
        }

        const createData: any = {
          title: mdTask.title,
          isDone: mdTask.completed,
          parentId: mappedParentId,
        };

        // Add notes if present
        if (mdTask.noteLines && mdTask.noteLines.length > 0) {
          createData.notes = mdTask.noteLines.join('\n');
        }

        operations.push({
          type: 'create',
          tempId,
          data: createData,
        });
      }
    });

    // Check for tasks to delete (in SP but not in markdown)
    const mdIds = new Set(mdTasks.filter((t) => t.id).map((t) => t.id));
    spTasks.forEach((spTask) => {
      if (!mdIds.has(spTask.id)) {
        operations.push({
          type: 'delete',
          taskId: spTask.id,
        });
      }
    });

    // Add reorder operation to maintain markdown order
    const project = (await PluginAPI.getAllProjects()).find(
      (p: any) => p.id === this.options.config.projectId,
    );

    if (project && project.taskIds) {
      const newTaskOrder: string[] = [];
      const existingTaskIds = new Set<string>();

      // Build the new order based on markdown
      mdTasks.forEach((mdTask) => {
        if (!mdTask.isSubtask) {
          if (mdTask.id) {
            const spTask = spById.get(mdTask.id);
            if (spTask && !existingTaskIds.has(spTask.id)) {
              newTaskOrder.push(spTask.id);
              existingTaskIds.add(spTask.id);
            }
          }
          // Note: We don't include new tasks (temp IDs) in reorder operations
          // They will be added in their correct position when created
        }
      });

      // Only add reorder operation if the order actually changed
      const currentOrder = project.taskIds.filter((id: string) =>
        spTasks.some((t) => t.id === id && !t.parentId),
      );

      const orderChanged =
        currentOrder.length === newTaskOrder.length &&
        !currentOrder.every((id: string, index: number) => id === newTaskOrder[index]);

      if (orderChanged && newTaskOrder.length > 0) {
        console.log('📋 Task order changed, adding reorder operation');
        console.log('  Current order:', currentOrder);
        console.log('  New order:', newTaskOrder);

        operations.push({
          type: 'reorder',
          taskIds: newTaskOrder,
        });
      }
    }

    // Show warning about orphaned markdown IDs
    if (orphanedMarkdownIdCount > 0) {
      PluginAPI.showSnack({
        msg: `Found ${orphanedMarkdownIdCount} task${orphanedMarkdownIdCount > 1 ? 's' : ''} with old markdown IDs. Remove the <!-- sp:md-xxx --> comments from markdown to sync these tasks.`,
        type: 'WARNING',
      });
    }

    if (operations.length === 0) {
      console.log('📊 No changes needed');
      // Only show "up to date" message if this was a manual sync
      if (syncSource === 'manual' && orphanedMarkdownIdCount === 0) {
        PluginAPI.showSnack({
          msg: 'Markdown sync: Already up to date',
          type: 'INFO',
        });
      }
      return;
    }

    console.log(`📊 Executing ${operations.length} batch operations`);

    // Count operation types for user feedback
    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;
    let reorderCount = 0;

    operations.forEach((op) => {
      if (op.type === 'create') createdCount++;
      else if (op.type === 'update') updatedCount++;
      else if (op.type === 'delete') deletedCount++;
      else if (op.type === 'reorder') reorderCount++;
    });

    // Execute batch update
    try {
      const result: any = await (PluginAPI as any).batchUpdateForProject({
        projectId: this.options.config.projectId,
        operations,
      });

      if (result.success) {
        console.log('✅ Batch update successful');

        // Show user feedback
        const messages: string[] = [];
        if (createdCount > 0)
          messages.push(`${createdCount} task${createdCount > 1 ? 's' : ''} imported`);
        if (updatedCount > 0)
          messages.push(`${updatedCount} task${updatedCount > 1 ? 's' : ''} updated`);
        if (deletedCount > 0)
          messages.push(`${deletedCount} task${deletedCount > 1 ? 's' : ''} removed`);
        if (reorderCount > 0) messages.push(`task order updated`);

        if (messages.length > 0) {
          PluginAPI.showSnack({
            msg: `Markdown sync: ${messages.join(', ')}`,
            type: 'SUCCESS',
          });
        }

        // Queue ID updates for delayed writing (instead of immediate)
        if (Object.keys(result.createdTaskIds).length > 0) {
          console.log(
            `📋 Queueing ${Object.keys(result.createdTaskIds).length} task ID updates for delayed writing`,
          );

          // Add to pending updates instead of writing immediately
          for (const [tempId, actualId] of Object.entries(result.createdTaskIds)) {
            // Find the line number for this temp ID
            let line: number | undefined;
            for (const [lineNum, tid] of taskLineToTempId.entries()) {
              if (tid === tempId) {
                line = lineNum;
                break;
              }
            }

            if (line !== undefined) {
              const task = mdTasks.find((t) => t.line === line);
              if (task) {
                this.pendingIdUpdates.push({
                  tempId,
                  actualId: actualId as string,
                  mdId: actualId as string, // Use SP ID as markdown ID
                  line,
                  task: {
                    indent: task.indent,
                    completed: task.completed,
                    title: task.title,
                  },
                });
              }
            }
          }

          // Schedule delayed writing (this will reset if more updates come)
          this.scheduleDelayedIdWriting();
        }
      } else {
        console.error('❌ Batch update failed:', result.errors);
        PluginAPI.showSnack({
          msg: 'Batch sync failed: ' + (result.errors?.[0]?.message || 'Unknown error'),
          type: 'ERROR',
        });
      }
    } catch (error) {
      console.error('❌ Batch update error:', error);
      throw error;
    }
  }

  async getSyncInfo(): Promise<{
    isWatching: boolean;
    lastSyncTime: number;
    taskCount: number;
  }> {
    return {
      isWatching: this.isWatching,
      lastSyncTime: this.lastSyncTime,
      taskCount: 0,
    };
  }
}
