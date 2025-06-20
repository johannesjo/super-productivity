// Sync.md Plugin for SuperProductivity
// This plugin syncs markdown files with project tasks

class SyncMdPlugin {
  constructor() {
    this.config = null;
    this.watchInterval = null;
    this.lastSyncTime = null;
    this.lastFileContent = null;
    this.lastModifiedTime = null;
    this.isWatching = false;
    this.syncInProgress = false;
    this.ignoreNextFileChange = false;
    this.taskIdMap = new Map(); // Maps markdown line to task ID
  }

  async init() {
    console.log('[Sync.md] Plugin initializing...');

    // Register message handler for iframe communication
    if (PluginAPI?.onMessage) {
      PluginAPI.onMessage((message) => this.handleMessage(message));
    }

    // Register hook for task changes
    if (PluginAPI?.registerHook && PluginAPI?.Hooks) {
      // Use the correct hook names from PluginHooks enum
      PluginAPI.registerHook(PluginAPI.Hooks.TASK_UPDATE, (task) => {
        console.log('[Sync.md] Task update hook triggered:', task);
        this.handleTaskUpdate(task);
      });
      PluginAPI.registerHook(PluginAPI.Hooks.TASK_DELETE, (taskId) => {
        console.log('[Sync.md] Task delete hook triggered:', taskId);
        this.handleTaskDeleted(taskId);
      });
      // Note: There's no direct "task added" hook, it comes through taskUpdate
    }

    // Load saved configuration
    await this.loadConfig();

    // Start watching if configured
    if (this.config?.filePath && this.config?.projectId) {
      await this.startWatching();

      // Do an initial sync from project to file if bidirectional or projectToFile
      if (this.config.syncDirection !== 'fileToProject') {
        console.log('[Sync.md] Performing initial sync from project to file...');
        await this.syncProjectToFile();
      }
    }

    console.log('[Sync.md] Plugin initialized');
  }

  async handleMessage(message) {
    console.log('[Sync.md] Received message:', message);

    try {
      switch (message.type) {
        case 'configUpdated':
          await this.saveConfig(message.config);
          await this.stopWatching();
          if (message.config?.filePath && message.config?.projectId) {
            await this.startWatching();
          }
          return { success: true };

        case 'testConnection':
          return await this.testConnection(message.filePath);

        case 'browseFile':
          return await this.browseForFile(message.filters);

        case 'readFile':
          return await this.readFile(message.filePath);

        case 'getSyncInfo':
          return {
            isWatching: this.isWatching,
            lastSyncTime: this.lastSyncTime,
            taskCount: this.taskIdMap.size,
          };

        case 'syncNow':
          console.log('[Sync.md] Manual sync requested');
          if (this.config?.syncDirection === 'fileToProject') {
            await this.checkFileForChanges();
          } else {
            await this.syncProjectToFile();
          }
          return { success: true };

        default:
          console.warn('[Sync.md] Unknown message type:', message.type);
          return null;
      }
    } catch (error) {
      console.error('[Sync.md] Error handling message:', error);
      throw error;
    }
  }

  async loadConfig() {
    try {
      const data = await PluginAPI.loadSyncedData();
      if (data) {
        // Data is returned as a string, need to parse it
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        // Extract the config from the data
        this.config = parsedData.syncMdConfig || parsedData;
        console.log('[Sync.md] Loaded config:', this.config);
      }
    } catch (error) {
      console.error('[Sync.md] Error loading config:', error);
    }
  }

  async saveConfig(config) {
    try {
      this.config = config;
      // persistDataSynced expects a string
      const dataToSave = JSON.stringify({ syncMdConfig: config });
      await PluginAPI.persistDataSynced(dataToSave);
      console.log('[Sync.md] Config saved:', config);
      return true;
    } catch (error) {
      console.error('[Sync.md] Error saving config:', error);
      return false;
    }
  }

  async startWatching() {
    if (!this.config?.filePath || !PluginAPI?.executeNodeScript) {
      console.warn(
        '[Sync.md] Cannot start watching: missing config or executeNodeScript permission',
      );
      return;
    }

    try {
      // Stop existing watcher if any
      if (this.watchInterval) {
        await this.stopWatching();
      }

      // Initial read
      await this.checkFileForChanges();

      // Start polling interval (check every 2 seconds)
      this.watchInterval = setInterval(() => {
        this.checkFileForChanges();
      }, 2000);

      this.isWatching = true;
      console.log('[Sync.md] Started watching file:', this.config.filePath);
    } catch (error) {
      console.error('[Sync.md] Error starting watcher:', error);
      this.isWatching = false;
    }
  }

