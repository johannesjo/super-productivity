// Sync.md Plugin for SuperProductivity
// This plugin syncs markdown files with project tasks

class SyncMdPlugin {
  constructor() {
    this.config = null;
    this.watcherId = null;
    this.lastSyncTime = null;
    this.isWatching = false;
    this.syncInProgress = false;
    this.ignoreNextFileChange = false;
    this.taskIdMap = new Map(); // Maps markdown line to task ID
  }

  async init() {
    console.log('[Sync.md] Plugin initializing...');

    // Register side panel button
    if (PluginAPI?.registerSidePanelButton) {
      PluginAPI.registerSidePanelButton({
        label: 'Sync.md',
        icon: 'sync',
        onClick: () => {
          console.log('[Sync.md] Side panel button clicked');
        },
      });
    }

    // Register message handler for iframe communication
    if (PluginAPI?.onMessage) {
      PluginAPI.onMessage((message) => this.handleMessage(message));
    }

    // Register hook for task changes
    if (PluginAPI?.onHook) {
      PluginAPI.onHook('onTasksUpdated', (tasks) => this.handleTasksUpdated(tasks));
      PluginAPI.onHook('onTaskAdded', (task) => this.handleTaskAdded(task));
      PluginAPI.onHook('onTaskDeleted', (taskId) => this.handleTaskDeleted(taskId));
    }

    // Load saved configuration
    await this.loadConfig();

    // Start watching if configured
    if (this.config?.filePath && this.config?.projectId) {
      await this.startWatching();
    }

    console.log('[Sync.md] Plugin initialized');
  }