  async stopWatching() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
      console.log('[Sync.md] Stopped watching file');
    }
    this.isWatching = false;
  }

  async checkFileForChanges() {
    if (!this.config?.filePath || !PluginAPI?.executeNodeScript) {
      return;
    }

    try {
      const checkScript = `
        const fs = require('fs');
        const filePath = ${JSON.stringify(this.config.filePath)};
        
        try {
          const stats = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, 'utf8');
          console.log(JSON.stringify({
            exists: true,
            content: content,
            modifiedTime: stats.mtime.getTime()
          }));
        } catch (error) {
          console.log(JSON.stringify({
            exists: false,
            error: error.message
          }));
        }
      `;

      const result = await PluginAPI.executeNodeScript({
        script: checkScript,
        timeout: 5000,
      });

      if (result.success && result.result) {
        const output = typeof result.result === 'string' ? result.result : '';
        const data = JSON.parse(output);

        if (data.exists && data.content) {
          // Check if file has changed
          const hasChanged =
            this.lastModifiedTime !== data.modifiedTime ||
            this.lastFileContent !== data.content;

          if (hasChanged) {
            // Check if we should ignore this change (from our own update)
            if (this.ignoreNextFileChange) {
              console.log('[Sync.md] Ignoring file change (self-triggered)');
              this.ignoreNextFileChange = false;
              this.lastModifiedTime = data.modifiedTime;
              this.lastFileContent = data.content;
              return;
            }

            console.log('[Sync.md] File changed, syncing...');
            this.lastModifiedTime = data.modifiedTime;
            this.lastFileContent = data.content;
            await this.syncFileToProject(data.content);
          }
        } else if (!data.exists) {
          console.error('[Sync.md] File no longer exists:', data.error);
        }
      }
    } catch (error) {
      console.error('[Sync.md] Error checking file:', error);
    }
  }

  async syncFileToProject(content) {
    if (
      this.syncInProgress ||
      !this.config?.projectId ||
      this.config?.syncDirection === 'projectToFile'
    ) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Parse markdown content with task IDs
      const { tasks, taskIdMap } = this.parseMarkdownWithIds(content);

      if (!tasks || tasks.length === 0) {
        console.log('[Sync.md] No tasks found in markdown');
        this.syncInProgress = false;
        return;
      }

      // Update our internal task ID map
      this.taskIdMap = taskIdMap;

      // Get existing project tasks
      const projectTasks = await this.getProjectTasks(this.config.projectId);

      // Sync tasks
      const syncResult = await this.syncTasks(tasks, projectTasks, taskIdMap);

      // Update the file with new task IDs if needed
      if (syncResult.hasNewIds) {
        // Set a flag to ignore the next file change event
        this.ignoreNextFileChange = true;
        await this.updateFileWithTaskIds(content, syncResult.updatedTaskIdMap);
        this.taskIdMap = syncResult.updatedTaskIdMap;
      }

      this.lastSyncTime = new Date();
      console.log('[Sync.md] Sync completed:', syncResult);
    } catch (error) {
      console.error('[Sync.md] Error syncing file to project:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  parseMarkdownWithIds(content) {
    const lines = content.split('\n');
    const tasks = [];
    const taskIdMap = new Map();
    let currentMainTask = null;
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      const trimmed = line.trim();

      if (!trimmed) continue;

      // Calculate indent level
      const indentMatch = line.match(/^(\s*)/);
      const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0;

      // Match task with optional ID
      const taskMatch = trimmed.match(/^[-*]\s*(?:\(([^)]+)\))?\s*(.+)$/);

      if (taskMatch) {
        const taskId = taskMatch[1] || null;
        const title = taskMatch[2].trim();

        const taskData = {
          title,
          id: taskId,
          lineNumber,
          indentLevel,
          subTasks: [],
        };

        if (indentLevel === 0) {
          // Main task
          currentMainTask = taskData;
          tasks.push(taskData);
        } else if (currentMainTask && indentLevel === 1) {
          // Sub-task
          currentMainTask.subTasks.push(taskData);
        }

        if (taskId) {
          taskIdMap.set(lineNumber, taskId);
        }
      }
    }

    return { tasks, taskIdMap };
  }

  async getProjectTasks(projectId) {
    try {
      const tasks = await PluginAPI.getTasks();
      return tasks.filter((task) => task.projectId === projectId);
    } catch (error) {
      console.error('[Sync.md] Error getting project tasks:', error);
      return [];
    }
  }

  async syncTasks(markdownTasks, projectTasks, existingTaskIdMap) {
    const result = {
      created: 0,
      updated: 0,
      deleted: 0,
      hasNewIds: false,
      updatedTaskIdMap: new Map(existingTaskIdMap),
    };

    // Create a map of existing tasks by ID
    const projectTaskMap = new Map();
    projectTasks.forEach((task) => {
      projectTaskMap.set(task.id, task);
    });

    // Keep track of task order as they appear in markdown
    const mainTaskIds = [];
    const subtasksByParent = new Map(); // parentId -> [subtaskIds]

    // Sync markdown tasks to project
    for (const mdTask of markdownTasks) {
      let taskId = mdTask.id;

      if (taskId && projectTaskMap.has(taskId)) {
        // Update existing task
        const projectTask = projectTaskMap.get(taskId);
        if (projectTask.title !== mdTask.title) {
          await PluginAPI.updateTask(taskId, { title: mdTask.title });
          result.updated++;
        }

        // Mark as processed
        projectTaskMap.delete(taskId);
      } else {
        // Create new task - addTask returns the task ID as a string
        taskId = await PluginAPI.addTask({
          title: mdTask.title,
          projectId: this.config.projectId,
        });

        if (taskId) {
          result.updatedTaskIdMap.set(mdTask.lineNumber, taskId);
          result.hasNewIds = true;
          result.created++;
        }
      }

      // Add to main task order
      if (taskId) {
        mainTaskIds.push(taskId);

        // Handle sub-tasks
        const subTaskIds = [];
        for (const subTask of mdTask.subTasks) {
          let subTaskId = subTask.id;

          if (subTaskId && projectTaskMap.has(subTaskId)) {
            // Update existing subtask
            const projectSubTask = projectTaskMap.get(subTaskId);
            if (projectSubTask.title !== subTask.title) {
              await PluginAPI.updateTask(subTaskId, { title: subTask.title });
              result.updated++;
            }
            projectTaskMap.delete(subTaskId);
          } else {
            // Create new subtask
            subTaskId = await PluginAPI.addTask({
              title: subTask.title,
              parentId: taskId,
            });

            if (subTaskId) {
              result.updatedTaskIdMap.set(subTask.lineNumber, subTaskId);
              result.created++;
            }
          }

          if (subTaskId) {
            subTaskIds.push(subTaskId);
          }
        }

        // Store subtask order for this parent
        if (subTaskIds.length > 0) {
          subtasksByParent.set(taskId, subTaskIds);
        }
      }
    }

    // Update task order in the project
    if (mainTaskIds.length > 0 && PluginAPI.reorderTasks) {
      try {
        await PluginAPI.reorderTasks(mainTaskIds, this.config.projectId, 'project');
        console.log('[Sync.md] Updated project task order:', mainTaskIds);
      } catch (error) {
        console.error('[Sync.md] Failed to update task order:', error);
      }
    }

    // Update subtask order for each parent task
    for (const [parentId, subTaskIds] of subtasksByParent) {
      if (subTaskIds.length > 0 && PluginAPI.reorderTasks) {
        try {
          await PluginAPI.reorderTasks(subTaskIds, parentId, 'task');
          console.log(
            '[Sync.md] Updated subtask order for parent:',
            parentId,
            subTaskIds,
          );
        } catch (error) {
          console.error('[Sync.md] Failed to update subtask order:', error);
        }
      }
    }

    // Handle deletions (tasks in project but not in markdown)
    // Note: deleteTask API is not available, so we'll skip deletions for now
    // if (this.config.syncDirection !== 'fileToProject') {
    //   for (const [taskId, task] of projectTaskMap) {
    //     // Only delete tasks that were previously synced (have line numbers in our map)
    //     const wasInMarkdown = Array.from(existingTaskIdMap.values()).includes(taskId);
    //     if (wasInMarkdown) {
    //       // await window.PluginApi.deleteTask(taskId); // Not available
    //       result.deleted++;
    //     }
    //   }
    // }

    return result;
  }

  async updateFileWithTaskIds(originalContent, updatedTaskIdMap) {
    if (!PluginAPI?.executeNodeScript) {
      console.warn('[Sync.md] Cannot update file: executeNodeScript permission required');
      return;
    }

    try {
      const lines = originalContent.split('\n');
      const updatedLines = [];
      let lineNumber = 0;

      for (const line of lines) {
        lineNumber++;

        if (updatedTaskIdMap.has(lineNumber)) {
          const taskId = updatedTaskIdMap.get(lineNumber);
          // Update line with task ID
          const updatedLine = line.replace(
            /^(\s*[-*]\s*)(?:\([^)]+\)\s*)?(.+)$/,
            `$1(${taskId}) $2`,
          );
          updatedLines.push(updatedLine);
        } else {
          updatedLines.push(line);
        }
      }

      const updatedContent = updatedLines.join('\n');

      // Write updated content back to file
      const writeScript = `
        const fs = require('fs');
        const content = ${JSON.stringify(updatedContent)};
        const filePath = ${JSON.stringify(this.config.filePath)};
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('File updated successfully');
      `;

      const result = await PluginAPI.executeNodeScript({
        script: writeScript,
        timeout: 5000,
      });

      if (!result.success) {
        throw new Error(result.error || 'Write operation failed');
      }

      console.log('[Sync.md] File updated with task IDs');
    } catch (error) {
      console.error('[Sync.md] Error updating file:', error);
    }
  }

  async testConnection(filePath) {
    if (!PluginAPI?.executeNodeScript) {
      throw new Error('Node execution permission required');
    }

    const testScript = `
      const fs = require('fs');
      const path = require('path');
      const filePath = ${JSON.stringify(filePath)};

      try {
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(JSON.stringify({
          exists: true,
          isFile: stats.isFile(),
          size: stats.size,
          content: content.substring(0, 500)
        }));
      } catch (error) {
        console.log(JSON.stringify({
          exists: false,
          error: error.message
        }));
      }
    `;

    const result = await PluginAPI.executeNodeScript({
      script: testScript,
      timeout: 5000,
    });

    if (result.success && result.result) {
      const output = typeof result.result === 'string' ? result.result : '';
      return JSON.parse(output);
    } else {
      throw new Error(result.error || 'Test connection failed');
    }
  }

  async browseForFile(filters) {
    if (!PluginAPI?.executeNodeScript) {
      throw new Error('Node execution permission required');
    }

    // Use electron dialog if available
    const browseScript = `
      const { dialog } = require('electron');

      const result = dialog.showOpenDialogSync({
        properties: ['openFile'],
        filters: ${JSON.stringify(filters || [])}
      });

      console.log(JSON.stringify({
        filePath: result ? result[0] : null
      }));
    `;

    try {
      const result = await PluginAPI.executeNodeScript({
        script: browseScript,
        timeout: 5000,
      });

      if (result.success && result.result) {
        const output = typeof result.result === 'string' ? result.result : '';
        return JSON.parse(output);
      } else {
        throw new Error(result.error || 'Browse operation failed');
      }
    } catch (error) {
      console.error('[Sync.md] Error browsing for file:', error);
      return { filePath: null };
    }
  }

  async readFile(filePath) {
    if (!PluginAPI?.executeNodeScript) {
      throw new Error('Node execution permission required');
    }

    const readScript = `
      const fs = require('fs');
      const filePath = ${JSON.stringify(filePath)};

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(JSON.stringify({
          content: content.substring(0, 1000) // Limit preview size
        }));
      } catch (error) {
        console.log(JSON.stringify({
          error: error.message
        }));
      }
    `;

    const result = await PluginAPI.executeNodeScript({
      script: readScript,
      timeout: 5000,
    });

    if (result.success && result.result) {
      const output = typeof result.result === 'string' ? result.result : '';
      return JSON.parse(output);
    } else {
      throw new Error(result.error || 'Read operation failed');
    }
  }

  async handleTaskUpdate(task) {
    if (
      this.syncInProgress ||
      !this.config?.projectId ||
      this.config?.syncDirection === 'fileToProject'
    ) {
      return;
    }

    // Check if the updated task belongs to our project
    if (task && task.projectId === this.config.projectId) {
      console.log('[Sync.md] Project task updated, syncing to file...');
      await this.syncProjectToFile();
    }
  }

  async handleTaskDeleted(taskId) {
    if (
      this.syncInProgress ||
      !this.config?.projectId ||
      this.config?.syncDirection === 'fileToProject'
    ) {
      return;
    }

    // Check if this task was in our map
    for (const [lineNumber, id] of this.taskIdMap.entries()) {
      if (id === taskId) {
        console.log('[Sync.md] Task deleted from project, syncing to file...');
        await this.syncProjectToFile();
        break;
      }
    }
  }

  async syncProjectToFile() {
    if (!this.config?.filePath || !PluginAPI?.executeNodeScript) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Get all tasks from the project
      const allTasks = await PluginAPI.getTasks();
      const projectTasks = allTasks.filter(
        (task) => task.projectId === this.config.projectId,
      );

      // Build markdown structure preserving existing order
      const markdownLines = [];

      // If we have a previous file content, try to preserve the order
      let taskOrder = [];
      if (this.lastFileContent) {
        const { tasks: previousTasks } = this.parseMarkdownWithIds(this.lastFileContent);
        taskOrder = previousTasks.map((t) => t.id).filter((id) => id);
      }

      // Create a map for quick lookup
      const taskMap = new Map();
      projectTasks.forEach((task) => {
        taskMap.set(task.id, task);
      });

      // Process tasks in the order they were in the file
      const processedTaskIds = new Set();
      const mainTasks = [];

      // First, add tasks in their previous order
      for (const taskId of taskOrder) {
        const task = taskMap.get(taskId);
        if (task && !task.parentId) {
          mainTasks.push(task);
          processedTaskIds.add(taskId);
        }
      }

      // Then add any new tasks that weren't in the file before
      for (const task of projectTasks) {
        if (!task.parentId && !processedTaskIds.has(task.id)) {
          mainTasks.push(task);
        }
      }

      // Process main tasks and their subtasks
      for (const task of mainTasks) {
        markdownLines.push(`* (${task.id}) ${task.title}`);

        // Get all subtasks for this parent
        const subTasks = projectTasks.filter((t) => t.parentId === task.id);

        // Try to preserve subtask order from previous file content
        let subTaskOrder = [];
        if (this.lastFileContent) {
          const { tasks: previousTasks } = this.parseMarkdownWithIds(
            this.lastFileContent,
          );
          const previousMainTask = previousTasks.find((t) => t.id === task.id);
          if (previousMainTask && previousMainTask.subTasks) {
            subTaskOrder = previousMainTask.subTasks
              .map((st) => st.id)
              .filter((id) => id);
          }
        }

        // Process subtasks in order
        const processedSubTaskIds = new Set();

        // First, add subtasks in their previous order
        for (const subTaskId of subTaskOrder) {
          const subTask = subTasks.find((st) => st.id === subTaskId);
          if (subTask) {
            markdownLines.push(`    * (${subTask.id}) ${subTask.title}`);
            processedSubTaskIds.add(subTask.id);

            // Add notes as nested items if present
            if (subTask.notes) {
              const noteLines = subTask.notes.split('\n');
              noteLines.forEach((line) => {
                if (line.trim()) {
                  markdownLines.push(`        ${line}`);
                }
              });
            }
          }
        }

        // Then add any new subtasks
        for (const subTask of subTasks) {
          if (!processedSubTaskIds.has(subTask.id)) {
            markdownLines.push(`    * (${subTask.id}) ${subTask.title}`);

            // Add notes as nested items if present
            if (subTask.notes) {
              const noteLines = subTask.notes.split('\n');
              noteLines.forEach((line) => {
                if (line.trim()) {
                  markdownLines.push(`        ${line}`);
                }
              });
            }
          }
        }
      }

      const markdownContent = markdownLines.join('\n');

      // Set flag to ignore the file change event
      this.ignoreNextFileChange = true;

      // Write to file
      const writeScript = `
        const fs = require('fs');
        const content = ${JSON.stringify(markdownContent)};
        const filePath = ${JSON.stringify(this.config.filePath)};
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('File synced from project');
      `;

      const result = await PluginAPI.executeNodeScript({
        script: writeScript,
        timeout: 5000,
      });

      if (!result.success) {
        throw new Error(result.error || 'Write operation failed');
      }

      // Update our last file content to preserve order for next sync
      this.lastFileContent = markdownContent;
      this.lastSyncTime = new Date();
      console.log('[Sync.md] Project synced to file');
    } catch (error) {
      console.error('[Sync.md] Error syncing project to file:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  destroy() {
    console.log('[Sync.md] Plugin destroying...');
    this.stopWatching();
  }
}

// Initialize plugin
const syncMdPlugin = new SyncMdPlugin();
syncMdPlugin.init();

// Register plugin for cleanup
if (PluginAPI?.onDestroy) {
  PluginAPI.onDestroy(() => syncMdPlugin.destroy());
}