  async handleMessage(message) {
    console.log('[Sync.md] Received message:', message);

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

      default:
        console.warn('[Sync.md] Unknown message type:', message.type);
        return null;
    }
  }

  async loadConfig() {
    try {
      const data = await PluginAPI.loadSyncedData('syncMdConfig');
      if (data) {
        this.config = data;
        console.log('[Sync.md] Loaded config:', this.config);
      }
    } catch (error) {
      console.error('[Sync.md] Error loading config:', error);
    }
  }

  async saveConfig(config) {
    try {
      this.config = config;
      await PluginAPI.persistDataSynced('syncMdConfig', config);
      console.log('[Sync.md] Config saved:', config);
      return true;
    } catch (error) {
      console.error('[Sync.md] Error saving config:', error);
      return false;
    }
  }

  async startWatching() {
    if (!this.config?.filePath || !PluginAPI?.nodeExecution) {
      console.warn(
        '[Sync.md] Cannot start watching: missing config or nodeExecution permission',
      );
      return;
    }

    try {
      // Stop existing watcher if any
      if (this.watcherId) {
        await this.stopWatching();
      }

      // Start file watcher using node script
      const watchScript = `
        const fs = require('fs');
        const path = require('path');
        
        const filePath = '${this.config.filePath}';
        
        // Initial read
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          console.log(JSON.stringify({ 
            type: 'initial', 
            content: content,
            exists: true 
          }));
        } catch (error) {
          console.log(JSON.stringify({ 
            type: 'error', 
            error: error.message,
            exists: false 
          }));
        }
        
        // Watch for changes
        const watcher = fs.watch(filePath, (eventType, filename) => {
          if (eventType === 'change') {
            try {
              const content = fs.readFileSync(filePath, 'utf8');
              console.log(JSON.stringify({ 
                type: 'change', 
                content: content 
              }));
            } catch (error) {
              console.log(JSON.stringify({ 
                type: 'error', 
                error: error.message 
              }));
            }
          }
        });
        
        // Keep process alive
        process.stdin.resume();
      `;

      const result = await PluginAPI.nodeExecution({
        script: watchScript,
        persistent: true,
        onOutput: (data) => this.handleWatcherOutput(data),
        onError: (error) => this.handleWatcherError(error),
      });

      this.watcherId = result.id;
      this.isWatching = true;
      console.log('[Sync.md] Started watching file:', this.config.filePath);
    } catch (error) {
      console.error('[Sync.md] Error starting watcher:', error);
      this.isWatching = false;
    }
  }

  async stopWatching() {
    if (this.watcherId && PluginAPI?.nodeExecution) {
      try {
        await PluginAPI.nodeExecution({
          action: 'stop',
          id: this.watcherId,
        });
        console.log('[Sync.md] Stopped watching file');
      } catch (error) {
        console.error('[Sync.md] Error stopping watcher:', error);
      }
    }
    this.watcherId = null;
    this.isWatching = false;
  }

  async handleWatcherOutput(output) {
    try {
      const data = JSON.parse(output);

      if (data.type === 'error') {
        console.error('[Sync.md] File watcher error:', data.error);
        return;
      }

      if (data.type === 'initial' || data.type === 'change') {
        // Check if we should ignore this change (from our own update)
        if (this.ignoreNextFileChange) {
          console.log('[Sync.md] Ignoring file change (self-triggered)');
          this.ignoreNextFileChange = false;
          return;
        }

        console.log('[Sync.md] File content received, syncing...');
        await this.syncFileToProject(data.content);
      }
    } catch (error) {
      console.error('[Sync.md] Error handling watcher output:', error);
    }
  }

  handleWatcherError(error) {
    console.error('[Sync.md] Watcher error:', error);
    this.isWatching = false;
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

    // Sync markdown tasks to project
    for (const mdTask of markdownTasks) {
      if (mdTask.id && projectTaskMap.has(mdTask.id)) {
        // Update existing task
        const projectTask = projectTaskMap.get(mdTask.id);
        if (projectTask.title !== mdTask.title) {
          await PluginAPI.updateTask(mdTask.id, { title: mdTask.title });
          result.updated++;
        }

        // Mark as processed
        projectTaskMap.delete(mdTask.id);
      } else {
        // Create new task
        const newTask = await PluginAPI.addTask({
          title: mdTask.title,
          projectId: this.config.projectId,
        });

        if (newTask && newTask.id) {
          result.updatedTaskIdMap.set(mdTask.lineNumber, newTask.id);
          result.hasNewIds = true;
          result.created++;

          // Handle sub-tasks
          for (const subTask of mdTask.subTasks) {
            const newSubTask = await PluginAPI.addTask({
              title: subTask.title,
              parentId: newTask.id,
            });

            if (newSubTask && newSubTask.id) {
              result.updatedTaskIdMap.set(subTask.lineNumber, newSubTask.id);
              result.created++;
            }
          }
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
    if (!PluginAPI?.nodeExecution) {
      console.warn('[Sync.md] Cannot update file: nodeExecution permission required');
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
        fs.writeFileSync('${this.config.filePath}', content, 'utf8');
        console.log('File updated successfully');
      `;

      await PluginAPI.nodeExecution({
        script: writeScript,
        persistent: false,
      });

      console.log('[Sync.md] File updated with task IDs');
    } catch (error) {
      console.error('[Sync.md] Error updating file:', error);
    }
  }

  async testConnection(filePath) {
    if (!PluginAPI?.nodeExecution) {
      throw new Error('Node execution permission required');
    }

    const testScript = `
      const fs = require('fs');
      const path = require('path');
      
      try {
        const stats = fs.statSync('${filePath}');
        const content = fs.readFileSync('${filePath}', 'utf8');
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

    const result = await PluginAPI.nodeExecution({
      script: testScript,
      persistent: false,
    });

    return JSON.parse(result.output);
  }

  async browseForFile(filters) {
    if (!PluginAPI?.nodeExecution) {
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
      const result = await PluginAPI.nodeExecution({
        script: browseScript,
        persistent: false,
      });

      return JSON.parse(result.output);
    } catch (error) {
      console.error('[Sync.md] Error browsing for file:', error);
      return { filePath: null };
    }
  }

  async readFile(filePath) {
    if (!PluginAPI?.nodeExecution) {
      throw new Error('Node execution permission required');
    }

    const readScript = `
      const fs = require('fs');
      
      try {
        const content = fs.readFileSync('${filePath}', 'utf8');
        console.log(JSON.stringify({
          content: content.substring(0, 1000) // Limit preview size
        }));
      } catch (error) {
        console.log(JSON.stringify({
          error: error.message
        }));
      }
    `;

    const result = await PluginAPI.nodeExecution({
      script: readScript,
      persistent: false,
    });

    return JSON.parse(result.output);
  }

  async handleTasksUpdated(tasks) {
    if (
      this.syncInProgress ||
      !this.config?.projectId ||
      this.config?.syncDirection === 'fileToProject'
    ) {
      return;
    }

    // Check if any of the updated tasks belong to our project
    const projectTasks = tasks.filter((task) => task.projectId === this.config.projectId);
    if (projectTasks.length > 0) {
      console.log('[Sync.md] Project tasks updated, syncing to file...');
      await this.syncProjectToFile();
    }
  }

  async handleTaskAdded(task) {
    if (
      this.syncInProgress ||
      !this.config?.projectId ||
      this.config?.syncDirection === 'fileToProject'
    ) {
      return;
    }

    if (task.projectId === this.config.projectId) {
      console.log('[Sync.md] Task added to project, syncing to file...');
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
    if (!this.config?.filePath || !PluginAPI?.nodeExecution) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Get all tasks from the project
      const allTasks = await PluginAPI.getTasks();
      const projectTasks = allTasks.filter(
        (task) => task.projectId === this.config.projectId,
      );

      // Build markdown structure
      const markdownLines = [];
      const mainTasks = projectTasks.filter((task) => !task.parentId);

      for (const task of mainTasks) {
        markdownLines.push(`* (${task.id}) ${task.title}`);

        // Get sub-tasks
        const subTasks = projectTasks.filter((subTask) => subTask.parentId === task.id);
        for (const subTask of subTasks) {
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

      const markdownContent = markdownLines.join('\n');

      // Set flag to ignore the file change event
      this.ignoreNextFileChange = true;

      // Write to file
      const writeScript = `
        const fs = require('fs');
        const content = ${JSON.stringify(markdownContent)};
        fs.writeFileSync('${this.config.filePath}', content, 'utf8');
        console.log('File synced from project');
      `;

      await PluginAPI.nodeExecution({
        script: writeScript,
        persistent: false,
      });

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
